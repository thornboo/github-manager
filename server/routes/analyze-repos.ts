import type { Request, Response as ExpressResponse } from "express";
import { getDefaultSystemPrompt } from "../../src/lib/prompts.js";
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

interface AnalyzeRequest {
  repos: RepoInput[];
  existingLists: NamedItem[];
  existingTags: NamedItem[];
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
          return `${idPrefix} ${repo.full_name}: ${repo.description || "无描述"} [语言: ${repo.language || "未知"}] [话题: ${repo.topics.join(", ") || "无"}]`;
        case "deep":
          return `${idPrefix} ${repo.full_name}\n  描述: ${repo.description || "无描述"}\n  语言: ${
            repo.language || "未知"
          }\n  话题: ${repo.topics.join(", ") || "无"}`;
      }
    })
    .join("\n");
}

function getUpstreamTimeoutMs(depth: AnalysisDepth): number {
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

export default async function analyzeRepos(
  req: Request,
  res: ExpressResponse,
): Promise<void> {
  const body = req.body as AnalyzeRequest | undefined;

  if (!body || typeof body !== "object") {
    res.status(400).json({ error: "Invalid JSON" });
    return;
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
    res.status(400).json({ error: "请先配置 AI 服务商" });
    return;
  }

  const baseUrlValidation = validateProviderBaseUrl(provider.baseUrl);
  if (baseUrlValidation.valid === false) {
    res.status(400).json({ error: baseUrlValidation.message });
    return;
  }

  if (!repos || repos.length === 0) {
    res.json({ suggestions: [] });
    return;
  }

  const systemPrompt = getSystemPrompt(
    depth,
    customSystemPrompt,
    customUserPrompt,
  );
  const reposInfo = formatRepoInfo(repos, depth);

  const listsInfo =
    (existingLists?.length || 0) > 0
      ? existingLists.map((item) => item.name).join(", ")
      : "暂无 Lists";
  const tagsInfo =
    (existingTags?.length || 0) > 0
      ? existingTags.map((item) => item.name).join(", ")
      : "暂无标签";

  const analysisPrompt = `请分析以下仓库并提供分类建议：\n\n仓库列表：\n${reposInfo}\n\n现有 Lists: ${listsInfo}\n\n现有标签: ${tagsInfo}\n\n请用 JSON 格式返回，包含 "suggestions" 数组。每个建议应包含：\n- repoId: 仓库的数字 ID（使用上面 [ID: xxx] 中的数字，这是必须精确使用的值）\n- recommendedLists: 建议添加到的 Lists 名称数组\n- suggestedTags: 建议的标签数组，每个标签包含 { name, color (十六进制), isNew (boolean) }\n- summary: 仓库的中文总结（50-100字），概括核心功能、技术特点和适用场景\n- reasoning: 分类理由的简要说明\n\n重要：repoId 必须使用仓库前面 [ID: xxx] 中显示的精确数字 ID，不要使用索引！`;

  const endpoint = normalizeChatCompletionsEndpoint(
    baseUrlValidation.normalizedBaseUrl,
  );
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

  let response: globalThis.Response;
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
      res.status(504).json({
        error: `AI 请求超时（>${Math.round(upstreamTimeoutMs / 1000)}s）。建议降低“批量分析”的单次数量、选择更快的模型，或把分析深度改为 quick/simple。`,
      });
      return;
    }

    console.error("[analyze-repos] upstream fetch failed", {
      requestId,
      error,
    });
    res
      .status(502)
      .json({ error: "无法连接到 AI 服务，请检查 Base URL 或稍后重试" });
    return;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    if (response.status === 429) {
      res.status(429).json({ error: "请求过于频繁，请稍后再试" });
      return;
    }
    if (response.status === 402) {
      res.status(402).json({ error: "AI 服务额度不足，请充值" });
      return;
    }
    if (response.status === 401) {
      res.status(401).json({ error: "AI API Key 无效或已过期" });
      return;
    }
    if (response.status === 404) {
      res.status(404).json({ error: "AI 端点不存在，请检查 Base URL" });
      return;
    }
    const errorText = await safeReadText(response);
    void errorText;
    res.status(500).json({ error: "AI 分析服务出错" });
    return;
  }

  const aiResponse = (await safeReadJson<unknown>(
    response,
  )) as OpenAIResponse | null;
  console.log("[analyze-repos] upstream ok", {
    requestId,
    upstreamDurationMs,
    totalDurationMs: Date.now() - startedAt,
  });

  const toolCall = aiResponse?.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall && toolCall.function?.name === "provide_suggestions") {
    try {
      const suggestions = JSON.parse(toolCall.function.arguments || "{}");
      res.json(suggestions);
      return;
    } catch {
      // ignore and try fallback
    }
  }

  const content = aiResponse?.choices?.[0]?.message?.content;
  if (typeof content === "string" && content) {
    const jsonMatch = content.match(/\{[\s\S]*"suggestions"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        res.json(JSON.parse(jsonMatch[0]));
        return;
      } catch {
        // ignore
      }
    }
  }

  res
    .status(500)
    .json({ error: "AI 返回格式错误，请尝试使用支持 Function Calling 的模型" });
}
