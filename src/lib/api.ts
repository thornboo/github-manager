interface ApiErrorPayload {
  error?: string;
  message?: string;
}

async function readErrorMessage(res: Response): Promise<string> {
  const contentType = res.headers.get('content-type') || '';

  // Vite dev server / 部署错误时常返回 HTML，避免把整段 HTML 当成错误消息展示
  if (contentType.includes('text/html')) {
    return `HTTP ${res.status}`;
  }

  if (contentType.includes('application/json')) {
    const data = (await res.json().catch(() => null)) as ApiErrorPayload | null;
    return data?.error || data?.message || `HTTP ${res.status}`;
  }

  const text = await res.text().catch(() => '');
  return text || `HTTP ${res.status}`;
}

export async function postJson<TResponse>(
  url: string,
  body: unknown,
  init?: Omit<RequestInit, 'method' | 'body' | 'headers'>
): Promise<TResponse> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...init,
  });

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  return (await res.json()) as TResponse;
}
