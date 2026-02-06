import { getDefaultSystemPrompt } from "../src/lib/prompts";
import {
  json,
  normalizeChatCompletionsEndpoint,
  okCors,
  safeReadJson,
  safeReadText,
} from "./_utils";

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

interface AnalyzeRequest {
  repos: RepoInput[];
  existingLists: Array<{ id: string; name: string }>;
  existingTags: Array<{ id: string; name: string }>;
  provider: ProviderConfig;
  depth?: AnalysisDepth;
  systemPrompt?: string;
  userPrompt?: string;
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

function formatRepoInfo(repos: RepoInput[], depth: AnalysisDepth): string {
  return repos
    .map((repo) => {
      const idPrefix = `[ID: ${repo.id}]`;
      switch (depth) {
        case "quick":
          return `${idPrefix} ${repo.full_name} [${repo.language || "未知语言"}]`;
        case "simple":
          return `${idPrefix} ${repo.full_name}: ${repo.description || "无描述"} [语言: ${repo.language || "未知"}] [话题: ${
            repo.topics.join(", ") || "无"
          }]`;
        case "deep":
          return `${idPrefix} ${repo.full_name}\n  描述: ${repo.description || "无描述"}\n  语言: ${
            repo.language || "未知"
          }\n  话题: ${repo.topics.join(", ") || "无"}`;
      }
    })
    .join("\n");
}

function getUpstreamTimeoutMs(depth: AnalysisDepth): number {
  // Vercel Edge Functions 有 25s 的“首字节”限制，且不适合做长耗时批量 AI 分析。
  // 这里改为 Node.js Functions 后，仍然对上游请求做超时保护，避免卡住直到平台硬超时。
  switch (depth) {
    case "deep":
      return 90_000;
    case "simple":
      return 60_000;
    case "quick":
      return 40_000;
  }
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || /aborted/i.test(error.message))
  );
}

function getRequestId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function OPTIONS(): Response {
  return okCors();
}

export async function POST(req: Request): Promise<Response> {
  let body: AnalyzeRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    repos,
    existingLists,
    existingTags,
    provider,
    depth = "simple",
    systemPrompt: customSystemPrompt,
    userPrompt: customUserPrompt,
  } = body;

  if (!provider?.baseUrl || !provider?.apiKey) {
    return json({ error: "请先配置 AI 服务商" }, { status: 400 });
  }

  if (!repos || repos.length === 0) {
    return json({ suggestions: [] });
  }

  const systemPrompt = getSystemPrompt(
    depth,
    customSystemPrompt,
    customUserPrompt,
  );
  const reposInfo = formatRepoInfo(repos, depth);

  const listsInfo =
    (existingLists?.length || 0) > 0
      ? existingLists.map((l) => l.name).join(", ")
      : "暂无 Lists";
  const tagsInfo =
    (existingTags?.length || 0) > 0
      ? existingTags.map((t) => t.name).join(", ")
      : "暂无标签";

  const analysisPrompt = `请分析以下仓库并提供分类建议：\n\n仓库列表：\n${reposInfo}\n\n现有 Lists: ${listsInfo}\n\n现有标签: ${tagsInfo}\n\n请用 JSON 格式返回，包含 "suggestions" 数组。每个建议应包含：\n- repoId: 仓库的数字 ID（使用上面 [ID: xxx] 中的数字，这是必须精确使用的值）\n- recommendedLists: 建议添加到的 Lists 名称数组\n- suggestedTags: 建议的标签数组，每个标签包含 { name, color (十六进制), isNew (boolean) }\n- summary: 仓库的中文总结（50-100字），概括核心功能、技术特点和适用场景\n- reasoning: 分类理由的简要说明\n\n重要：repoId 必须使用仓库前面 [ID: xxx] 中显示的精确数字 ID，不要使用索引！`;

  const endpoint = normalizeChatCompletionsEndpoint(provider.baseUrl);
  const requestId = getRequestId();
  const startedAt = Date.now();
  const upstreamTimeoutMs = getUpstreamTimeoutMs(depth);

  console.log("[analyze-repos] start", {
    requestId,
    repoCount: repos.length,
    depth,
    model: provider.model || "gpt-3.5-turbo",
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), upstreamTimeoutMs);

  let response: Response;
  let upstreamDurationMs = 0;
  try {
    const upstreamStartedAt = Date.now();
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: provider.model || "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: analysisPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_suggestions",
              description:
                "Provide categorization suggestions for repositories",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
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
                        summary: {
                          type: "string",
                          description:
                            "Chinese summary of the repository (50-100 chars)",
                        },
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
                },
                required: ["suggestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "provide_suggestions" },
        },
      }),
    });
    upstreamDurationMs = Date.now() - upstreamStartedAt;
  } catch (error) {
    upstreamDurationMs = Date.now() - startedAt;
    if (isAbortError(error)) {
      console.warn("[analyze-repos] upstream timeout", {
        requestId,
        repoCount: repos.length,
        depth,
        upstreamTimeoutMs,
        upstreamDurationMs,
      });
      return json(
        {
          error: `AI 请求超时（>${Math.round(upstreamTimeoutMs / 1000)}s）。建议降低“批量分析”的单次数量、选择更快的模型，或把分析深度改为 quick/simple。`,
        },
        { status: 504 },
      );
    }

    console.error("[analyze-repos] upstream fetch failed", {
      requestId,
      error,
    });
    return json(
      { error: "无法连接到 AI 服务，请检查 Base URL 或稍后重试" },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    if (response.status === 429) {
      return json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
    }
    if (response.status === 402) {
      return json({ error: "AI 服务额度不足，请充值" }, { status: 402 });
    }
    if (response.status === 401) {
      return json({ error: "AI API Key 无效或已过期" }, { status: 401 });
    }
    if (response.status === 404) {
      return json({ error: "AI 端点不存在，请检查 Base URL" }, { status: 404 });
    }
    const errorText = await safeReadText(response);
    // 不透出上游的原始错误（可能包含敏感信息/实现细节）
    void errorText;
    return json({ error: "AI 分析服务出错" }, { status: 500 });
  }

  const aiResponse = (await safeReadJson<unknown>(
    response,
  )) as OpenAIResponse | null;
  console.log("[analyze-repos] upstream ok", {
    requestId,
    upstreamDurationMs,
    totalDurationMs: Date.now() - startedAt,
  });

  // 优先解析 OpenAI function calling / tool calls
  const toolCall = aiResponse?.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall && toolCall.function?.name === "provide_suggestions") {
    try {
      const suggestions = JSON.parse(toolCall.function.arguments);
      return json(suggestions);
    } catch {
      // ignore and try fallback
    }
  }

  // 兜底：从 message content 中提取 JSON
  const content = aiResponse?.choices?.[0]?.message?.content;
  if (typeof content === "string" && content) {
    const jsonMatch = content.match(/\{[\s\S]*"suggestions"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return json(JSON.parse(jsonMatch[0]));
      } catch {
        // ignore
      }
    }
  }

  return json(
    { error: "AI 返回格式错误，请尝试使用支持 Function Calling 的模型" },
    { status: 500 },
  );
}
