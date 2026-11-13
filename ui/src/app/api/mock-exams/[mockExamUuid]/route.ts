import { NextRequest, NextResponse } from "next/server";
import { cookieBasedClient, getUserId } from "@/lib/ssr/utils";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ mockExamUuid: string }> }) {
  const { mockExamUuid } = await params;

  // Check if this is the free trial SAT mock exam
  const userUuid = await getUserId();
  if (userUuid) {
    const userProfile = await cookieBasedClient.models.UserProfile.get({ userUuid });
    if (userProfile.data?.freeSATMockExamUuid === mockExamUuid) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete the free trial SAT mock exam',
      }, { status: 403 });
    }
  }

  const deletePromises = [];

  deletePromises.push(cookieBasedClient.models.MockExam.delete({
    mockExamUuid,
  }));

  const mockExamLogsDeleteResponse = await cookieBasedClient.models.MockExamLog.listMockExamLogByMockExamUuidAndStartedAt({
    mockExamUuid,
  }, {
    limit: 1000,
    sortDirection: "DESC",
  });
  for (const mockExamLog of mockExamLogsDeleteResponse.data) {
    deletePromises.push(cookieBasedClient.models.MockExamLog.delete({
      mockExamLogUuid: mockExamLog.mockExamLogUuid,
    }));
  };

  const deleteResponses = await Promise.all(deletePromises);
  if (deleteResponses.some((response) => response.errors)) {
    return NextResponse.json({
      success: false,
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
  });
}