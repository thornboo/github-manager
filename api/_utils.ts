export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function okCors(): Response {
  return new Response("ok", { headers: corsHeaders });
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  for (const [k, v] of Object.entries(corsHeaders)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function normalizeChatCompletionsEndpoint(baseUrl: string): string {
  let endpoint = baseUrl.trim();
  if (endpoint.endsWith("/")) {
    endpoint = endpoint.slice(0, -1);
  }

  // 兼容两种输入：
  // - https://api.openai.com
  // - https://api.openai.com/v1
  // 以及已经完整提供到 /chat/completions 的情况
  if (!endpoint.endsWith("/chat/completions")) {
    if (!endpoint.endsWith("/v1")) {
      endpoint += "/v1";
    }
    endpoint += "/chat/completions";
  }

  return endpoint;
}

export async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

export async function safeReadJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function safeJsonParse(text: string): unknown | null {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
