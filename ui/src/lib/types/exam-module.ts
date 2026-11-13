export type ExamModule = {
  examModuleUuid: string;
  moduleName: string;
  questionKeys: string[];
  price: number;
  retired: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ExamModuleFormType = Omit<ExamModule, "examModuleUuid" | "createdAt" | "updatedAt">;