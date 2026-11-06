import { NextResponse } from "next/server";
// Google Health API notifications are a signal to re-query the API, not the health records themselves.
// Configure subscriber authentication and webhook payload verification before enabling subscriptions.
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { received: false, message: "Webhook endpoint reserved. Configure and verify a Google Health subscriber before enabling it." },
    { status: 503 }
  );
}
