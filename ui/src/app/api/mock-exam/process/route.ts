import { NextRequest, NextResponse } from 'next/server';
import { cookieBasedClient, getUserId } from '@/lib/ssr/utils';
import { GoogleGenAI } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { SSMClient, GetParameterCommand, GetParametersByPathCommand } from '@aws-sdk/client-ssm';
import { uploadFileToS3WithCustomPath } from '@/lib/utils/s3-upload';
import { Amplify } from 'aws-amplify';
import awsExports from '../../../../../amplify_outputs.json';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Information about a file (exam paper or marksheet)
 */
interface FileInfo {
  /** Original filename of the uploaded file */
  fileName: string;
  /** S3 key where the file is stored */
  s3Key: string;
  /** Gemini-compatible file URI for AI processing */
  geminiFileUri: string;
  /** MIME type for Gemini API */
  geminiMimeType: string;
}

/**
 * Represents an exam paper with its associated files
 */
interface ExamPaper {
  /** Zero-based index of the paper in the exam */
  paperIndex: number;
  /** Display name for the paper */
  paperName: string;
  /** Main exam paper file */
  examPaperFile: FileInfo;
  /** Optional marksheet file */
  marksheetFile?: FileInfo;
}

// Configure Amplify for server-side usage
Amplify.configure(awsExports);

interface ExamPaperData {
  file: {
    name: string;
    buffer: Buffer | Uint8Array | any; // Allow different buffer types
    type: string;
  };
  marksheet?: {
    name: string;
    buffer: Buffer | Uint8Array | any; // Allow different buffer types
    type: string;
  } | null;
}

interface ExamPaperRequest {
  examName: string;
  moduleName: string; // Add this
  moduleNumber: string; // Add this
  examPapers: ExamPaperData[];
  spaceUuid?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    // Get user ID
    const userUuid = await getUserId();
    if (!userUuid) {
      return NextResponse.json(
        { error: 'User ID not found in request' },
        { status: 401 }
      );
    }

    // Parse FormData instead of JSON
    const formData = await request.formData();
    const examName = formData.get('examName') as string;
    const moduleName = formData.get('moduleName') as string || '';
    const moduleNumber = formData.get('moduleNumber') as string || '';
    const spaceUuid = formData.get('spaceUuid') as string || null;
    
    // Extract exam papers from FormData
    const examPapers: ExamPaperData[] = [];
    let index = 0;
    
    while (formData.has(`examPaper${index}`)) {
      const file = formData.get(`examPaper${index}`) as File;
      const marksheet = formData.get(`marksheet${index}`) as File | null;
      
      if (file) {
        examPapers.push({
          file: {
            name: file.name,
            buffer: Buffer.from(await file.arrayBuffer()),
            type: file.type,
          },
          marksheet: marksheet ? {
            name: marksheet.name,
            buffer: Buffer.from(await marksheet.arrayBuffer()),
            type: marksheet.type,
          } : null,
        });
      }
      index++;
    }

    if (!examName?.trim()) {
      return NextResponse.json(
        { error: 'Exam name is required' },
        { status: 400 }
      );
    }

    if (!examPapers || examPapers.length === 0) {
      return NextResponse.json(
        { error: 'At least one exam paper is required' },
        { status: 400 }
      );
    }

    // Get Gemini API key from environment or secrets manager
    let geminiApiKey = process.env.GOOGLE_GENAI_API_KEY;
    
    console.log('Environment GOOGLE_GENAI_API_KEY exists:', !!process.env.GOOGLE_GENAI_API_KEY);
    
