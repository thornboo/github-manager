import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SyncSettingsForm } from '@/components/settings/SyncSettingsForm';
import { AISettingsForm } from '@/components/settings/AISettingsForm';
import { SettingsNav } from '@/components/settings/SettingsNav';
import { useSyncSettings } from '@/hooks/useSyncSettings';
import { useAISettings } from '@/hooks/useAISettings';
import { LocalDataProvider } from '@/contexts/LocalDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { LoginPage } from '@/components/auth/LoginPage';

function SettingsContent() {
  const { settings: syncSettings, updateSettings: updateSyncSettings, getTimeSinceLastSync } = useSyncSettings();
  const { settings: aiSettings, updateSettings: updateAISettings, updateProvider } = useAISettings();
  const [activeSection, setActiveSection] = useState('sync');
  const mainRef = useRef<HTMLDivElement>(null);

  // 使用 IntersectionObserver 监听滚动
  useEffect(() => {
    const sectionIds = ['sync', 'ai', 'ai-provider', 'ai-prompt', 'ai-options'];
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(entry.target.id);
            }
          });
        },
        { 
          rootMargin: '-20% 0px -70% 0px',
          threshold: 0
        }
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach(observer => observer.disconnect());
    };
  }, [aiSettings.enabled]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card">
        <div className="flex h-14 items-center px-4 gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="font-semibold text-lg">设置</h1>
        </div>
      </header>

      {/* Content */}
      <div className="container max-w-5xl py-6">
        <div className="flex gap-8">
          {/* 左侧导航 - 桌面端显示 */}
          <aside className="hidden md:block w-48 shrink-0">
            <nav className="sticky top-20">
              <SettingsNav 
                activeSection={activeSection}
                onNavigate={scrollToSection}
              />
            </nav>
          </aside>
          
          {/* 右侧内容 */}
          <main ref={mainRef} className="flex-1 space-y-6">
            <SyncSettingsForm
              settings={syncSettings}
              onUpdate={updateSyncSettings}
              lastSyncTime={getTimeSinceLastSync()}
            />

            <AISettingsForm
              settings={aiSettings}
              onUpdate={updateAISettings}
              onUpdateProvider={updateProvider}
            />
          </main>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <LocalDataProvider>
      <SettingsContent />
    </LocalDataProvider>
  );
}
