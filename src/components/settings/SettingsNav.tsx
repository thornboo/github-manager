import { RefreshCw, Sparkles, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavChild {
  id: string;
  label: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  children?: NavChild[];
}

interface SettingsNavProps {
  activeSection: string;
  onNavigate: (id: string) => void;
}

const navItems: NavItem[] = [
  { 
    id: 'sync', 
    label: '同步设置', 
    icon: RefreshCw 
  },
  { 
    id: 'ai', 
    label: 'AI 服务',
    icon: Sparkles,
    children: [
      { id: 'ai-provider', label: '服务商配置' },
      { id: 'ai-prompt', label: '提示词' },
      { id: 'ai-options', label: '分析选项' },
    ]
  },
];

export function SettingsNav({ activeSection, onNavigate }: SettingsNavProps) {
  const isActive = (id: string, children?: NavChild[]) => {
    if (activeSection === id) return true;
    if (children?.some(child => child.id === activeSection)) return true;
    return false;
  };

  return (
    <ul className="space-y-1">
      {navItems.map((item) => (
        <li key={item.id}>
          <button
            onClick={() => onNavigate(item.id)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm",
              "hover:bg-muted transition-colors",
              isActive(item.id, item.children) && "bg-muted font-medium"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
          
          {/* 子导航 */}
          {item.children && (
            <ul className="ml-6 mt-1 space-y-1 border-l pl-3">
              {item.children.map((child) => (
                <li key={child.id}>
                  <button
                    onClick={() => onNavigate(child.id)}
                    className={cn(
                      "w-full text-left px-2 py-1.5 text-sm text-muted-foreground",
                      "hover:text-foreground transition-colors",
                      activeSection === child.id && "text-foreground font-medium"
                    )}
                  >
                    {child.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
