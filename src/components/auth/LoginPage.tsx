import { useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CircleDot,
  ExternalLink,
  FolderOpen,
  GitPullRequest,
  Loader2,
  Star,
  Tag,
  Eye,
  EyeOff,
} from "lucide-react";

export function LoginPage() {
  const { login, isLoading } = useAuth();
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token.trim()) {
      setError("请输入 Personal Access Token");
      return;
    }

    setIsSigningIn(true);
    setError(null);

    try {
      await login(token.trim());
    } catch (err) {
      console.error("Login failed:", err);
      setError(
        err instanceof Error ? err.message : "登录失败，请检查 Token 是否正确",
      );
      setIsSigningIn(false);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex h-14 items-center px-4 gap-2">
          <Star className="h-6 w-6 text-primary fill-primary" />
          <span className="font-semibold text-lg">GitHub Manager</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl grid gap-6 md:grid-cols-2 items-stretch">
          <Card className="w-full">
            <CardHeader className="text-center space-y-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Star className="h-6 w-6 text-primary fill-primary" />
              </div>
              <CardTitle className="text-2xl">欢迎使用</CardTitle>
              <CardDescription className="text-base">
                使用 GitHub Personal Access Token 登录，管理你的 Stars、PR 和
                Issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="token">Personal Access Token</Label>
                  <div className="relative">
                    <Input
                      id="token"
                      type={showToken ? "text" : "password"}
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      className="pr-10"
                      disabled={isLoading || isSigningIn}
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showToken ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button
                  type="submit"
                  disabled={isLoading || isSigningIn || !token.trim()}
                  className="w-full h-11 text-base"
                  size="lg"
                >
                  {isSigningIn ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : null}
                  登录
                </Button>

                <div className="text-center space-y-2">
                  <a
                    href="https://github.com/settings/tokens/new?description=GitHub%20Manager&scopes=repo,read:user,user:email"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    创建 Personal Access Token
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <p className="text-xs text-muted-foreground">
                    建议最少勾选{" "}
                    <code className="bg-muted px-1 rounded">repo</code> 和{" "}
                    <code className="bg-muted px-1 rounded">read:user</code>{" "}
                    权限
                  </p>
                </div>

                {/* Mobile: show features in compact form to avoid vertical scrolling */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t md:hidden">
                  <FeatureMini
                    icon={<Star className="h-4 w-4" />}
                    title="Stars"
                    desc="浏览与搜索"
                  />
                  <FeatureMini
                    icon={<GitPullRequest className="h-4 w-4" />}
                    title="PR"
                    desc="状态筛选"
                  />
                  <FeatureMini
                    icon={<CircleDot className="h-4 w-4" />}
                    title="Issues"
                    desc="快速检索"
                  />
                  <FeatureMini
                    icon={<FolderOpen className="h-4 w-4" />}
                    title="Lists"
                    desc="分类整理"
                  />
                  <FeatureMini
                    icon={<Tag className="h-4 w-4" />}
                    title="本地标签"
                    desc="备注管理"
                  />
                </div>

                <p className="text-center text-xs text-muted-foreground pt-2">
                  使用 GitHub API · 数据仅存储在你的浏览器中
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Desktop: show full features panel */}
          <Card className="hidden md:flex flex-col">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg">功能特点</CardTitle>
              <CardDescription>
                一屏展示关键能力，登录后即可开始同步与整理
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="grid grid-cols-2 gap-4">
                <FeatureItem
                  icon={<Star className="h-5 w-5 text-primary" />}
                  title="查看 & 搜索 Stars"
                  description="支持卡片/列表视图，按名称、描述、Topics 快速检索。"
                />
                <FeatureItem
                  icon={<GitPullRequest className="h-5 w-5 text-primary" />}
                  title="管理 PR"
                  description="查看创建/参与的 PR，按状态筛选并支持搜索。"
                />
                <FeatureItem
                  icon={<CircleDot className="h-5 w-5 text-primary" />}
                  title="管理 Issues"
                  description="查看创建/参与的 Issue，按状态筛选并支持搜索。"
                />
                <FeatureItem
                  icon={<FolderOpen className="h-5 w-5 text-primary" />}
                  title="管理 Lists"
                  description="使用 GitHub 原生 Lists 将 Stars 分类整理。"
                />
                <FeatureItem
                  icon={<Tag className="h-5 w-5 text-primary" />}
                  title="本地标签 & 备注"
                  description="为仓库创建自定义标签与总结备注，数据保存在本地。"
                />
              </div>
            </CardContent>
            <div className="border-t px-6 py-4 text-xs text-muted-foreground">
              Token/Key 保存在浏览器本地；AI 功能仅在你触发时通过{" "}
              <code className="bg-muted px-1 rounded">/api</code> 转发到服务商。
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div className="min-w-0">
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}

function FeatureMini({
  icon,
  title,
  desc,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm font-medium">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}
