import {
  isRecord,
  json,
  normalizeChatCompletionsEndpoint,
  okCors,
  safeJsonParse,
  safeReadJson,
  safeReadText,
  validateProviderBaseUrl,
} from "./_utils";

export const config = { runtime: "edge" };

interface TestRequest {
  baseUrl: string;
  apiKey: string;
  model: string;
  requestFormat: "openai" | "custom";
}

export default async function handler(req: Request): Promise<Response> {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return okCors(req);
  }

  if (req.method !== "POST") {
    return json(
      { success: false, error: "Method Not Allowed" },
      { status: 405 },
      req,
    );
  }

  let body: TestRequest;
  try {
    body = await req.json();
  } catch {
    return json(
      { success: false, error: "Invalid JSON" },
      { status: 400 },
      req,
    );
  }

  const { baseUrl, apiKey, model } = body;

  if (!baseUrl || !apiKey) {
    return json(
      { success: false, error: "缺少 Base URL 或 API Key" },
      { status: 400 },
      req,
    );
  }

  const baseUrlValidation = validateProviderBaseUrl(baseUrl);
  if (baseUrlValidation.valid === false) {
    return json(
      { success: false, error: baseUrlValidation.message },
      { status: 400 },
      req,
    );
  }

  const endpoint = normalizeChatCompletionsEndpoint(
    baseUrlValidation.normalizedBaseUrl,
  );

  const testPayload = {
    model: model || "gpt-3.5-turbo",
    messages: [{ role: "user", content: "Hi" }],
    max_tokens: 5,
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    });

    if (!response.ok) {
      const errorText = await safeReadText(response);
      let errorMessage = "连接失败";

      const parsed = safeJsonParse(errorText);
      if (isRecord(parsed)) {
        const errorObj = parsed.error;
        const msgFromError =
          isRecord(errorObj) && typeof errorObj.message === "string"
            ? errorObj.message
            : undefined;
        const msgFromRoot =
          typeof parsed.message === "string" ? parsed.message : undefined;
        errorMessage = msgFromError || msgFromRoot || errorText || errorMessage;
      } else {
        errorMessage = errorText || `HTTP ${response.status}`;
      }

      if (response.status === 401) {
        errorMessage = "API Key 无效或已过期";
      } else if (response.status === 404) {
        errorMessage = "端点不存在，请检查 Base URL";
      } else if (response.status === 429) {
        // Rate limit 表示连通性没问题
        return json({ success: true }, {}, req);
      }

      return json({ success: false, error: errorMessage }, {}, req);
    }

    const data = await safeReadJson<unknown>(response);
    const modelName =
      isRecord(data) && typeof data.model === "string" ? data.model : undefined;
    return json({ success: true, model: modelName }, {}, req);
  } catch (error) {
    let errorMessage = "连接失败";
    if (error instanceof Error) {
      errorMessage = error.message.includes("fetch")
        ? "无法连接到服务器，请检查 URL"
        : error.message;
    }
    return json({ success: false, error: errorMessage }, { status: 500 }, req);
  }
}
