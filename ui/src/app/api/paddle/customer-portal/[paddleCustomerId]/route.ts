import { NextRequest, NextResponse } from "next/server";
import { buildPaddleApiUrl } from "@/lib/payments/providers/paddle";

interface PaddlePortalResponse {
  data: {
    id: string;
    customer_id: string;
    urls: {
      general: {
        overview: string;
      };
      subscriptions: any[];
    };
    created_at: string;
  };
  meta: {
    request_id: string;
  };
}

const getPortalUrl =  async (customerId: string): Promise<string> => {
  const paddleApiKey = process.env.PADDLE_CUSTOMER_PORTAL_KEY;
  
  if (!paddleApiKey) {
    throw new Error('Paddle API key not configured');
  }

  const response = await fetch(buildPaddleApiUrl(`customers/${customerId}/portal-sessions`), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${paddleApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create portal session: ${errorText}`);
  }

  const data: PaddlePortalResponse = await response.json();
  return data.data.urls.general.overview;
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ paddleCustomerId: string }> }) {
  const { paddleCustomerId } = await params;
  const portalUrl = await getPortalUrl(paddleCustomerId);

  return NextResponse.redirect(portalUrl);
}