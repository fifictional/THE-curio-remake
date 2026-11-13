import { NextRequest, NextResponse } from "next/server";
import { cookieBasedClient } from "@/lib/ssr/utils";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  const { userUuid, messageUuid, title, description, topic, difficulty, time, questionCount, chatUuid, instructions, moduleUuids } = await req.json();

  // update the message with the tool extra creation status
  const updateMessageResponse = await cookieBasedClient.models.Message.update({
    messageUuid,
    toolExtras: {
      userAction: true,
      isLoading: true,
    },
  });
  if (updateMessageResponse.errors) {
    console.error('Error updating message', updateMessageResponse.errors);
    return NextResponse.json({
      success: false,
      error: updateMessageResponse.errors[0].message,
    });
  }

  const mockExamCreationResponse = await cookieBasedClient.models.MockExam.create({
    mockExamUuid: uuidv4(),
    userUuid: userUuid,
    spaceUuid: null,
    chatUuid: chatUuid,
    title: title,
    creationStatus: 'CREATED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: [],
    mockExamInfo: {
      description: description,
      topic: topic,
      difficulty: difficulty,
      time: time ? Number(time) : 0,
      questionCount: questionCount,
      instructions: instructions,
      moduleUuids: moduleUuids,
    },
  });

  if (mockExamCreationResponse.errors) {
    console.error('Error creating mock exam', mockExamCreationResponse.errors);

    await cookieBasedClient.models.Message.update({
      messageUuid,
      toolExtras: {
        userAction: false,
        isLoading: false,
        success: false,
        errors: [mockExamCreationResponse.errors],
      },
    });
    return NextResponse.json({
      success: false,
      error: mockExamCreationResponse.errors[0].message,
    });
  }

  await cookieBasedClient.models.Message.update({
    messageUuid,
    toolExtras: {
      userAction: false,
      isLoading: false,
      success: true,
    },
  });

  // call another endpoint to generate the questions
  // do not wait for the response. just call it.
  if (!mockExamCreationResponse?.data?.mockExamUuid) {
    console.error('Mock exam UUID failed to be created');
    return NextResponse.json({
      success: false,
      error: 'Mock exam UUID failed to be created',
    });
  }

  // create a generate questions task
  await cookieBasedClient.models.Task.create({
    taskUuid: uuidv4(),
    userUuid: userUuid,
    type: 'QUESTION_GENERATION',
    status: 'PENDING',
    args: JSON.stringify({
      mockExamUuid: mockExamCreationResponse?.data?.mockExamUuid,
      userUuid: userUuid,
    }),
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({
    success: true,
    mockExamUuid: mockExamCreationResponse?.data?.mockExamUuid,
  });
}
