import { afterEach, describe, expect, it } from "vitest";
import {
  buildCorsHeaders,
  rejectDisallowedOrigin,
  validateProviderBaseUrl,
} from "../../api/_utils";

type RuntimeProcess = {
  env: Record<string, string | undefined>;
};

const runtime = globalThis as typeof globalThis & {
  process?: RuntimeProcess;
};
const env = runtime.process?.env;

if (!env) {
  throw new Error("process.env is required for api-utils tests");
}

const originalNodeEnv = env.NODE_ENV;
const originalVercelEnv = env.VERCEL_ENV;
const originalAllowedOrigins = env.ALLOWED_ORIGINS;

afterEach(() => {
  env.NODE_ENV = originalNodeEnv;
  env.VERCEL_ENV = originalVercelEnv;
  env.ALLOWED_ORIGINS = originalAllowedOrigins;
});

describe("validateProviderBaseUrl", () => {
  it("accepts public https provider url", () => {
    const result = validateProviderBaseUrl("https://api.openai.com/v1");
    expect(result.valid).toBe(true);
  });

  it("rejects non-https urls", () => {
    const result = validateProviderBaseUrl("http://api.openai.com/v1");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toContain("https");
    }
  });

  it("rejects localhost/private network hosts", () => {
    expect(validateProviderBaseUrl("https://localhost:3000").valid).toBe(false);
    expect(validateProviderBaseUrl("https://127.0.0.1:11434").valid).toBe(
      false,
    );
    expect(validateProviderBaseUrl("https://192.168.1.2/v1").valid).toBe(false);
    expect(validateProviderBaseUrl("https://[::1]/v1").valid).toBe(false);
  });

  it("rejects query/hash in base url", () => {
    expect(validateProviderBaseUrl("https://api.openai.com/v1?x=1").valid).toBe(
      false,
    );
    expect(
      validateProviderBaseUrl("https://api.openai.com/v1#frag").valid,
    ).toBe(false);
  });
});

describe("cors policy", () => {
  it("allows same-origin requests in production without whitelist", () => {
    env.NODE_ENV = "production";
    env.VERCEL_ENV = "production";
    env.ALLOWED_ORIGINS = "";

    const req = new Request("https://app.example.com/api/ai-search", {
      method: "POST",
      headers: { origin: "https://app.example.com" },
    });

    expect(rejectDisallowedOrigin(req)).toBeNull();
    expect(buildCorsHeaders(req)["Access-Control-Allow-Origin"]).toBe(
      "https://app.example.com",
    );
  });

  it("blocks cross-origin requests in production when whitelist is missing", () => {
    env.NODE_ENV = "production";
    env.VERCEL_ENV = "production";
    env.ALLOWED_ORIGINS = "";

    const req = new Request("https://app.example.com/api/ai-search", {
      method: "POST",
      headers: { origin: "https://evil.example.com" },
    });

    const blocked = rejectDisallowedOrigin(req);
    expect(blocked?.status).toBe(403);
  });

  it("allows configured cross-origin requests", () => {
    env.NODE_ENV = "production";
    env.VERCEL_ENV = "production";
    env.ALLOWED_ORIGINS = "https://console.example.com";

    const req = new Request("https://app.example.com/api/ai-search", {
      method: "POST",
      headers: { origin: "https://console.example.com" },
    });

    expect(rejectDisallowedOrigin(req)).toBeNull();
    expect(buildCorsHeaders(req)["Access-Control-Allow-Origin"]).toBe(
      "https://console.example.com",
    );
  });

  it("keeps development-mode wildcard fallback when whitelist is empty", () => {
    env.NODE_ENV = "development";
    env.VERCEL_ENV = "development";
    env.ALLOWED_ORIGINS = "";

    const req = new Request("https://app.example.com/api/ai-search", {
      method: "POST",
      headers: { origin: "https://preview.example.com" },
    });

    expect(rejectDisallowedOrigin(req)).toBeNull();
    expect(buildCorsHeaders(req)["Access-Control-Allow-Origin"]).toBe("*");
  });
});
