import { getDefaultSystemPrompt } from "../src/lib/prompts";
import {
  buildCorsHeaders,
  normalizeChatCompletionsEndpoint,
  rejectDisallowedOrigin,
  safeReadJson,
  safeReadText,
  validateProviderBaseUrl,
} from "./_utils";

export const config = { runtime: "edge" };

interface RepoInput {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  topics: string[];
}

interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  requestFormat: "openai" | "custom";
}

type AnalysisDepth = "quick" | "simple" | "deep";

type OpenAIToolCall = {
  function?: { name?: string; arguments?: string };
};

type OpenAIResponse = {
  choices?: Array<{
    message?: {
      tool_calls?: OpenAIToolCall[];
      content?: string;
    };
  }>;
};

interface StreamRequest {
  repos: RepoInput[];
  existingLists: Array<{ id: string; name: string }>;
  existingTags: Array<{ id: string; name: string }>;
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

const SSE_BASE_HEADERS: Record<string, string> = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  // 禁用中间层缓冲（部分代理/网关会缓冲流式响应）
  "X-Accel-Buffering": "no",
};

function buildSSEHeaders(request: Request): Record<string, string> {
  return buildCorsHeaders(request, {
    allowHeaders: "content-type",
    allowMethods: "POST, OPTIONS",
    extraHeaders: SSE_BASE_HEADERS,
  });
}

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

function sendEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  event: string,
  data: unknown,
): void {
  const encoder = new TextEncoder();
  controller.enqueue(
    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
  );
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
  existingLists: Array<{ id: string; name: string }>,
  existingTags: Array<{ id: string; name: string }>,
  depth: AnalysisDepth,
): string {
  const listsInfo =
    (existingLists?.length || 0) > 0
      ? existingLists.map((l) => l.name).join(", ")
      : "暂无 Lists";
  const tagsInfo =
    (existingTags?.length || 0) > 0
      ? existingTags.map((t) => t.name).join(", ")
      : "暂无标签";

  return `请分析这个仓库并提供分类建议：\n\n仓库信息：\n${formatSingleRepoInfo(
    repo,
    depth,
  )}\n\n现有 Lists: ${listsInfo}\n\n现有标签: ${tagsInfo}\n\n请用 JSON 格式返回，包含字段：\n- repoId: 仓库的数字 ID（必须精确使用上面 [ID: xxx] 中的数字）\n- recommendedLists: 建议添加到的 Lists 名称数组\n- suggestedTags: 建议的标签数组，每个标签包含 { name, color (十六进制), isNew (boolean) }\n- summary: 仓库的中文总结（50-100字），概括核心功能、技术特点和适用场景\n- reasoning: 分类理由的简要说明\n\n重要：repoId 必须使用 [ID: ${repo.id}] 中的精确数字 ID，不要使用索引！`;
}

function getUpstreamTimeoutMs(depth: AnalysisDepth): number {
  // 单仓库分析的超时保护：避免上游卡住导致流挂死
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
  // 优先解析 OpenAI function calling / tool calls
  const toolCall = aiResponse?.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall && toolCall.function?.name === "provide_suggestion") {
    const parsed = JSON.parse(toolCall.function.arguments || "{}") as {
      suggestion?: SuggestionPayload;
    };
    if (parsed?.suggestion) return parsed.suggestion;
  }

  // 兜底：从 message content 中提取 JSON
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

  let response: Response;
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
        // 达到最大重试次数后，部分“全局性错误”直接终止本次流，避免刷屏。
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

export default async function handler(req: Request): Promise<Response> {
  const blocked = rejectDisallowedOrigin(req);
  if (blocked) return blocked;

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: buildSSEHeaders(req) });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: buildSSEHeaders(req),
    });
  }

  let body: StreamRequest;
  try {
    body = (await req.json()) as StreamRequest;
  } catch {
    return new Response("Invalid JSON", {
      status: 400,
      headers: buildSSEHeaders(req),
    });
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
    return new Response("Missing provider config", {
      status: 400,
      headers: buildSSEHeaders(req),
    });
  }

  const baseUrlValidation = validateProviderBaseUrl(provider.baseUrl);
  if (baseUrlValidation.valid === false) {
    return new Response(baseUrlValidation.message, {
      status: 400,
      headers: buildSSEHeaders(req),
    });
  }

  if (!repos || repos.length === 0) {
    return new Response("No repos to analyze", {
      status: 400,
      headers: buildSSEHeaders(req),
    });
  }

  const normalizedProvider: ProviderConfig = {
    ...provider,
    baseUrl: baseUrlValidation.normalizedBaseUrl,
  };

  const systemPrompt = getSystemPrompt(depth, customSystemPrompt, userPrompt);

  // 用于同时响应：客户端断开/取消 + 单仓库超时
  const requestAbortController = new AbortController();
  const onReqAbort = () => requestAbortController.abort();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let processed = 0;
      let errors = 0;

      req.signal.addEventListener("abort", onReqAbort);

      try {
        for (let idx = 0; idx < repos.length; idx += 1) {
          if (requestAbortController.signal.aborted) break;

          const repo = repos[idx];
          if (!repo) continue;

          sendEvent(controller, "progress", {
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

            sendEvent(controller, "result", {
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
            sendEvent(controller, "error", {
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

        sendEvent(controller, "complete", {
          type: "complete",
          success: errors === 0,
          totalProcessed: processed,
          totalErrors: errors,
        });
      } catch (error) {
        if (!isAbortError(error)) {
          sendEvent(controller, "error", {
            type: "error",
            message: error instanceof Error ? error.message : "Stream error",
            recoverable: false,
          });
        }
      } finally {
        req.signal.removeEventListener("abort", onReqAbort);
        controller.close();
      }
    },
    cancel() {
      requestAbortController.abort();
    },
  });

  return new Response(stream, { headers: buildSSEHeaders(req) });
}
