import { Star, Code, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface StatsCardsProps {
  totalStars: number;
  languageCount: number;
  topLanguage: string | null;
  newStarsThisMonth: number;
  isLoading?: boolean;
}

export function StatsCards({
  totalStars,
  languageCount,
  topLanguage,
  newStarsThisMonth,
  isLoading,
}: StatsCardsProps) {
  const stats = [
    {
      label: '总 Stars',
      value: totalStars.toString(),
      icon: Star,
      iconColor: 'text-yellow-500',
    },
    {
      label: '语言种类',
      value: languageCount.toString(),
      icon: Code,
      iconColor: 'text-blue-500',
    },
    {
      label: '热门语言',
      value: topLanguage || '-',
      icon: TrendingUp,
      iconColor: 'text-green-500',
    },
    {
      label: '本月新增',
      value: newStarsThisMonth.toString(),
      icon: Calendar,
      iconColor: 'text-purple-500',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.iconColor} opacity-80`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
