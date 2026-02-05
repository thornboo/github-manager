import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Hash } from 'lucide-react';
import { TopicData } from '@/hooks/useDashboardStats';
import { useNavigate } from 'react-router-dom';

interface TopTopicsChartProps {
  data: TopicData[];
  isLoading?: boolean;
}

export function TopTopicsChart({ data, isLoading }: TopTopicsChartProps) {
  const navigate = useNavigate();

  const handleClick = (entry: TopicData) => {
    navigate(`/repos?search=${encodeURIComponent(entry.name)}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary" />
            热门 Topics
          </CardTitle>
          <CardDescription>最常见的仓库主题标签</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <Skeleton className="h-full w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary" />
            热门 Topics
          </CardTitle>
          <CardDescription>最常见的仓库主题标签</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Hash className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>暂无主题标签数据</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 为柱状图生成渐变色
  const colors = data.map((_, index) => {
    const hue = 220 - (index * 15); // 从蓝色渐变
    return `hsl(${hue}, 70%, 55%)`;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Hash className="h-5 w-5 text-primary" />
          热门 Topics
        </CardTitle>
        <CardDescription>Top 10 最常见的主题标签（点击可搜索）</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis 
                type="number" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
                width={55}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as TopicData;
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-md">
                        <div className="font-medium">#{data.name}</div>
                        <div className="text-sm text-muted-foreground">
                          出现次数: {data.count}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="count" 
                radius={[0, 4, 4, 0]}
                onClick={(data) => handleClick(data)}
                style={{ cursor: 'pointer' }}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
