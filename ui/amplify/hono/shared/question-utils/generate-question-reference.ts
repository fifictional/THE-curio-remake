import type { Schema } from "@database-schema";
import { generateClient } from 'aws-amplify/data';
import { createAIClient } from '@ai-client';
import { INTENT } from '@ai-intents/types';
import { UserContentItem } from '@ai-providers/types';
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from 'crypto';
import { REFERENCE_GENERATION_PROMPT } from '../../../functions/generate-questions/reference-generation-prompt';
import { generateReferenceTool } from '@ai-tools/generate-reference-tool';
import { UnifiedFunctionCall, UnifiedCodeInterpreterCall } from "@ai-providers/unified-types";
import OpenAI from "openai";
import { getUserTier } from '../../../utils/lambda-utils';

interface GenerateReferenceParams {
  client: ReturnType<typeof generateClient<Schema>>;
  question: {
    extractedQuestionUuid: string;
    referenceGenerationPrompt?: string | null;
    questionReference?: {
      text?: string | null;
      s3Key?: string | null;
    } | null;
  };
  userUuid: string;
  cloudwatchClient: CloudWatchClient;
  s3Client: S3Client;
  bucketName: string;
  logProgress?: (message: string, currentLogs?: string) => Promise<string> | string;
}

interface GenerateReferenceResult {
  success: boolean;
  s3Key?: string;
  error?: string;
}

/**
 * Generates a reference for a generated question using code_interpreter.
 * This function handles the entire flow from API call to S3 upload.
 */
