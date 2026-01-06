import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const { to, subject, html } = await req.json();
  console.log('[API] /api/send-verification-email called');
  console.log('[API] Params:', { to, subject });
  try {
    const result = await sendEmail({ to, subject, html });
    console.log('[API] Email sent result:', result);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Email send error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
} 