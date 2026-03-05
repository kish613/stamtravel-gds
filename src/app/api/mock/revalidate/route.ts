import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ ok: true, message: 'Sabre revalidation mocked; live integration in phase 3' });
}
