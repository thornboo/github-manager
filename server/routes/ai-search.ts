import type { Request, Response as ExpressResponse } from "express";
import type {
  OpenAIResponse,
  ProviderConfig,
  SearchRepoInput,
} from "../types.js";
import { AI_SEARCH_SYSTEM_PROMPT } from "../prompts/ai-search.js";
import {
  normalizeChatCompletionsEndpoint,
  safeJsonParse,
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

  const reposInfo = repos
    .map((repo) => {
      const parts: string[] = [`[ID: ${repo.id}] ${repo.full_name}`];
      if (repo.description) parts.push(`描述: ${repo.description}`);
      if (repo.language) parts.push(`语言: ${repo.language}`);
      if (repo.topics.length > 0)
        parts.push(`Topics: ${repo.topics.join(", ")}`);
      if (repo.localTags.length > 0) {
        parts.push(`用户标签: ${repo.localTags.join(", ")}`);
      }
      if (repo.note) parts.push(`用户备注: ${repo.note}`);
      if (repo.lists.length > 0)
        parts.push(`所属列表: ${repo.lists.join(", ")}`);
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
        { role: "system", content: AI_SEARCH_SYSTEM_PROMPT },
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
    await safeReadText(response);
    res.status(500).json({ error: "AI 搜索服务出错" });
    return;
  }

  const aiResponse = (await safeReadJson<unknown>(
    response,
  )) as OpenAIResponse | null;

  const toolCall = aiResponse?.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall && toolCall.function?.name === "return_search_results") {
    const result = safeJsonParse(toolCall.function.arguments || "{}");
    if (result) {
      res.json(result);
      return;
    }
  }

  const content = aiResponse?.choices?.[0]?.message?.content;
  if (typeof content === "string" && content) {
    const jsonMatch = content.match(/\{[\s\S]*"matches"[\s\S]*\}/);
    if (jsonMatch) {
      const result = safeJsonParse(jsonMatch[0]);
      if (result) {
        res.json(result);
        return;
      }
    }
  }

  res.json({ matches: [] });
}
