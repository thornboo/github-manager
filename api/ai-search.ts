import { json, normalizeChatCompletionsEndpoint, okCors, safeReadJson, safeReadText } from './_utils';

export const config = { runtime: 'edge' };

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

interface RepoInput {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  topics: string[];
  localTags: string[];
  note: string | null;
  lists: string[];
}

interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  requestFormat: 'openai' | 'custom';
}

interface SearchRequest {
  query: string;
  repos: RepoInput[];
  provider: ProviderConfig;
}

export default async function handler(req: Request): Promise<Response> {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return okCors();
  }

  if (req.method !== 'POST') {
    return json({ matches: [], error: 'Method Not Allowed' }, { status: 405 });
  }

  let body: SearchRequest;
  try {
    body = await req.json();
  } catch {
    return json({ matches: [], error: 'Invalid JSON' }, { status: 400 });
  }

  const { query, repos, provider } = body;

  if (!provider?.baseUrl || !provider?.apiKey) {
    return json({ error: '请先配置 AI 服务商' }, { status: 400 });
  }

  if (!query?.trim() || !repos || repos.length === 0) {
    return json({ matches: [] });
  }

  const systemPrompt = `你是一个智能的 GitHub 仓库搜索助手。用户会给你一个搜索查询和一组仓库信息，你需要理解用户的搜索意图并找出最匹配的仓库。\n\n搜索能力：\n1. 语义理解：理解用户查询的真实意图，不仅仅是关键词匹配\n2. 多维度匹配：综合考虑仓库名称、描述、编程语言、GitHub Topics、用户标签、用户备注\n3. 模糊匹配：处理同义词、相关概念（如"图表库"能匹配到 chart, visualization, d3 等）\n4. 用户上下文：用户标签和备注代表用户对仓库的个人理解，应给予较高权重\n\n匹配示例：\n- 查询"数据可视化工具" → 匹配描述包含 chart/graph/visualization 的仓库，或有相关 Topics\n- 查询"我标记过的 React 状态管理" → 查找用户标签/备注中包含 React、state management 相关内容的仓库\n- 查询"Python 爬虫框架" → 匹配语言为 Python 且 Topics/描述涉及 spider/crawler/scraping 的仓库\n\n返回规则：\n- 只返回确实相关的仓库，不要强行匹配\n- relevance 分三级：high（高度相关）、medium（中等相关）、low（弱相关）\n- reason 简要说明匹配原因（1句话）\n- 按相关度从高到低排序`;

  const reposInfo = repos
    .map((repo) => {
      const parts: string[] = [`[ID: ${repo.id}] ${repo.full_name}`];
      if (repo.description) parts.push(`描述: ${repo.description}`);
      if (repo.language) parts.push(`语言: ${repo.language}`);
      if (repo.topics.length > 0) parts.push(`Topics: ${repo.topics.join(', ')}`);
      if (repo.localTags.length > 0) parts.push(`用户标签: ${repo.localTags.join(', ')}`);
      if (repo.note) parts.push(`用户备注: ${repo.note}`);
      if (repo.lists.length > 0) parts.push(`所属列表: ${repo.lists.join(', ')}`);
      return parts.join(' | ');
    })
    .join('\n');

  const userPrompt = `搜索查询: "${query}"\n\n仓库列表：\n${reposInfo}\n\n请找出与查询相关的仓库，返回 JSON 格式的匹配结果。`;

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
        { role: 'user', content: userPrompt },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'return_search_results',
            description: 'Return the search results with matching repositories',
            parameters: {
              type: 'object',
              properties: {
                matches: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      repoId: { type: 'number', description: 'The repository ID from [ID: xxx]' },
                      relevance: { type: 'string', enum: ['high', 'medium', 'low'] },
                      reason: { type: 'string', description: 'Brief explanation of why this repo matches' },
                    },
                    required: ['repoId', 'relevance', 'reason'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['matches'],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: 'return_search_results' } },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      return json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });
    }
    if (response.status === 402) {
      return json({ error: 'AI 服务额度不足' }, { status: 402 });
    }
    const errorText = await safeReadText(response);
    void errorText;
    return json({ error: 'AI 搜索服务出错' }, { status: 500 });
  }

  const aiResponse = (await safeReadJson<unknown>(response)) as OpenAIResponse | null;

  const toolCall = aiResponse?.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall && toolCall.function?.name === 'return_search_results') {
    try {
      const result = JSON.parse(toolCall.function.arguments);
      return json(result);
    } catch {
      // ignore and try fallback
    }
  }

  const content = aiResponse?.choices?.[0]?.message?.content;
  if (typeof content === 'string' && content) {
    const jsonMatch = content.match(/\{[\s\S]*"matches"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[0]);
        return json(result);
      } catch {
        // ignore
      }
    }
  }

  // 与 supabase 版保持一致：解析失败时返回空结果
  return json({ matches: [] });
}
