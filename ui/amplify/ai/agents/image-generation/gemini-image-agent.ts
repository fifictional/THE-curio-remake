import { BaseAgent } from "../base-agent";
import { BaseAgentInput, AgentContext, AgentOutput } from "../types";
import { INTENT } from "../../intents";
import { uploadGeneratedImageToS3 } from "../../../utils/image-s3-utils";
import { UnifiedImageOutput } from "@ai-providers/unified-types";

/**
 * Input for Gemini Image Agent
 */
export interface GeminiImageAgentInput extends BaseAgentInput {
  /**
   * Text prompt describing the image to generate
   */
  text: string;
  /**
   * Optional reference image (base64) for editing/composition
   */
  image?: string;
  /**
   * Optional aspect ratio
   */
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
  /**
   * Variant to use: 'flash' (Gemini 2.5 Flash Image) or 'pro' (Gemini 3 Pro Image)
   * Default: 'flash'
   */
  variant?: 'flash' | 'pro';
  /**
   * Optional resolution (1K, 2K, or 4K)
   * Only used when variant is 'pro'
   * Default: '1K'
   */
  resolution?: '1K' | '2K' | '4K';
}

/**
 * Agent that generates images using Gemini image generation models
 * Supports both Flash (Nano Banana) and Pro (Nano Banana Pro) variants
 */
export class GeminiImageAgent extends BaseAgent<GeminiImageAgentInput> {
  name = 'gemini-image';
  description = 'Generates images using Gemini image generation models (Flash or Pro)';

  async execute(input: GeminiImageAgentInput, context: AgentContext): Promise<AgentOutput> {
    try {
      const { text, aspectRatio, variant = 'flash', resolution } = input;

      // Determine feature name based on variant
      const feature = variant === 'pro' ? 'image-generation-pro' : 'image-generation-flash';

      // Build image generation options
      const imageGenerationOptions: {
        aspectRatio: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
        resolution?: '1K' | '2K' | '4K';
      } = {
        aspectRatio: aspectRatio || '1:1',
      };

      // Only include resolution for pro variant
      if (variant === 'pro') {
        imageGenerationOptions.resolution = resolution || '1K';
      }

      // Call AI client with generate_image intent
      // BaseAgent will automatically extract image from input and add to userContent
      const result = await this.callAI(input, context, {
        intent: INTENT.GENERATE_IMAGE,
        category: 'generation',
        feature,
        prompt: text,
        imageGenerationOptions,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // Extract image from output
      const imageOutput = result.output?.find(
        (item): item is UnifiedImageOutput => item.type === 'image_output'
      );

      if (!imageOutput?.imageBase64) {
        throw new Error('No image data in response');
      }

      // Convert base64 to Buffer
      const imageBuffer = Buffer.from(imageOutput.imageBase64, 'base64');

      // Upload to S3
      const s3Url = await uploadGeneratedImageToS3(imageBuffer, 'image/png');

      return {
        response: `Image generated successfully`,
        metadata: {
          imageUrl: s3Url,
        },
        isFinal: true,
      };
    } catch (error: any) {
      console.error(`[GeminiImageAgent] Error generating image (${input.variant || 'flash'}):`, error);
      return {
        response: `Failed to generate image: ${error.message}`,
        isFinal: true,
      };
    }
  }
}

