import type { Request, Response as ExpressResponse } from "express";
import type {
  AnalysisDepth,
  NamedItem,
  OpenAIResponse,
  ProviderConfig,
  RepoInput,
} from "../types.js";
import {
  normalizeChatCompletionsEndpoint,
  safeReadJson,
  safeReadText,
  validateProviderBaseUrl,
} from "../utils/index.js";
import {
  buildSingleRepoAnalysisPrompt,
  getDefaultSystemPrompt,
} from "../prompts/analysis.js";

interface StreamRequest {
  repos: RepoInput[];
  existingLists: NamedItem[];
  existingTags: NamedItem[];
  provider: ProviderConfig;
  depth?: AnalysisDepth;
  systemPrompt?: string;
  userPrompt?: string;
}

type SuggestionPayload = {
  repoId: number;
  recommendedLists: string[];
  suggestedTags: Array<{ name: string; color: string; isNew: boolean }>;
  summary: string;
  reasoning: string;
};

class StreamAnalysisError extends Error {
  recoverable: boolean;
  status?: number;

  constructor(
    message: string,
    options: { recoverable: boolean; status?: number },
  ) {
    super(message);
    this.name = "StreamAnalysisError";
    this.recoverable = options.recoverable;
    this.status = options.status;
  }
}

function sendEvent(res: ExpressResponse, event: string, data: unknown): void {
  if (res.writableEnded || res.destroyed) return;
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function getSystemPrompt(
  depth: AnalysisDepth,
  customSystemPrompt?: string,
  userPrompt?: string,
): string {
  let finalPrompt = customSystemPrompt?.trim() || getDefaultSystemPrompt(depth);
  if (userPrompt && userPrompt.trim()) {
    finalPrompt += `\n\n【用户指令】\n${userPrompt.trim()}`;
  }
  return finalPrompt;
}

function formatSingleRepoInfo(repo: RepoInput, depth: AnalysisDepth): string {
  const idPrefix = `[ID: ${repo.id}]`;
  switch (depth) {
    case "quick":
      return `${idPrefix} ${repo.full_name} [${repo.language || "未知语言"}]`;
    case "simple":
      return `${idPrefix} ${repo.full_name}: ${repo.description || "无描述"} [语言: ${repo.language || "未知"}] [话题: ${repo.topics.join(", ") || "无"}]`;
    case "deep":
      return `${idPrefix} ${repo.full_name}\n  描述: ${repo.description || "无描述"}\n  语言: ${
        repo.language || "未知"
      }\n  话题: ${repo.topics.join(", ") || "无"}`;
  }
}

function buildSingleRepoPrompt(
  repo: RepoInput,
  existingLists: NamedItem[],
  existingTags: NamedItem[],
  depth: AnalysisDepth,
): string {
  const listsInfo =
    (existingLists?.length || 0) > 0
      ? existingLists.map((item) => item.name).join(", ")
      : "暂无 Lists";
  const tagsInfo =
    (existingTags?.length || 0) > 0
      ? existingTags.map((item) => item.name).join(", ")
      : "暂无标签";

  return buildSingleRepoAnalysisPrompt({
    repoInfo: formatSingleRepoInfo(repo, depth),
    listsInfo,
    tagsInfo,
    repoId: repo.id,
  });
}

function getUpstreamTimeoutMs(depth: AnalysisDepth): number {
  switch (depth) {
    case "deep":
      return 60_000;
    case "simple":
      return 40_000;
    case "quick":
      return 30_000;
  }
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || /aborted/i.test(error.message))
  );
}

function createAbortError(message = "Aborted"): Error {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

function getRetryDelayMs(attempt: number): number {
  const base = 500;
  const max = 4_000;
  const delay = Math.min(base * 2 ** attempt, max);
  const jitter = Math.floor(Math.random() * 250);
  return delay + jitter;
}

async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return;
  if (signal?.aborted) throw createAbortError();

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let id: ReturnType<typeof setTimeout> | null = null;

    const onAbort = () => {
      if (settled) return;
      settled = true;
      if (id) clearTimeout(id);
      signal?.removeEventListener("abort", onAbort);
      reject(createAbortError());
    };

    signal?.addEventListener("abort", onAbort);
    if (signal?.aborted) {
      onAbort();
      return;
    }

    id = setTimeout(() => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
  });
}

