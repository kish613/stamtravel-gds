import { NextResponse } from 'next/server';
import cars from '@/fixtures/cars.json';

export async function GET() {
  return NextResponse.json(cars);
}
