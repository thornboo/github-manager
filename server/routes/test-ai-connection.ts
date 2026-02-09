import type { Request, Response as ExpressResponse } from "express";
import {
  isRecord,
  normalizeChatCompletionsEndpoint,
  safeJsonParse,
  safeReadJson,
  safeReadText,
  validateProviderBaseUrl,
} from "../utils/index.js";

interface TestRequest {
  baseUrl: string;
  apiKey: string;
  model: string;
  requestFormat: "openai" | "custom";
}

export default async function testAiConnection(
  req: Request,
  res: ExpressResponse,
): Promise<void> {
  const body = req.body as TestRequest | undefined;
  if (!body || typeof body !== "object") {
    res.status(400).json({ success: false, error: "Invalid JSON" });
    return;
  }

  const { baseUrl, apiKey, model } = body;

  if (!baseUrl || !apiKey) {
    res.status(400).json({ success: false, error: "缺少 Base URL 或 API Key" });
    return;
  }

  const baseUrlValidation = validateProviderBaseUrl(baseUrl);
  if (baseUrlValidation.valid === false) {
    res.status(400).json({ success: false, error: baseUrlValidation.message });
    return;
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
        res.json({ success: true });
        return;
      }

      res.json({ success: false, error: errorMessage });
      return;
    }

    const data = await safeReadJson<unknown>(response);
    const modelName =
      isRecord(data) && typeof data.model === "string" ? data.model : undefined;
    res.json({ success: true, model: modelName });
  } catch (error) {
    let errorMessage = "连接失败";
    if (error instanceof Error) {
      errorMessage = error.message.includes("fetch")
        ? "无法连接到服务器，请检查 URL"
        : error.message;
    }
    res.status(500).json({ success: false, error: errorMessage });
  }
}