function parseSuggestion(aiResponse: OpenAIResponse | null): SuggestionPayload {
  const toolCall = aiResponse?.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall && toolCall.function?.name === "provide_suggestion") {
    const parsed = JSON.parse(toolCall.function.arguments || "{}") as {
      suggestion?: SuggestionPayload;
    };
    if (parsed?.suggestion) return parsed.suggestion;
  }

  const content = aiResponse?.choices?.[0]?.message?.content;
  if (typeof content === "string" && content) {
    const jsonMatch = content.match(/\{[\s\S]*"repoId"[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as SuggestionPayload;
    }
  }

  throw new Error("AI 返回格式错误，请尝试使用支持 Function Calling 的模型");
}

async function analyzeRepoOnce(
  repo: RepoInput,
  context: {
    provider: ProviderConfig;
    existingLists: StreamRequest["existingLists"];
    existingTags: StreamRequest["existingTags"];
    systemPrompt: string;
    depth: AnalysisDepth;
  },
  signal?: AbortSignal,
): Promise<SuggestionPayload> {
  const { provider, existingLists, existingTags, systemPrompt, depth } =
    context;

  if (provider.requestFormat === "custom") {
    throw new StreamAnalysisError("暂不支持自定义请求格式", {
      recoverable: false,
    });
  }

  const endpoint = normalizeChatCompletionsEndpoint(provider.baseUrl);
  const prompt = buildSingleRepoPrompt(
    repo,
    existingLists,
    existingTags,
    depth,
  );

  let response: globalThis.Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      signal,
      body: JSON.stringify({
        model: provider.model || "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_suggestion",
              description:
                "Provide categorization suggestion for one repository",
              parameters: {
                type: "object",
                properties: {
                  suggestion: {
                    type: "object",
                    properties: {
                      repoId: { type: "number" },
                      recommendedLists: {
                        type: "array",
                        items: { type: "string" },
                      },
                      suggestedTags: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            color: { type: "string" },
                            isNew: { type: "boolean" },
                          },
                          required: ["name", "color", "isNew"],
                          additionalProperties: false,
                        },
                      },
                      summary: { type: "string" },
                      reasoning: { type: "string" },
                    },
                    required: [
                      "repoId",
                      "recommendedLists",
                      "suggestedTags",
                      "summary",
                      "reasoning",
                    ],
                    additionalProperties: false,
                  },
                },
                required: ["suggestion"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "provide_suggestion" },
        },
      }),
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new StreamAnalysisError(
      "无法连接到 AI 服务，请检查 Base URL 或稍后重试",
      { recoverable: false },
    );
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new StreamAnalysisError("请求过于频繁，请稍后再试", {
        recoverable: true,
        status: 429,
      });
    }
    if (response.status === 402) {
      throw new StreamAnalysisError("AI 服务额度不足，请充值", {
        recoverable: false,
        status: 402,
      });
    }
    if (response.status === 401) {
      throw new StreamAnalysisError("AI API Key 无效或已过期", {
        recoverable: false,
        status: 401,
      });
    }
    if (response.status === 403) {
      throw new StreamAnalysisError("AI 服务权限不足", {
        recoverable: false,
        status: 403,
      });
    }
    if (response.status === 404) {
      throw new StreamAnalysisError("AI 端点不存在，请检查 Base URL", {
        recoverable: false,
        status: 404,
      });
    }
    const text = await safeReadText(response);
    void text;
    const recoverable =
      response.status === 408 ||
      response.status === 409 ||
      response.status >= 500;
    throw new StreamAnalysisError(`AI 服务出错（HTTP ${response.status}）`, {
      recoverable,
      status: response.status,
    });
  }

  const aiResponse = (await safeReadJson<unknown>(
    response,
  )) as OpenAIResponse | null;
  try {
    return parseSuggestion(aiResponse);
  } catch (error) {
    throw new StreamAnalysisError(
      error instanceof Error ? error.message : "AI 返回格式错误",
      { recoverable: false },
    );
  }
}

