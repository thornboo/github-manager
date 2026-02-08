import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const currentThemeLabel =
    theme === "light" ? "浅色" : theme === "dark" ? "深色" : "跟随系统";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label={`切换主题，当前为${currentThemeLabel}`}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">切换主题</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" aria-label="主题切换菜单">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          role="menuitemradio"
          aria-checked={theme === "light"}
        >
          <Sun className="mr-2 h-4 w-4" />
          浅色
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          role="menuitemradio"
          aria-checked={theme === "dark"}
        >
          <Moon className="mr-2 h-4 w-4" />
          深色
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          role="menuitemradio"
          aria-checked={theme === "system" || !theme}
        >
          💻 跟随系统
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
