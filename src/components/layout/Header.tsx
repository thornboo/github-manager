import { Star, LogOut, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSyncContext } from '@/contexts/SyncContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SyncButton } from '@/components/layout/SyncButton';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/dashboard', label: '首页' },
  { path: '/repos', label: '仓库' },
  { path: '/pulls', label: 'PR' },
  { path: '/issues', label: 'Issues' },
  { path: '/releases', label: 'Release 跟踪' },
];

interface HeaderProps {
  sidebar?: React.ReactNode;
}

export function Header({ sidebar }: HeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  
  // 从全局 Context 获取同步状态
  const syncContext = useSyncContext();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card">
      <div className="flex h-14 items-center px-4 gap-4">
        {/* Mobile menu trigger */}
        {isAuthenticated && sidebar && (
          <div className="md:hidden">
            {sidebar}
          </div>
        )}

        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2">
          <Star className="h-6 w-6 text-primary fill-primary" />
          <span className="font-semibold text-lg hidden sm:inline">GitHub Manager</span>
          <span className="font-semibold text-lg sm:hidden">GM</span>
        </Link>

        {/* Spacer to push nav to center */}
        <div className="flex-1" />

        {/* Navigation tabs - centered */}
        {isAuthenticated && (
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  location.pathname === item.path
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Spacer to push right items to end */}
        <div className="flex-1" />

        {/* Sync button - 从 Context 获取状态，全局可用 */}
        {isAuthenticated && (
          <SyncButton
            isSyncing={syncContext.isSyncing}
            onSync={syncContext.triggerSync}
            lastSyncTime={syncContext.lastSyncTime}
            syncStatus={syncContext.syncStatus}
            syncError={syncContext.syncError}
          />
        )}
        <ThemeToggle />
        {isAuthenticated && user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar_url} alt={user.login} />
                  <AvatarFallback>{user.login.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  {user.name && <p className="font-medium">{user.name}</p>}
                  <p className="w-[200px] truncate text-sm text-muted-foreground">
                    @{user.login}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  设置
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href={user.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cursor-pointer"
                >
                  View GitHub Profile
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