async function analyzeRepoWithRetry(
  repo: RepoInput,
  context: Parameters<typeof analyzeRepoOnce>[1],
  signal?: AbortSignal,
): Promise<SuggestionPayload> {
  const maxRetries = 2;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    if (signal?.aborted) throw createAbortError();

    const attemptController = new AbortController();
    const onAbort = () => attemptController.abort();
    signal?.addEventListener("abort", onAbort);
    if (signal?.aborted) {
      onAbort();
      throw createAbortError();
    }

    const timeoutMs = getUpstreamTimeoutMs(context.depth);
    const timeoutId = setTimeout(() => attemptController.abort(), timeoutMs);

    try {
      return await analyzeRepoOnce(repo, context, attemptController.signal);
    } catch (error) {
      if (isAbortError(error)) {
        if (signal?.aborted) throw error;
        lastError = new StreamAnalysisError(
          `AI 请求超时（>${Math.round(timeoutMs / 1000)}s）`,
          { recoverable: true },
        );
      } else {
        lastError = error;
      }

      const retryable =
        lastError instanceof StreamAnalysisError &&
        lastError.recoverable === true;
      const hasMoreAttempts = attempt < maxRetries;

      if (!retryable || !hasMoreAttempts) {
        if (
          lastError instanceof StreamAnalysisError &&
          (lastError.status === 429 ||
            (typeof lastError.status === "number" && lastError.status >= 500))
        ) {
          throw new StreamAnalysisError(lastError.message, {
            recoverable: false,
            status: lastError.status,
          });
        }

        throw lastError instanceof Error
          ? lastError
          : new StreamAnalysisError("AI 分析失败", { recoverable: true });
      }

      await sleep(getRetryDelayMs(attempt), signal);
    } finally {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onAbort);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new StreamAnalysisError("AI 分析失败", { recoverable: true });
}

function setSseHeaders(res: ExpressResponse): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
}

export default async function analyzeStream(
  req: Request,
  res: ExpressResponse,
): Promise<void> {
  const body = req.body as StreamRequest | undefined;
  if (!body || typeof body !== "object") {
    res.status(400).send("Invalid JSON");
    return;
  }

  const {
    repos,
    existingLists = [],
    existingTags = [],
    provider,
    depth = "simple",
    systemPrompt: customSystemPrompt,
    userPrompt,
  } = body;

  if (!provider?.baseUrl || !provider?.apiKey) {
    res.status(400).send("Missing provider config");
    return;
  }

  const baseUrlValidation = validateProviderBaseUrl(provider.baseUrl);
  if (baseUrlValidation.valid === false) {
    res.status(400).send(baseUrlValidation.message);
    return;
  }

  if (!repos || repos.length === 0) {
    res.status(400).send("No repos to analyze");
    return;
  }

  const normalizedProvider: ProviderConfig = {
    ...provider,
    baseUrl: baseUrlValidation.normalizedBaseUrl,
  };

  const systemPrompt = getSystemPrompt(depth, customSystemPrompt, userPrompt);

  setSseHeaders(res);
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  const requestAbortController = new AbortController();
  const onClientDisconnect = () => requestAbortController.abort();

  req.on("aborted", onClientDisconnect);
  res.on("close", onClientDisconnect);

  let processed = 0;
  let errors = 0;

  try {
    for (let idx = 0; idx < repos.length; idx += 1) {
      if (requestAbortController.signal.aborted) break;

      const repo = repos[idx];
      if (!repo) continue;

      sendEvent(res, "progress", {
        type: "progress",
        current: idx + 1,
        total: repos.length,
        repoId: repo.id,
        repoName: repo.full_name,
      });

      try {
        const suggestion = await analyzeRepoWithRetry(
          repo,
          {
            provider: normalizedProvider,
            existingLists,
            existingTags,
            systemPrompt,
            depth,
          },
          requestAbortController.signal,
        );

        if (suggestion.repoId !== repo.id) {
          throw new StreamAnalysisError(
            `AI 返回的 repoId 不匹配（期望 ${repo.id}，实际 ${suggestion.repoId}）`,
            { recoverable: true },
          );
        }

        sendEvent(res, "result", {
          type: "result",
          repoId: repo.id,
          repoName: repo.full_name,
          suggestion: {
            recommendedLists: suggestion.recommendedLists || [],
            suggestedTags: suggestion.suggestedTags || [],
            summary: suggestion.summary || "",
            reasoning: suggestion.reasoning || "",
          },
        });
        processed += 1;
      } catch (error) {
        if (requestAbortController.signal.aborted) break;

        errors += 1;
        const recoverable =
          error instanceof StreamAnalysisError ? error.recoverable : true;
        sendEvent(res, "error", {
          type: "error",
          repoId: repo.id,
          repoName: repo.full_name,
          message: error instanceof Error ? error.message : "Unknown error",
          recoverable,
        });

        if (!recoverable) {
          break;
        }
      }
    }

    sendEvent(res, "complete", {
      type: "complete",
      success: errors === 0,
      totalProcessed: processed,
      totalErrors: errors,
    });
  } catch (error) {
    if (!isAbortError(error)) {
      sendEvent(res, "error", {
        type: "error",
        message: error instanceof Error ? error.message : "Stream error",
        recoverable: false,
      });
    }
  } finally {
    req.off("aborted", onClientDisconnect);
    res.off("close", onClientDisconnect);
    if (!res.writableEnded) {
      res.end();
    }
  }
}