export async function generateQuestionReference({
  client,
  question,
  userUuid,
  cloudwatchClient,
  s3Client,
  bucketName,
  logProgress,
}: GenerateReferenceParams): Promise<GenerateReferenceResult> {
  try {
    // Skip if this question already has a reference generated
    if (question.questionReference?.text || question.questionReference?.s3Key) {
      if (logProgress) {
        const result = logProgress(`⏭️ Skipping - reference already exists`);
        if (result instanceof Promise) {
          await result;
        }
      }
      return { success: true };
    }

    if (logProgress) {
      const result = logProgress(`🎨 Generating reference...`);
      if (result instanceof Promise) {
        await result;
      }
    }

    // Call AI model to generate the reference using shared prompt
    // Include generateReferenceTool to let the model determine type, and code_interpreter for visual types
    const aiClient = createAIClient({
      userUuid,
      saveTokenData: async (tokenData) => { await client.models.UserRequest.create(tokenData) },
      cloudwatchClient,
    });

    // Get user's actual tier
    const userTier = await getUserTier(client, userUuid);

    const userContent: UserContentItem[] = [
      {
        mimeType: 'text/plain',
        content: question.referenceGenerationPrompt || 'Generate the required reference.',
      },
    ];

    const referenceResponse = await aiClient.call({
      intent: INTENT.GENERATE_REFERENCES,
      userTier,
      prompt: REFERENCE_GENERATION_PROMPT,
      userContent,
      tools: [
        generateReferenceTool,
        {
          type: 'code_interpreter' as const,
        },
      ],
      temperature: 0.1,
      category: 'generation',
      feature: 'generation_generate_references',
      messages: [],
    });

    if (referenceResponse.error) {
      throw new Error(`Reference generation failed: ${referenceResponse.error}`);
    }

    // Extract reference from response
    const refOutput = referenceResponse.output || [];
    
    // Check for function call (generateReference tool) - this indicates text reference
    const toolCall = refOutput.find((item) => item.type === 'function_call') as UnifiedFunctionCall | undefined;
    
    if (toolCall && toolCall.name === 'generateReference') {
      // Parse the tool arguments
      const toolArgs = JSON.parse(toolCall.arguments) as {
        referenceType: string;
        content?: string;
      };
      
      const refType = toolArgs.referenceType;
      
      // Handle text references (passage, table) - no code_interpreter needed
      if (refType === 'passage' || refType === 'table') {
        if (!toolArgs.content) {
          throw new Error(`No content provided for ${refType} reference`);
        }
        
        if (logProgress) {
          const result = logProgress(`📝 Storing text reference...`);
          if (result instanceof Promise) {
            await result;
          }
        }
        
        // Store text reference directly - no S3 upload needed
        // Ensure refType is valid for schema ('passage' or 'table')
        const validRefType = (refType === 'passage' || refType === 'table') 
          ? refType as 'passage' | 'table'
          : 'passage'; // fallback to 'passage' if somehow invalid
        
        await client.models.ExtractedQuestion.update({
          extractedQuestionUuid: question.extractedQuestionUuid,
          questionReference: {
            referenceType: validRefType,
            page: 0,
            boundingBox: [],
            text: toolArgs.content,
          },
          referenceExtractionStatus: 'EXTRACTED',
        });
        
        if (logProgress) {
          const result = logProgress(`✅ Generated text reference successfully`);
          if (result instanceof Promise) {
            await result;
          }
        }
        return { success: true };
      }
      
      // If tool call is for visual reference, this is wrong - the model should NOT call the tool
      // But we'll continue to look for the image file anyway
      console.warn('[WARNING] Model called generateReference tool for visual reference. This should not happen - continuing to look for code_interpreter result.');
    }
    
    // For visual references, the model should have executed code_interpreter
    // First, try to find file citation in message annotations
    let fileId: string | undefined;
    let containerId: string | undefined;
    
    // Search through all output items for file citations in annotations
    for (const item of refOutput) {
      if (item.type === 'message') {
        const message = item as any;
        if (message.content && Array.isArray(message.content)) {
          // Check each content item for annotations
          for (const contentItem of message.content) {
            if (contentItem.type === 'output_text' && contentItem.annotations) {
              // Check annotations for file citations
              for (const annotation of contentItem.annotations) {
                if (annotation.type === 'container_file_citation') {
                  // Try to match filename, but also accept any container_file_citation
                  const filename = annotation.filename || '';
                  if (filename === 'reference.png' || filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
                    fileId = annotation.file_id;
                    containerId = annotation.container_id;
                    console.log('[DEBUG] Found image file_id:', fileId, 'container_id:', containerId, 'filename:', filename);
                    break;
                  }
                }
              }
            }
            if (fileId && containerId) break;
          }
        }
      }
      if (fileId && containerId) break;
    }
    
    // If no file citation in annotations, try to extract from code_interpreter_call
    if (!fileId || !containerId) {
      console.log('[DEBUG] No file citation in annotations, checking code_interpreter_call...');
      
      // Find the code_interpreter_call item
      const codeInterpreterCall = refOutput.find((item) => item.type === 'code_interpreter_call') as UnifiedCodeInterpreterCall | undefined;
      
      if (codeInterpreterCall && codeInterpreterCall.container_id) {
        containerId = codeInterpreterCall.container_id;
        console.log('[DEBUG] Found container_id from code_interpreter_call:', containerId);
        
        // Check if code_interpreter_call has outputs with file references
        if (codeInterpreterCall.outputs && Array.isArray(codeInterpreterCall.outputs)) {
          console.log('[DEBUG] code_interpreter_call has outputs:', JSON.stringify(codeInterpreterCall.outputs, null, 2));
          
          // Look for file references in outputs
          // Files can appear in different formats - check for file objects, image objects, or file paths
          for (const output of codeInterpreterCall.outputs) {
            // Check for file/image objects
            if (output.type === 'file' || output.type === 'image') {
              fileId = output.file_id || output.id;
              console.log('[DEBUG] Found file_id in code_interpreter_call outputs:', fileId, 'type:', output.type);
              break;
            }
            // Check if output is a file reference object
            if (output.file_id) {
              fileId = output.file_id;
              console.log('[DEBUG] Found file_id in output object:', fileId);
              break;
            }
            // Check if output contains file information
            if (typeof output === 'object' && (output as any).file_id) {
              fileId = (output as any).file_id;
              console.log('[DEBUG] Found file_id in nested output:', fileId);
              break;
            }
          }
        } else if (codeInterpreterCall.outputs === null) {
          console.log('[DEBUG] code_interpreter_call outputs is null - file may not have been displayed/referenced in Python code');
        }
        
        // If still no fileId, the file might be accessible via the container directly
        // Since code_interpreter generated reference.png, it should be in the container
        // We'll log what we have and proceed - we may need fileId from a different source
        if (!fileId && containerId) {
          console.log('[DEBUG] Have container_id but no file_id. Code_interpreter generated the file, but file_id not found in response.');
          console.log('[DEBUG] Container ID:', containerId);
          console.log('[DEBUG] This may require manual file retrieval or checking container contents differently.');
        }
      }
    }
    
    // If we still don't have a file citation, provide better error message
    if (!fileId || !containerId) {
      console.error('[ERROR] No file citation found in response');
      console.error('[ERROR] Response output items:', JSON.stringify(refOutput, null, 2));
      
      // Check if there's a code_interpreter_call
      const codeInterpreterCall = refOutput.find((item) => item.type === 'code_interpreter_call');
      if (!codeInterpreterCall) {
        throw new Error('No code_interpreter_call found in response. The model may not have executed code_interpreter to generate the image.');
      }
      
      // Check if code_interpreter_call has container_id
      const call = codeInterpreterCall;
      if (!call.container_id) {
        throw new Error('code_interpreter_call found but no container_id. Cannot retrieve generated image.');
      }
      
      // We have container_id but no file_id - this is a limitation of the current API response
      // The file exists in the container but we need the file_id to retrieve it
      throw new Error(`Code interpreter executed successfully (container_id: ${call.container_id}), but file_id was not found in the response. The image file (reference.png) should exist in the container, but we cannot retrieve it without the file_id. This may require checking the API response structure or using an alternative method to access container files.`);
    }
    
    // Code interpreter generated an image
    if (logProgress) {
      const result = logProgress(`📥 Downloading generated image from container...`);
      if (result instanceof Promise) {
        await result;
      }
    }
    
    // Download the file from container using the Containers Files API
    // Initialize client if not already done (may have been initialized for listing files)
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
    
    const fileResponse = await openai.containers.files.content.retrieve(fileId, {
      container_id: containerId,
    });
    const imageBuffer = Buffer.from(await fileResponse.arrayBuffer());
    
    // Upload to S3
    const s3Key = `generated-references/${randomUUID()}.png`;
    
    if (logProgress) {
      const result = logProgress(`☁️ Uploading to S3...`);
      if (result instanceof Promise) {
        await result;
      }
    }
    
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: imageBuffer,
      ContentType: 'image/png',
    }));
    
    // Determine reference type for visual references
    // Try to get it from tool call, otherwise default to 'image'
    // Note: 'diagram' maps to 'image' since schema doesn't support 'diagram'
    let visualRefType: 'image' | 'graph' | 'chart' = 'image';
    if (toolCall && toolCall.name === 'generateReference') {
      const toolArgs = JSON.parse(toolCall.arguments) as { referenceType: string };
      const refType = toolArgs.referenceType;
      if (refType === 'diagram') {
        // Map 'diagram' to 'image' since schema doesn't support 'diagram'
        visualRefType = 'image';
      } else if (['graph', 'chart', 'image'].includes(refType)) {
        visualRefType = refType as 'image' | 'graph' | 'chart';
      }
    }
    
    // Update the question with the reference
    await client.models.ExtractedQuestion.update({
      extractedQuestionUuid: question.extractedQuestionUuid,
      questionReference: {
        referenceType: visualRefType,
        page: 0,
        boundingBox: [],
        s3Key: s3Key,
      },
      referenceExtractionStatus: 'EXTRACTED',
    });

    if (logProgress) {
      const result = logProgress(`✅ Generated reference successfully`);
      if (result instanceof Promise) {
        await result;
      }
    }
    return { success: true, s3Key };
  } catch (error: any) {
    console.error('[ERROR] Reference generation failed:', error);
    
    // Update question status to FAILED
    try {
      await client.models.ExtractedQuestion.update({
        extractedQuestionUuid: question.extractedQuestionUuid,
        referenceExtractionStatus: 'FAILED',
        referenceExtractionError: error.message,
      });
    } catch (updateError) {
      console.error('[ERROR] Failed to update question status:', updateError);
    }
    
    if (logProgress) {
      const result = logProgress(`❌ Failed to generate reference: ${error.message}`);
      if (result instanceof Promise) {
        await result;
      }
    }
    return { success: false, error: error.message };
  }
}

