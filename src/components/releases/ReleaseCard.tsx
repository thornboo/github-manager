import { ReleaseWithRepo } from '@/types/github';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Package, ExternalLink, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useState } from 'react';

interface ReleaseCardProps {
  release: ReleaseWithRepo;
}

export function ReleaseCard({ release }: ReleaseCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const timeAgo = formatDistanceToNow(new Date(release.published_at), {
    addSuffix: true,
    locale: zhCN,
  });

  // Truncate body to first 200 chars for preview
  const bodyPreview = release.body 
    ? release.body.length > 200 
      ? release.body.slice(0, 200) + '...' 
      : release.body
    : null;

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Package className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <a 
                  href={`https://github.com/${release.repoFullName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground hover:text-primary transition-colors"
                >
                  {release.repoFullName}
                </a>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {release.tag_name}
                  </Badge>
                  {release.prerelease && (
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                      预发布
                    </Badge>
                  )}
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                asChild
              >
                <a 
                  href={release.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看详情
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            </div>

            {release.name && release.name !== release.tag_name && (
              <p className="text-sm font-medium">{release.name}</p>
            )}

            {release.body && (
              <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <div className="text-sm text-muted-foreground">
                  {isOpen ? (
                    <CollapsibleContent className="whitespace-pre-wrap break-words">
                      {release.body}
                    </CollapsibleContent>
                  ) : (
                    <p className="line-clamp-2">{bodyPreview}</p>
                  )}
                </div>
                
                {release.body.length > 200 && (
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 px-2 mt-1 text-xs">
                      {isOpen ? (
                        <>收起 <ChevronUp className="h-3 w-3 ml-1" /></>
                      ) : (
                        <>展开 <ChevronDown className="h-3 w-3 ml-1" /></>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                )}
              </Collapsible>
            )}

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>发布于 {timeAgo}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
