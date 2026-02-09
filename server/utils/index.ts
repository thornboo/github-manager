interface CorsOptions {
  allowHeaders?: string;
  allowMethods?: string;
  extraHeaders?: Record<string, string>;
}

export interface RequestLike {
  headers?: unknown;
  url?: string;
  protocol?: string;
  get?: (name: string) => string | undefined;
}

const DEFAULT_ALLOW_HEADERS = "authorization, content-type";
const DEFAULT_ALLOW_METHODS = "POST, OPTIONS";

function readRuntimeEnv(name: string): string | undefined {
  const maybeProcess = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };
  const value = maybeProcess.process?.env?.[name];
  return typeof value === "string" ? value : undefined;
}

function isProductionEnv(): boolean {
  const nodeEnv = readRuntimeEnv("NODE_ENV")?.toLowerCase();
  const vercelEnv = readRuntimeEnv("VERCEL_ENV")?.toLowerCase();
  return nodeEnv === "production" || vercelEnv === "production";
}

function parseOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getConfiguredAllowedOrigins(): Set<string> {
  const raw = readRuntimeEnv("ALLOWED_ORIGINS") || "";
  const entries = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map(parseOrigin)
    .filter((item): item is string => !!item);

  return new Set(entries);
}

function readHeaderValue(headers: unknown, key: string): string | null {
  if (!headers) return null;

  const lowerKey = key.toLowerCase();

  if (
    typeof headers === "object" &&
    headers !== null &&
    "get" in headers &&
    typeof (headers as { get?: unknown }).get === "function"
  ) {
    const getter = (headers as { get(name: string): string | null }).get;
    return getter.call(headers, lowerKey) ?? getter.call(headers, key) ?? null;
  }

  if (typeof headers === "object") {
    const record = headers as Record<string, unknown>;
    const value = record[lowerKey] ?? record[key];
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") {
      return value[0];
    }
  }

  return null;
}

function resolveRequestOrigin(request: RequestLike): string | null {
  const origin = readHeaderValue(request.headers, "origin");
  if (!origin) return null;
  return parseOrigin(origin);
}

function resolveRequestUrlOrigin(request: RequestLike): string | null {
  if (request.url) {
    const fromUrl = parseOrigin(request.url);
    if (fromUrl) return fromUrl;
  }

  const host =
    (typeof request.get === "function" ? request.get("host") : null) ??
    readHeaderValue(request.headers, "host");

  const forwardedProto = readHeaderValue(request.headers, "x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol = request.protocol || forwardedProto;

  if (!host || !protocol) return null;
  return parseOrigin(`${protocol}://${host}`);
}

function resolveAllowedOrigin(request: RequestLike): string | null {
  const requestOrigin = resolveRequestOrigin(request);
  if (!requestOrigin) return null;

  // 同源请求始终允许。
  const requestUrlOrigin = resolveRequestUrlOrigin(request);
  if (requestUrlOrigin && requestOrigin === requestUrlOrigin) {
    return requestOrigin;
  }

  const configuredOrigins = getConfiguredAllowedOrigins();
  if (configuredOrigins.has(requestOrigin)) {
    return requestOrigin;
  }

  // 未配置白名单时，开发环境允许跨源；生产环境默认拒绝跨源。
  if (configuredOrigins.size === 0 && !isProductionEnv()) {
    return "*";
  }

  return null;
}

export function isCorsOriginAllowed(request: RequestLike): boolean {
  const originHeader = readHeaderValue(request.headers, "origin");
  if (!originHeader) return true;
  return resolveAllowedOrigin(request) !== null;
}

export function buildCorsHeaders(
  request: RequestLike,
  options: CorsOptions = {},
): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      options.allowHeaders ?? DEFAULT_ALLOW_HEADERS,
    "Access-Control-Allow-Methods":
      options.allowMethods ?? DEFAULT_ALLOW_METHODS,
  };

  const allowedOrigin = resolveAllowedOrigin(request);
  if (allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
    if (allowedOrigin !== "*") {
      headers.Vary = "Origin";
    }
  }

  if (options.extraHeaders) {
    Object.assign(headers, options.extraHeaders);
  }

  return headers;
}

