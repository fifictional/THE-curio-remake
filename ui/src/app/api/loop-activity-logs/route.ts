import { NextResponse, NextRequest } from "next/server";
import { updateLoopsContact } from '@amplify/auth/utils/loops'

export const POST = async (req: NextRequest) => {
  const data = await req.json();
  let requestData = { lastActivityDate: new Date().toISOString() }
  if (data) {
    requestData = { ...requestData, ...data }
  }
  await updateLoopsContact(requestData)
  return NextResponse.json({ success: true });
}
