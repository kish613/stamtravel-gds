import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function GET() {
  const filePath = path.join(process.cwd(), 'generated-page.html');

  try {
    const html = await readFile(filePath, 'utf8');

    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store'
      }
    });
  } catch {
    return new Response('generated-page.html not found', {
      status: 404,
      headers: {
        'content-type': 'text/plain; charset=utf-8'
      }
    });
  }
}
