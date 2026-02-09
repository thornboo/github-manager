import type { Request, Response as ExpressResponse } from "express";
import type {
  OpenAIResponse,
  ProviderConfig,
  SearchRepoInput,
} from "../types.js";
import {
  normalizeChatCompletionsEndpoint,
  safeReadJson,
  safeReadText,
  validateProviderBaseUrl,
} from "../utils/index.js";

interface SearchRequest {
  query: string;
  repos: SearchRepoInput[];
  provider: ProviderConfig;
}

export default async function aiSearch(
  req: Request,
  res: ExpressResponse,
): Promise<void> {
  const body = req.body as SearchRequest | undefined;
  if (!body || typeof body !== "object") {
    res.status(400).json({ matches: [], error: "Invalid JSON" });
    return;
  }

  const { query, repos, provider } = body;

  if (!provider?.baseUrl || !provider?.apiKey) {
    res.status(400).json({ error: "请先配置 AI 服务商" });
    return;
  }

  const baseUrlValidation = validateProviderBaseUrl(provider.baseUrl);
  if (baseUrlValidation.valid === false) {
    res.status(400).json({ error: baseUrlValidation.message });
    return;
  }

  if (!query?.trim() || !repos || repos.length === 0) {
    res.json({ matches: [] });
    return;
  }

  const systemPrompt = `你是一个智能的 GitHub 仓库搜索助手。用户会给你一个搜索查询和一组仓库信息，你需要理解用户的搜索意图并找出最匹配的仓库。\n\n搜索能力：\n1. 语义理解：理解用户查询的真实意图，不仅仅是关键词匹配\n2. 多维度匹配：综合考虑仓库名称、描述、编程语言、GitHub Topics、用户标签、用户备注\n3. 模糊匹配：处理同义词、相关概念（如"图表库"能匹配到 chart, visualization, d3 等）\n4. 用户上下文：用户标签和备注代表用户对仓库的个人理解，应给予较高权重\n\n匹配示例：\n- 查询"数据可视化工具" → 匹配描述包含 chart/graph/visualization 的仓库，或有相关 Topics\n- 查询"我标记过的 React 状态管理" → 查找用户标签/备注中包含 React、state management 相关内容的仓库\n- 查询"Python 爬虫框架" → 匹配语言为 Python 且 Topics/描述涉及 spider/crawler/scraping 的仓库\n\n返回规则：\n- 只返回确实相关的仓库，不要强行匹配\n- relevance 分三级：high（高度相关）、medium（中等相关）、low（弱相关）\n- reason 简要说明匹配原因（1句话）\n- 按相关度从高到低排序`;

  const reposInfo = repos
    .map((repo) => {
      const parts: string[] = [`[ID: ${repo.id}] ${repo.full_name}`];
      if (repo.description) parts.push(`描述: ${repo.description}`);
      if (repo.language) parts.push(`语言: ${repo.language}`);
      if (repo.topics.length > 0) parts.push(`Topics: ${repo.topics.join(", ")}`);
      if (repo.localTags.length > 0) {
        parts.push(`用户标签: ${repo.localTags.join(", ")}`);
      }
      if (repo.note) parts.push(`用户备注: ${repo.note}`);
      if (repo.lists.length > 0) parts.push(`所属列表: ${repo.lists.join(", ")}`);
      return parts.join(" | ");
    })
    .join("\n");

  const userPrompt = `搜索查询: "${query}"\n\n仓库列表：\n${reposInfo}\n\n请找出与查询相关的仓库，返回 JSON 格式的匹配结果。`;

  const endpoint = normalizeChatCompletionsEndpoint(
    baseUrlValidation.normalizedBaseUrl,
  );

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: provider.model || "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_search_results",
            description: "Return the search results with matching repositories",
            parameters: {
              type: "object",
              properties: {
                matches: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      repoId: {
                        type: "number",
                        description: "The repository ID from [ID: xxx]",
                      },
                      relevance: {
                        type: "string",
                        enum: ["high", "medium", "low"],
                      },
                      reason: {
                        type: "string",
                        description:
                          "Brief explanation of why this repo matches",
                      },
                    },
                    required: ["repoId", "relevance", "reason"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["matches"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: {
        type: "function",
        function: { name: "return_search_results" },
      },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      res.status(429).json({ error: "请求过于频繁，请稍后再试" });
      return;
    }
    if (response.status === 402) {
      res.status(402).json({ error: "AI 服务额度不足" });
      return;
    }
    const errorText = await safeReadText(response);
    void errorText;
    res.status(500).json({ error: "AI 搜索服务出错" });
    return;
  }

  const aiResponse = (await safeReadJson<unknown>(response)) as
    | OpenAIResponse
    | null;

  const toolCall = aiResponse?.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall && toolCall.function?.name === "return_search_results") {
    try {
      const result = JSON.parse(toolCall.function.arguments || "{}");
      res.json(result);
      return;
    } catch {
      // ignore and try fallback
    }
  }

  const content = aiResponse?.choices?.[0]?.message?.content;
  if (typeof content === "string" && content) {
    const jsonMatch = content.match(/\{[\s\S]*"matches"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[0]);
        res.json(result);
        return;
      } catch {
        // ignore
      }
    }
  }

  res.json({ matches: [] });
}
