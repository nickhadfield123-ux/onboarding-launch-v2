import { NextResponse } from 'next/server';

export async function GET() {
  // Mock data – in production this would call git log or a CI API
  return NextResponse.json([
    { hash: 'b5dd6aa', message: 'Redesign superuser to match platformframe', author: 'Nick Hadfield', date: '2026-05-16' },
    { hash: '664938c', message: 'Surgical fix: set awaitEmailForAuth after welcome', author: 'Nick Hadfield', date: '2026-05-16' },
    { hash: '36fc9db', message: 'Make call details chip navigate internally', author: 'Nick Hadfield', date: '2026-05-16' }
  ]);
}