    if (!geminiApiKey) {
      // Try to get from AWS Secrets Manager
      const client = new SecretsManagerClient({
        region: process.env.AWS_REGION || 'eu-west-2',
      });
      
      try {
        const command = new GetSecretValueCommand({
          SecretId: 'gemini-api-key',
        });
        const response = await client.send(command);
        console.log('Secrets Manager response:', response);
        
        if (!response.SecretString) {
          throw new Error('No secret string in response');
        }
        
        const secret = JSON.parse(response.SecretString);
        geminiApiKey = secret.GOOGLE_GENAI_API_KEY;
        console.log('Retrieved Gemini API key from secrets manager:', !!geminiApiKey);
      } catch (error) {
        console.error('Failed to get Gemini API key from secrets manager:', error);
        return NextResponse.json(
          { error: 'Gemini API key not configured. Please set GOOGLE_GENAI_API_KEY environment variable or create the gemini-api-key secret in AWS Secrets Manager.' },
          { status: 500 }
        );
      }
    }

    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not found' },
        { status: 500 }
      );
    }

    console.log('Using Gemini API key:', geminiApiKey.substring(0, 10) + '...');

    // Initialize Gemini AI
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

    // Generate task UUID for tracking
    const taskUuid = uuidv4();
    const uploadedFiles: Array<{
      s3Key: string;
      geminiUri: string;
      geminiMimeType: string;
      fileName: string;
      isMarksheet: boolean;
    }> = [];

    // Upload each exam paper to both S3 and Gemini
    for (let i = 0; i < examPapers.length; i++) {
      const paper = examPapers[i];

      // Convert to proper Buffer if needed
      let fileBuffer: Buffer;
      if (Buffer.isBuffer(paper.file.buffer)) {
        fileBuffer = paper.file.buffer;
      } else if (paper.file.buffer instanceof Uint8Array) {
        fileBuffer = Buffer.from(paper.file.buffer);
      } else if (paper.file.buffer && typeof paper.file.buffer === 'object') {
        // If it's an object, try to extract the data
        const bufferObj = paper.file.buffer as any;
        if (bufferObj.data) {
          fileBuffer = Buffer.from(bufferObj.data);
        } else if (Array.isArray(paper.file.buffer)) {
          fileBuffer = Buffer.from(paper.file.buffer);
        } else {
          throw new Error(`Unsupported buffer type: ${typeof paper.file.buffer}`);
        }
      } else {
        throw new Error(`Invalid buffer type: ${typeof paper.file.buffer}`);
      }

      // Convert Buffer to File for S3 upload
      const examPaperFile = new File([new Uint8Array(fileBuffer)], paper.file.name, { type: paper.file.type });
      
      console.log(`File details for paper ${i + 1}:`, {
        name: examPaperFile.name,
        type: examPaperFile.type,
        size: examPaperFile.size,
        lastModified: examPaperFile.lastModified
      });
      
      // Upload exam paper to S3 using shared utility
      const examPaperS3Response = await uploadFileToS3WithCustomPath(examPaperFile, `exam-papers/${userUuid}/${taskUuid}/papers/${i}/exam-paper`);

      // Create temporary file for Gemini upload
      const tempFilePath = join(tmpdir(), `exam-paper-${i}-${Date.now()}.${paper.file.name.split('.').pop()}`);
      writeFileSync(tempFilePath, fileBuffer);

      // Upload exam paper to Gemini using file path
      let examPaperGeminiResponse;
      try {
        console.log(`Uploading paper ${i + 1} to Gemini from path: ${tempFilePath}`);
        examPaperGeminiResponse = await ai.files.upload({
          file: tempFilePath,
          config: { 
            mimeType: paper.file.type,
            displayName: `${examName} - Paper ${i + 1} - ${paper.file.name}`
          },
        });
        console.log(`Successfully uploaded paper ${i + 1} to Gemini`);
        
        // Clean up temporary file
        unlinkSync(tempFilePath);
      } catch (error) {
        console.error(`Failed to upload paper ${i + 1} to Gemini:`, error);
        // Clean up temporary file on error
        try {
          unlinkSync(tempFilePath);
        } catch (cleanupError) {
          console.error('Failed to clean up temporary file:', cleanupError);
        }
        throw new Error(`Failed to upload paper ${i + 1} to Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      console.log(`Gemini upload response for exam paper ${i + 1}:`, {
        uri: examPaperGeminiResponse.uri,
        mimeType: examPaperGeminiResponse.mimeType,
        displayName: examPaperGeminiResponse.displayName
      });

      uploadedFiles.push({
        s3Key: examPaperS3Response.file!.originalKey,
        geminiUri: examPaperGeminiResponse.uri || '',
        geminiMimeType: examPaperGeminiResponse.mimeType || paper.file.type,
        fileName: paper.file.name,
        isMarksheet: false,
      });

      // Upload marksheet if provided
      if (paper.marksheet) {
        // Convert to proper Buffer if needed
        let marksheetBuffer: Buffer;
        if (Buffer.isBuffer(paper.marksheet.buffer)) {
          marksheetBuffer = paper.marksheet.buffer;
        } else if (paper.marksheet.buffer instanceof Uint8Array) {
          marksheetBuffer = Buffer.from(paper.marksheet.buffer);
        } else if (paper.marksheet.buffer && typeof paper.marksheet.buffer === 'object') {
          // If it's an object, try to extract the data
          const bufferObj = paper.marksheet.buffer as any;
          if (bufferObj.data) {
            marksheetBuffer = Buffer.from(bufferObj.data);
          } else if (Array.isArray(paper.marksheet.buffer)) {
            marksheetBuffer = Buffer.from(paper.marksheet.buffer);
          } else {
            throw new Error(`Unsupported marksheet buffer type: ${typeof paper.marksheet.buffer}`);
          }
        } else {
          throw new Error(`Invalid marksheet buffer type: ${typeof paper.marksheet.buffer}`);
        }

        // Convert Buffer to File for S3 upload
        const marksheetFile = new File([new Uint8Array(marksheetBuffer)], paper.marksheet.name, { type: paper.marksheet.type });
        
        console.log(`Marksheet file details for paper ${i + 1}:`, {
          name: marksheetFile.name,
          type: marksheetFile.type,
          size: marksheetFile.size,
          lastModified: marksheetFile.lastModified
        });
        
        // Upload marksheet to S3 using shared utility
        const marksheetS3Response = await uploadFileToS3WithCustomPath(marksheetFile, `exam-papers/${userUuid}/${taskUuid}/papers/${i}/marksheet`);

        // Create temporary file for Gemini upload
        const tempMarksheetPath = join(tmpdir(), `marksheet-${i}-${Date.now()}.${paper.marksheet.name.split('.').pop()}`);
        writeFileSync(tempMarksheetPath, marksheetBuffer);

        // Upload marksheet to Gemini using file path
        let marksheetGeminiResponse;
        try {
          console.log(`Uploading marksheet ${i + 1} to Gemini from path: ${tempMarksheetPath}`);
          marksheetGeminiResponse = await ai.files.upload({
            file: tempMarksheetPath,
            config: { 
              mimeType: paper.marksheet.type,
              displayName: `${examName} - Paper ${i + 1} - Marksheet - ${paper.marksheet.name}`
            },
          });
          console.log(`Successfully uploaded marksheet ${i + 1} to Gemini`);
          
          // Clean up temporary file
          unlinkSync(tempMarksheetPath);
        } catch (error) {
          console.error(`Failed to upload marksheet ${i + 1} to Gemini:`, error);
          // Clean up temporary file on error
          try {
            unlinkSync(tempMarksheetPath);
          } catch (cleanupError) {
            console.error('Failed to clean up temporary marksheet file:', cleanupError);
          }
          throw new Error(`Failed to upload marksheet ${i + 1} to Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        console.log(`Gemini upload response for marksheet ${i + 1}:`, {
          uri: marksheetGeminiResponse.uri,
          mimeType: marksheetGeminiResponse.mimeType,
          displayName: marksheetGeminiResponse.displayName
        });

        uploadedFiles.push({
          s3Key: marksheetS3Response.file!.originalKey,
          geminiUri: marksheetGeminiResponse.uri || '',
          geminiMimeType: marksheetGeminiResponse.mimeType || paper.marksheet.type,
          fileName: paper.marksheet.name,
          isMarksheet: true,
        });
      }
    }
    
    // Group exam papers with their marksheets
    const examPapersWithMarksheets = examPapers.map((examPaper, index) => ({
      paperIndex: index,
      paperName: examPaper.file.name,
      examPaperFile: {
        fileName: examPaper.file.name,
        s3Key: uploadedFiles.find(f => f.fileName === examPaper.file.name)?.s3Key,
        geminiFileUri: uploadedFiles.find(f => f.fileName === examPaper.file.name)?.geminiUri,
        geminiMimeType: uploadedFiles.find(f => f.fileName === examPaper.file.name)?.geminiMimeType,
      },
      marksheetFile: examPaper.marksheet ? {
        fileName: examPaper.marksheet.name,
        s3Key: uploadedFiles.find(f => f.fileName === examPaper.marksheet!.name)?.s3Key,
        geminiFileUri: uploadedFiles.find(f => f.fileName === examPaper.marksheet!.name)?.geminiUri,
        geminiMimeType: uploadedFiles.find(f => f.fileName === examPaper.marksheet!.name)?.geminiMimeType,
      } : null,
    }));

    console.log(`Preparing to process ${examPapersWithMarksheets.length} exam papers separately`);

    const orchestratorPayload = {
      taskUuid: taskUuid, // Use the base taskUuid without suffix
      examName: `${examName}-${moduleName}-${moduleNumber}-paper${index + 1}`, // Use the new format
      examPapers: [examPapersWithMarksheets[0]], // Single exam (paper + marksheet) per invocation
      userUuid,
      spaceUuid,
    };

    try {
      // MOCK_EXAM_PROCESSING has been removed - this route is no longer functional
      throw new Error('MOCK_EXAM_PROCESSING has been removed. This functionality is no longer available.');
      // console.log('Task created:', task);

      return NextResponse.json({
        success: true,
        examIndex: index,
        examName: `${examName} - Exam ${0 + 1}`,
        paperName: examPapersWithMarksheets[0].paperName,
        marksheetName: examPapersWithMarksheets[0].marksheetFile?.fileName || 'None',
        taskUuid: orchestratorPayload.taskUuid,
      });
    } catch (error) {
      console.error(`Failed to invoke orchestrator Lambda for exam ${0 + 1}:`, error);
      return NextResponse.json({
        examIndex: index,
        examName: `${examName} - Exam ${0 + 1}`,
        paperName: examPapersWithMarksheets[0].paperName,
        marksheetName: examPapersWithMarksheets[0].marksheetFile?.fileName || 'None',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    };
  } catch (error) {
    console.error('Error processing exam paper:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process exam paper',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}