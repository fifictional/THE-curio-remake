import { NextResponse, NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { cookieBasedClient } from "@/lib/ssr/utils";

export const POST = async (req: NextRequest) => {
  const { message, userUuid, chatUuid, image, chatType, args } = await req.json();

  const now = new Date().toISOString();
  const messageUuid = uuidv4();

  // create an empty message
  await cookieBasedClient.models.Message.create({
    messageUuid,
    chatUuid,
    content: '',
    role: 'assistant',
    createdAt: now,
    updatedAt: now,
    isCompleted: false,
  });

  // create an empty task
  const task = await cookieBasedClient.models.Task.create({
    taskUuid: uuidv4(),
    userUuid,
    messageUuid,
    type: "CHAT",
    status: "PENDING",
    args: JSON.stringify({
      messageUuid,
      message,
      chatUuid,
      userUuid,
      image,
      chatType,
      chatArgs: args,
    }),
    progress: 0,
    createdAt: now,
    updatedAt: now,
  });

  if (task.errors || !task.data) {
    console.error('Error creating task', task.errors);
    return NextResponse.json({ success: false, error: 'Failed to create task' }, { status: 500 });
  }

  return NextResponse.json({ success: true, taskUuid: task.data.taskUuid });
}