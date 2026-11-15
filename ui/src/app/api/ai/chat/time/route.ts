import { NextResponse } from 'next/server';

/** Server clock for message timestamps (no AppSync/serverless time source). */
export const GET = async () => NextResponse.json({ serverTime: new Date().toISOString() });
