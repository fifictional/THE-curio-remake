import { MockExamViewerItem } from "@/components/mock-exams/mock-exam-viewer-item";

export default async function MockExamPage({ params }: { params: Promise<{ mockExamUuid: string }> }) {
  const { mockExamUuid } = await params;

  return <MockExamViewerItem mockExamUuid={mockExamUuid} />;
}