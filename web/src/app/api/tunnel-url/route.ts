import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const file = path.join(process.cwd(), 'public', 'tunnel-url.json');
    const raw = await readFile(file, 'utf8');
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ url: '', message: '' });
  }
}