export function rejectDisallowedOrigin(request: RequestLike): Response | null {
  if (isCorsOriginAllowed(request)) return null;

  const headers = new Headers(buildCorsHeaders(request));
  headers.set("Content-Type", "application/json");

  return new Response(JSON.stringify({ error: "Origin not allowed" }), {
    status: 403,
    headers,
  });
}

function isLiteralIPv4(hostname: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
}

function parseIPv4(hostname: string): number | null {
  if (!isLiteralIPv4(hostname)) return null;

  const parts = hostname.split(".").map((item) => Number(item));
  if (parts.length !== 4) return null;
  if (parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null;
  }

  return parts[0] * 256 ** 3 + parts[1] * 256 ** 2 + parts[2] * 256 + parts[3];
}

function isPrivateIPv4(hostname: string): boolean {
  const numeric = parseIPv4(hostname);
  if (numeric === null) return false;

  // 覆盖常见私网、环回、链路本地、保留网段。
  const ranges: Array<[number, number]> = [
    [0x00000000, 0x00ffffff], // 0.0.0.0/8
    [0x0a000000, 0x0affffff], // 10.0.0.0/8
    [0x64400000, 0x647fffff], // 100.64.0.0/10
    [0x7f000000, 0x7fffffff], // 127.0.0.0/8
    [0xa9fe0000, 0xa9feffff], // 169.254.0.0/16
    [0xac100000, 0xac1fffff], // 172.16.0.0/12
    [0xc0a80000, 0xc0a8ffff], // 192.168.0.0/16
  ];

  return ranges.some(([start, end]) => numeric >= start && numeric <= end);
}

function isPrivateIPv6(hostname: string): boolean {
  const normalized = hostname
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .toLowerCase();

  if (!normalized.includes(":")) return false;
  if (normalized === "::1" || normalized === "::") return true;

  // IPv4-mapped IPv6，例如 ::ffff:127.0.0.1
  const mapped = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1] && isPrivateIPv4(mapped[1])) return true;

  const firstChunk = normalized.split(":")[0] || "0";
  if (!/^[0-9a-f]{1,4}$/i.test(firstChunk)) return true;
  const first = parseInt(firstChunk, 16);

  // fc00::/7 = ULA；fe80::/10 = link-local
  if (first >= 0xfc00 && first <= 0xfdff) return true;
  if (first >= 0xfe80 && first <= 0xfebf) return true;

  return false;
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  if (normalized === "localhost" || normalized.endsWith(".localhost")) {
    return true;
  }
  if (normalized.endsWith(".local") || normalized.endsWith(".internal")) {
    return true;
  }
  if (isPrivateIPv4(normalized) || isPrivateIPv6(normalized)) {
    return true;
  }

  return false;
}

export type ProviderBaseUrlValidationResult =
  | { valid: true; normalizedBaseUrl: string }
  | { valid: false; message: string };

export function validateProviderBaseUrl(
  baseUrl: string,
): ProviderBaseUrlValidationResult {
  const raw = baseUrl.trim();
  if (!raw) {
    return { valid: false, message: "Base URL 不能为空" };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { valid: false, message: "Base URL 格式无效" };
  }

  if (url.protocol !== "https:") {
    return { valid: false, message: "仅支持 https 协议的 Base URL" };
  }

  if (url.username || url.password) {
    return { valid: false, message: "Base URL 不应包含用户名或密码" };
  }

  if (url.search || url.hash) {
    return { valid: false, message: "Base URL 不应包含 query 或 hash" };
  }

  if (!url.hostname || isBlockedHostname(url.hostname)) {
    return { valid: false, message: "不允许使用内网或本地地址作为 Base URL" };
  }

  return { valid: true, normalizedBaseUrl: url.toString() };
}

export function normalizeChatCompletionsEndpoint(baseUrl: string): string {
  let endpoint = baseUrl.trim();
  if (endpoint.endsWith("/")) {
    endpoint = endpoint.slice(0, -1);
  }

  // 支持两种输入：
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
