import { BaseAgent, AgentContext, AgentOutput } from "../index";
import { ChatAgentInput, UserInfo, GenerationLimits } from "./types";
import { UpdateMessageCommand, UpdateStatusCommand, CreateUserActionLogCommand } from "../commands";
import { GeminiImageAgent } from "../image-generation/gemini-image-agent";
import { v4 as uuidv4 } from "uuid";

/**
 * Agent that generates images using Gemini image generation models
 * Handles rate limiting based on user tier and routes to appropriate agent (flash or pro)
 */
export class ImageGenerationAgent extends BaseAgent<ChatAgentInput> {
  name = 'image-generation-agent';
  description = 'Generates images using Gemini image generation models with tier-based rate limiting';

  async execute(input: ChatAgentInput, context: AgentContext): Promise<AgentOutput> {
    const userInfo = input.userInfo as UserInfo | undefined;
    const generationLimits = input.generationLimits as GenerationLimits | undefined;
    const history = (input.history as Array<{ role: "user" | "assistant"; content: string }>) || [];

    if (!userInfo || !generationLimits) {
      console.error('[ImageGenerationAgent] Missing userInfo or generationLimits');
      return this.createResponse('Error: User info or generation limits not provided');
    }

    // Extract image prompt from user message
    // For now, use the message directly. Could be enhanced to extract from conversation context
    const imagePrompt = input.message;

    // Update status - initial check message
    if (input.messageUuid) {
      this.yieldCommand(context, {
        type: 'updateStatus',
        payload: {
          messageUuid: input.messageUuid,
          status: 'generating',
          message: 'Generating your image...',
        },
      } as UpdateStatusCommand);
    }

    // Determine which agent to use and check limits based on user tier
    const userTier = userInfo.userTier;
    const subscriptionTier = userInfo.subscriptionTier;
    
    let useProAgent = false;
    let agentType: 'flash' | 'pro' = 'flash';
    let canGenerate = false;
    let limitMessage = '';

    // Rate limiting logic:
    // Free users: only flash, max 2/day
    // Super users: 2 pro/day, 20 flash/day
    // Ultra users: 10 pro/day, 50 flash/day

    if (userTier === 'free') {
      // Free users can only use flash agent, max 2/day
      if (generationLimits.flashImageGenerationRequests >= 2) {
        limitMessage = `🎓 You've reached your daily limit for generating images (2 images/day).\n\nUpgrade to **Super Curio** for more image generations and higher quality images!\n\n✨ [Upgrade now at app.curio.to/exam-bundles](https://app.curio.to/exam-bundles?utm_source=chat&utm_medium=chat&utm_campaign=image_limit_reached)`;
        canGenerate = false;
      } else {
        canGenerate = true;
        agentType = 'flash';
      }
    } else if (subscriptionTier === 'super') {
      // Super users: prefer pro if available, otherwise flash
      if (generationLimits.proImageGenerationRequests >= 2) {
        // Pro limit reached, check flash
        if (generationLimits.flashImageGenerationRequests >= 20) {
          limitMessage = `🎓 You've reached your daily limit for generating images (2 pro images + 20 flash images/day).\n\nUpgrade to **Ultra Curio** for even more image generations!\n\n✨ [Upgrade now at app.curio.to/exam-bundles](https://app.curio.to/exam-bundles?utm_source=chat&utm_medium=chat&utm_campaign=image_limit_reached)`;
          canGenerate = false;
        } else {
          canGenerate = true;
          agentType = 'flash';
        }
      } else {
        canGenerate = true;
        agentType = 'pro';
        useProAgent = true;
      }
    } else if (subscriptionTier === 'ultra') {
      // Ultra users: prefer pro if available, otherwise flash
      if (generationLimits.proImageGenerationRequests >= 10) {
        // Pro limit reached, check flash
        if (generationLimits.flashImageGenerationRequests >= 50) {
          limitMessage = `🎓 You've reached your daily limit for generating images (10 pro images + 50 flash images/day).`;
          canGenerate = false;
        } else {
          canGenerate = true;
          agentType = 'flash';
        }
      } else {
        canGenerate = true;
        agentType = 'pro';
        useProAgent = true;
      }
    } else {
      // Premium but no subscription tier (shouldn't happen, but fallback)
      // Treat as super tier
      if (generationLimits.proImageGenerationRequests >= 2) {
        if (generationLimits.flashImageGenerationRequests >= 20) {
          limitMessage = `🎓 You've reached your daily limit for generating images.`;
          canGenerate = false;
        } else {
          canGenerate = true;
          agentType = 'flash';
        }
      } else {
        canGenerate = true;
        agentType = 'pro';
        useProAgent = true;
      }
    }

    // If limit reached, return limit message
    if (!canGenerate) {
      return this.createResponse(limitMessage);
    }

    try {
      // Update status
      if (input.messageUuid) {
        this.yieldCommand(context, {
          type: 'updateStatus',
          payload: {
            messageUuid: input.messageUuid,
            status: 'generating',
            message: `Generating ${agentType === 'pro' ? 'high-quality' : ''} image...`,
          },
        } as UpdateStatusCommand);
      }

      // Call unified agent with appropriate variant
      const imageAgent = new GeminiImageAgent();
      const result = await imageAgent.execute({
        userUuid: input.userUuid,
        userTier: input.userTier,
        text: imagePrompt,
        image: input.image,
        aspectRatio: '1:1', // Default aspect ratio, could be extracted from user message
        variant: useProAgent ? 'pro' : 'flash',
        resolution: useProAgent ? '1K' : undefined, // Default resolution for pro
      }, context);

      // Check if generation was successful
      if (!result.metadata?.imageUrl) {
        const errorMessage = result.response || 'Failed to generate image';
        console.error('[ImageGenerationAgent] Image generation failed:', errorMessage);
        
        if (input.messageUuid) {
          this.yieldCommand(context, {
            type: 'updateMessage',
            payload: {
              messageUuid: input.messageUuid,
              content: `Failed to generate image: ${errorMessage}`,
              isCompleted: true,
            },
          } as UpdateMessageCommand);
        }
        
        return this.createResponse(`Failed to generate image: ${errorMessage}`);
      }

      const imageUrl = result.metadata.imageUrl as string;

      // Yield user action log with correct action type
      const now = new Date().toISOString();
      this.yieldCommand(context, {
        type: 'createUserActionLog',
        payload: {
          userActionLogUuid: uuidv4(),
          userUuid: input.userUuid,
          actionType: agentType === 'pro' ? 'generated_image_pro' : 'generated_image_flash',
          sourceType: 'chat',
          sourceUuid: input.chatUuid,
          createdAt: now,
        },
      } as CreateUserActionLogCommand);

      // Yield message update with tool metadata
      if (input.messageUuid) {
        this.yieldCommand(context, {
          type: 'updateMessage',
          payload: {
            messageUuid: input.messageUuid,
            type: 'tool',
            isCompleted: true,
            toolName: 'generate_image',
            toolArguments: JSON.stringify({
              imageUrl,
              prompt: imagePrompt,
              agentType,
            }),
            toolExtras: {
              isLoading: false,
              success: true,
              userAction: false,
            },
          },
        } as UpdateMessageCommand);
      }

      return this.createResponse('Image generated successfully', {
        imageUrl,
        agentType,
      });
    } catch (error: any) {
      console.error('[ImageGenerationAgent] Error generating image:', error);
      
      if (input.messageUuid) {
        this.yieldCommand(context, {
          type: 'updateMessage',
          payload: {
            messageUuid: input.messageUuid,
            content: `Failed to generate image: ${error.message}`,
            isCompleted: true,
          },
        } as UpdateMessageCommand);
      }
      
      return this.createResponse(`Failed to generate image: ${error.message}`);
    }
  }
}

