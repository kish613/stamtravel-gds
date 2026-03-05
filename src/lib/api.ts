export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const message = await res.text().catch(() => 'Request failed');
    throw new Error(message || 'Request failed');
  }
  return res.json() as Promise<T>;
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
