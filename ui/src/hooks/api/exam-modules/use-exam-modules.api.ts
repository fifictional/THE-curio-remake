import { ExamModuleFormType } from "@/lib/types/exam-module";
import { useAmplifyApiClient } from "@/providers/amplify-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { v4 as uuidv4 } from 'uuid';

export const useExamModulesApi = () => {
  const client = useAmplifyApiClient();
  const queryClient = useQueryClient();
  
  const getExamModules = useCallback(async () => {
    const response = await client.models.ExamModule.list();

    if (!response.data) {
      return [];
    }

    return response.data;
  }, []);

  const deleteExamModuleFunc = useCallback(async (examModuleUuid: string) => {
    const response = await client.models.ExamModule.delete({ examModuleUuid });

    if (response.errors) {
      throw new Error(response.errors[0].message);
    }

    queryClient.invalidateQueries({ queryKey: ['examModules'] });
  }, []);

  const createExamModuleFunc = useCallback(async (examModule: ExamModuleFormType) => {
    const response = await client.models.ExamModule.create({ 
        examModuleUuid: uuidv4(),
        ...examModule,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });

    if (response.errors) {
      throw new Error(response.errors[0].message);
    }

    queryClient.invalidateQueries({ queryKey: ['examModules'] });
  }, []);

  const updateExamModuleFunc = useCallback(async (examModule: ExamModuleFormType & { examModuleUuid: string }) => {
    const response = await client.models.ExamModule.update({
        ...examModule,
        updatedAt: new Date().toISOString()
    });

    if (response.errors) {
      throw new Error(response.errors[0].message);
    }

    queryClient.invalidateQueries({ queryKey: ['examModules'] });
  }, []);

  const { mutateAsync: createExamModule } = useMutation({
    mutationFn: createExamModuleFunc,
  });
  const { mutateAsync: updateExamModule } = useMutation({
    mutationFn: updateExamModuleFunc,
  });
  const { mutateAsync: deleteExamModule } = useMutation({
    mutationFn: deleteExamModuleFunc,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['examModules'],
    queryFn: getExamModules,
  });

  return {
    examModules: data,
    createExamModule,
    updateExamModule,
    deleteExamModule,
    isLoading,
  };
};