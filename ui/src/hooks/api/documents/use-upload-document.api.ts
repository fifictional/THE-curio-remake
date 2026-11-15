import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadData } from '@/lib/local-storage';
import { v4 as uuidv4 } from 'uuid';

interface UploadResponse {
  success: boolean;
  file?: {
    originalKey: string;
    type: string;
  };
  error?: string;
  spaceUuid?: string;
}

async function uploadDocument(file: File, userUuid: string, documentUuid: string, documentIndex: number = -1): Promise<UploadResponse> {
  // Get file extension from filename
  const fileExtension = file.name.split('.').pop() || '';
  const extension = fileExtension ? `.${fileExtension}` : '';
  
  // Build S3 key: student-documents/{userUuid}/{documentUuid}/uploadedFile.{ext} or {index}.{ext} for images
  let fileName: string;
  if (documentIndex >= 0) {
    fileName = `uploadedFile-${documentIndex}${extension}`;
  } else {
    fileName = `uploadedFile${extension}`;
  }
  
  const originalKey = `student-documents/${userUuid}/${documentUuid}/${fileName}`;
  
  const response = await uploadData({
    data: file,
    path: originalKey,
    options: {
      contentType: file.type,
    }
  }).result;

  if (!response) {
    throw new Error('Error uploading document');
  }

  return {
    success: true,
    file: {
      originalKey: response.path,
      type: file.type,
    },
  };
}

async function storeDocumentData(
  document: UploadResponse,
  documentUuid: string,
  fileName: string,
  documentCount: number = 1,
  spaceUuid?: string | null,
  companionDesktopUserUuid?: string | null,
) {
  console.log('spaceUuid', spaceUuid);
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (companionDesktopUserUuid) {
    headers.set('X-Companion-Desktop-User-Uuid', companionDesktopUserUuid);
  }
  const response = await fetch('/api/documents', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...document.file,
      documentUuid: documentUuid,
      fileName: fileName,
      documentCount: documentCount,
      spaceUuid: spaceUuid,
    }),
  });

  if (!response.ok) {
    throw new Error('Error storing document data');
  }

  return response.json();
}

export function useUploadDocumentApi(
  userUuid: string | null,
  spaceUuid?: string | null,
  companionDesktopUserUuid?: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (files: File[]) => {
      if (!userUuid) {
        throw new Error('User not found');
      }

      // split pdf files from images
      const imageFiles = files.filter(file => file.type.includes("image"));
      const otherFiles = files.filter(file => !file.type.includes("image"));

      var documentUuids: string[] = [];

      if (imageFiles.length > 0) {
        let documentIndex = 0;
        let uploadData: UploadResponse = {
          success: true,
          file: {
            originalKey: "",
            type: "",
          },
        };
        const documentUuid = uuidv4();
        for (const file of imageFiles) {
          // upload all images with the same name and a dash
          uploadData = await uploadDocument(file, userUuid, documentUuid, documentIndex);
          documentIndex++;
        }
        
        await storeDocumentData(
          uploadData,
          documentUuid,
          imageFiles[0].name,
          imageFiles.length,
          spaceUuid,
          companionDesktopUserUuid,
        );
        documentUuids.push(documentUuid);
      }

      for (const file of otherFiles) {
        const documentUuid = uuidv4();
        const document = await uploadDocument(file, userUuid, documentUuid);
        await storeDocumentData(
          document,
          documentUuid,
          file.name,
          1,
          spaceUuid,
          companionDesktopUserUuid,
        );
        documentUuids.push(documentUuid);
      }

      return documentUuids;
    },
    onSuccess: () => {
      // Invalidate the user query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['spaces'] });
    },
  });
} 