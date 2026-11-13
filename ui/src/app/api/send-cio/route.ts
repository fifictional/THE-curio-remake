import { NextRequest, NextResponse } from 'next/server';
import { Analytics } from '@customerio/cdp-analytics-node';
import { updateDataCustomerIO } from '@amplify/auth/utils/customerio'
/**
 * API endpoint to send events/traits to Customer.io
 * 
 * Body should contain:
 * - email: string (required) - User's email address
 * - traits: Record<string, any> (optional) - Traits to update/create
 * - event?: string (optional) - Event name to track
 * - eventProperties?: Record<string, any> (optional) - Event properties
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await updateDataCustomerIO(body)
    return NextResponse.json({
      success: true,
      message: 'Customer.io update sent successfully',
    });
  } catch (error: any) {
    console.error('[send-cio] Error processing request:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

