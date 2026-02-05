import { getDefaultSystemPrompt } from '../src/lib/prompts';
import { json, normalizeChatCompletionsEndpoint, okCors, safeReadJson, safeReadText } from './_utils';

export const config = { runtime: 'edge' };

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
  requestFormat: 'openai' | 'custom';
}

type AnalysisDepth = 'quick' | 'simple' | 'deep';

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

function getSystemPrompt(depth: AnalysisDepth, customSystemPrompt?: string, userPrompt?: string): string {
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
        case 'quick':
          return `${idPrefix} ${repo.full_name} [${repo.language || '未知语言'}]`;
        case 'simple':
          return `${idPrefix} ${repo.full_name}: ${repo.description || '无描述'} [语言: ${repo.language || '未知'}] [话题: ${
            repo.topics.join(', ') || '无'
          }]`;
        case 'deep':
          return `${idPrefix} ${repo.full_name}\n  描述: ${repo.description || '无描述'}\n  语言: ${
            repo.language || '未知'
          }\n  话题: ${repo.topics.join(', ') || '无'}`;
      }
    })
    .join('\n');
}

export default async function handler(req: Request): Promise<Response> {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return okCors();
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method Not Allowed' }, { status: 405 });
  }

  let body: AnalyzeRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    repos,
    existingLists,
    existingTags,
    provider,
    depth = 'simple',
    systemPrompt: customSystemPrompt,
    userPrompt: customUserPrompt,
  } = body;

  if (!provider?.baseUrl || !provider?.apiKey) {
    return json({ error: '请先配置 AI 服务商' }, { status: 400 });
  }

  if (!repos || repos.length === 0) {
    return json({ suggestions: [] });
  }

  const systemPrompt = getSystemPrompt(depth, customSystemPrompt, customUserPrompt);
  const reposInfo = formatRepoInfo(repos, depth);

  const listsInfo = (existingLists?.length || 0) > 0 ? existingLists.map((l) => l.name).join(', ') : '暂无 Lists';
  const tagsInfo = (existingTags?.length || 0) > 0 ? existingTags.map((t) => t.name).join(', ') : '暂无标签';

  const analysisPrompt = `请分析以下仓库并提供分类建议：\n\n仓库列表：\n${reposInfo}\n\n现有 Lists: ${listsInfo}\n\n现有标签: ${tagsInfo}\n\n请用 JSON 格式返回，包含 "suggestions" 数组。每个建议应包含：\n- repoId: 仓库的数字 ID（使用上面 [ID: xxx] 中的数字，这是必须精确使用的值）\n- recommendedLists: 建议添加到的 Lists 名称数组\n- suggestedTags: 建议的标签数组，每个标签包含 { name, color (十六进制), isNew (boolean) }\n- summary: 仓库的中文总结（50-100字），概括核心功能、技术特点和适用场景\n- reasoning: 分类理由的简要说明\n\n重要：repoId 必须使用仓库前面 [ID: xxx] 中显示的精确数字 ID，不要使用索引！`;

  const endpoint = normalizeChatCompletionsEndpoint(provider.baseUrl);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: provider.model || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: analysisPrompt },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'provide_suggestions',
            description: 'Provide categorization suggestions for repositories',
            parameters: {
              type: 'object',
              properties: {
                suggestions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      repoId: { type: 'number' },
                      recommendedLists: { type: 'array', items: { type: 'string' } },
                      suggestedTags: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            color: { type: 'string' },
                            isNew: { type: 'boolean' },
                          },
                          required: ['name', 'color', 'isNew'],
                          additionalProperties: false,
                        },
                      },
                      summary: { type: 'string', description: 'Chinese summary of the repository (50-100 chars)' },
                      reasoning: { type: 'string' },
                    },
                    required: ['repoId', 'recommendedLists', 'suggestedTags', 'summary', 'reasoning'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['suggestions'],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: 'provide_suggestions' } },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      return json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });
    }
    if (response.status === 402) {
      return json({ error: 'AI 服务额度不足，请充值' }, { status: 402 });
    }
    const errorText = await safeReadText(response);
    // 不透出上游的原始错误（可能包含敏感信息/实现细节）
    void errorText;
    return json({ error: 'AI 分析服务出错' }, { status: 500 });
  }

  const aiResponse = (await safeReadJson<unknown>(response)) as OpenAIResponse | null;

  // 优先解析 OpenAI function calling / tool calls
  const toolCall = aiResponse?.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall && toolCall.function?.name === 'provide_suggestions') {
    try {
      const suggestions = JSON.parse(toolCall.function.arguments);
      return json(suggestions);
    } catch {
      // ignore and try fallback
    }
  }

  // 兜底：从 message content 中提取 JSON
  const content = aiResponse?.choices?.[0]?.message?.content;
  if (typeof content === 'string' && content) {
    const jsonMatch = content.match(/\{[\s\S]*"suggestions"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return json(JSON.parse(jsonMatch[0]));
      } catch {
        // ignore
      }
    }
  }

  return json({ error: 'AI 返回格式错误，请尝试使用支持 Function Calling 的模型' }, { status: 500 });
}
