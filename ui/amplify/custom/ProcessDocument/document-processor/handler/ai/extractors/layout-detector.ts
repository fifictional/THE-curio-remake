import { TextractClient, AnalyzeDocumentCommand, StartDocumentAnalysisCommand, GetDocumentAnalysisCommand } from '@aws-sdk/client-textract';
import { saveVisionOutputs, VisionOutputItem} from '../../database/documents/update-document-layout';


const textractClient = new TextractClient({ region: process.env.AWS_REGION });

export interface LayoutDetectorInput {
  inputKey: string;
  S3Bucket?: string;
  documentUuid: string;
}

export interface LayoutDetectorResponse {
  message: string;
  documentUuid: string;
  totalBlocks: number;
  layoutItems: VisionOutputItem[];
}
  
async function startDocumentAnalysis(bucket: string, documentKey: string) {
  const command = new StartDocumentAnalysisCommand({
    DocumentLocation: { S3Object: { Bucket: bucket, Name: documentKey } },
    FeatureTypes: ['LAYOUT'],
  });
  const response = await textractClient.send(command);
  return response.JobId!;
}

async function waitForJobToComplete(jobId: string) {
  while (true) {
    const { JobStatus } = await textractClient.send(new GetDocumentAnalysisCommand({ JobId: jobId }));
    console.log('Textract job status:', JobStatus);
    if (JobStatus === 'SUCCEEDED') return true;
    if (JobStatus === 'FAILED') throw new Error('Textract job failed');
    await new Promise(res => setTimeout(res, 5000)); // wait 5 sec
  }
}

async function getAllBlocksAndProcess(jobId: string, documentUuid: string) {
    let nextToken: string | undefined = undefined;
    const layoutItems: VisionOutputItem[] = [];
    
    // Counters for each block type
    const blockTypeCounts: { [key: string]: number } = {};
    let totalPages = 1; // Initialize

    // Step 1: Fetch and collect filtered layout items
    do {
      const response: any = await textractClient.send(new GetDocumentAnalysisCommand({ JobId: jobId, NextToken: nextToken }));
      const blocks = response.Blocks || [];

      // Calculate total pages
      totalPages = Math.max(totalPages, ...blocks.map((b: any) => b.Page || 1));

      // Build a mapping from ID to block data
      const idToBlock: { [key: string]: any } = {};
      for (const block of blocks) {
        if (block.Id && block.BlockType === 'LINE') {
          idToBlock[block.Id] = block;
        }
      }

      for (const block of blocks) {
        if ((block.BlockType || '').includes('LAYOUT')) {
          const bbox = block.Geometry?.BoundingBox || {};
          const left = Number(bbox.Left) || 0;
          const top = Number(bbox.Top) || 0;
          const width = Number(bbox.Width) || 0;
          const height = Number(bbox.Height) || 0;

          if (block.Relationships) {
            for (const rel of block.Relationships) {
              if (rel.Ids) {
                // Get all text from the IDs and combine them
                const textArray = rel.Ids.map((id: string) => idToBlock[id]?.Text).filter((text: any) => text !== undefined);
                rel.text = textArray.join(' ');
              }
            }
          }

          // Generate sequential caption based on BlockType
          const blockType = block.BlockType || '';
          const typeName = blockType.replace('LAYOUT_', ''); // Remove LAYOUT_ prefix
          
          // Initialize counter for this block type if not exists
          if (!blockTypeCounts[typeName]) {
            blockTypeCounts[typeName] = 0;
          }
          
          // Increment counter for this block type
          blockTypeCounts[typeName]++;
          
          // Create caption: FIGURE1, TEXT1, TABLE1, etc.
          const caption = `${typeName}${blockTypeCounts[typeName]}`;

          const layoutItem: VisionOutputItem = {
            documentVisionOutputUuid: block.Id || '',
            documentUuid,
            totalPages, 
            pageNumber: block.Page || 1,
            className: block.BlockType || '',
            confidence: block.Confidence || 0.0,
            bbox: JSON.stringify([left, top, left + width, top + height]),
            text: block.Relationships?.map((rel: any) => rel.text).join(' ') || '', // Your custom field
            caption: caption, // Your custom field
          };

          // Add to appropriate array based on block type
          layoutItems.push(layoutItem);
        }
      }
      console.log(layoutItems);
      nextToken = response.NextToken;
    } while (nextToken);
    
    // Step 2: All items already have captions, no need for additional processing
    // const itemsWithCaptions = findCaptionsForImageItems(imageItems);

    // Step 3: Save layout items to database using the database module
    await saveVisionOutputs(layoutItems);

    return layoutItems;
}
  
export async function callLayoutDetectorLambda({   
    inputKey,
    S3Bucket = process.env.AWS_BUCKET_NAME,
    documentUuid, }: LayoutDetectorInput): Promise<LayoutDetectorResponse> {

  if (!S3Bucket) {
    throw new Error('S3Bucket is required');
  }

  // Start Textract async job on the S3 PDF file
  try {
    const jobId = await startDocumentAnalysis(S3Bucket, inputKey);

    // Wait for job to complete
    await waitForJobToComplete(jobId);

    // Fetch all blocks and save to database
    const layoutItems = await getAllBlocksAndProcess(jobId, documentUuid);

    return {
      message: 'Layout extraction successful',
      documentUuid,
      totalBlocks: layoutItems.length,
      layoutItems,
    };
  } catch (error) {
    // log error and continue
    console.error('Error in callLayoutDetectorLambda', error);

    return {
      message: 'Layout extraction failed',
      documentUuid,
      totalBlocks: 0,
      layoutItems: [],
    };
  }
}