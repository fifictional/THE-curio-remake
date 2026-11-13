import { useAmplifyApiClient } from "@/providers";
import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

export const useStartMockExamApi = () => {
  const client = useAmplifyApiClient();

  const startMockExam = useCallback(async (mockExamUuid: string) => {
    // find the first one and restart it for now
    const responseList = await client.models.MockExamLog.listMockExamLogByMockExamUuidAndStartedAt({
      mockExamUuid,
    }, {
      limit: 1,
      sortDirection: "DESC"
    });

    if (responseList.errors) {
      console.error('Error starting mock exam', responseList.errors);
      return null;
    }

    if (responseList.data.length === 0) {
      // create a new one
      const response = await client.models.MockExamLog.create({
        mockExamLogUuid: uuidv4(),
        mockExamUuid,
        questionAnswers: [],
        status: 'IN_PROGRESS',
        score: 0,
        startedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
  
      if (response.errors) {
        console.error('Error starting mock exam', response.errors);
        return null;
      }
  
      return response.data;
    } else {
      // update the first one
      const response = await client.models.MockExamLog.update({
        mockExamLogUuid: responseList.data[0].mockExamLogUuid,
        status: 'IN_PROGRESS',
        questionAnswers: [],
        score: 0,
        completedAt: null,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      if (response.errors) {
        console.error('Error starting mock exam', response.errors);
        return null;
      }

      return response.data;
    }
  }, []);

  const { mutateAsync: startMockExamApi } = useMutation({
    mutationFn: startMockExam,
  });

  return {
    startMockExam: startMockExamApi,
  };
};