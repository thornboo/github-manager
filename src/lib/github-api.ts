import { GITHUB_GRAPHQL_URL, GITHUB_REST_BASE_URL } from "@/lib/constants";

interface GitHubGraphQLError {
  message?: string;
}

interface GitHubGraphQLResponse<T> {
  data?: T;
  errors?: GitHubGraphQLError[];
}

async function readGitHubErrorMessage(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    return data?.message || `HTTP ${res.status}`;
  }

  const text = await res.text().catch(() => "");
  return text || `HTTP ${res.status}`;
}

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public request: { url: string; method: string },
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

export class GitHubApiClient {
  private readonly restBaseUrl: string;

  constructor(
    private readonly token: string,
    options?: { restBaseUrl?: string },
  ) {
    this.restBaseUrl = options?.restBaseUrl ?? GITHUB_REST_BASE_URL;
  }

  async rest<TResponse>(
    path: string,
    init: RequestInit = {},
  ): Promise<TResponse> {
    const url = path.startsWith("http") ? path : `${this.restBaseUrl}${path}`;
    const method = (init.method || "GET").toUpperCase();

    const res = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "GitHub-Manager",
        Authorization: `Bearer ${this.token}`,
        ...(init.headers || {}),
      },
    });

    if (!res.ok) {
      throw new GitHubApiError(await readGitHubErrorMessage(res), res.status, {
        url,
        method,
      });
    }

    return (await res.json()) as TResponse;
  }

  async graphql<TData>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<TData> {
    const res = await fetch(GITHUB_GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      throw new GitHubApiError(await readGitHubErrorMessage(res), res.status, {
        url: GITHUB_GRAPHQL_URL,
        method: "POST",
      });
    }

    const payload = (await res.json()) as GitHubGraphQLResponse<TData>;
    if (payload.errors?.length) {
      throw new GitHubApiError(
        payload.errors[0]?.message || "GraphQL Error",
        200,
        {
          url: GITHUB_GRAPHQL_URL,
          method: "POST",
        },
      );
    }

    if (!payload.data) {
      throw new GitHubApiError("GraphQL response missing data", 200, {
        url: GITHUB_GRAPHQL_URL,
        method: "POST",
      });
    }

    return payload.data;
  }
}
