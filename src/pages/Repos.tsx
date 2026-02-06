import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LoginPage } from "@/components/auth/LoginPage";
import { Header } from "@/components/layout/Header";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { StarsDashboard } from "@/components/stars/StarsDashboard";
import { LocalDataProvider } from "@/contexts/LocalDataContext";
import { Loader2, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

function AuthenticatedApp() {
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const sidebar = (
    <AppSidebar
      selectedList={selectedList}
      onSelectList={(id) => {
        setSelectedList(id);
        setIsMobileSidebarOpen(false);
      }}
      selectedTag={selectedTag}
      onSelectTag={(id) => {
        setSelectedTag(id);
        setIsMobileSidebarOpen(false);
      }}
      selectedTopic={selectedTopic}
      onSelectTopic={(topic) => {
        setSelectedTopic(topic);
        setIsMobileSidebarOpen(false);
      }}
    />
  );

  return (
    <LocalDataProvider>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <Header
          sidebar={
            <Sheet
              open={isMobileSidebarOpen}
              onOpenChange={setIsMobileSidebarOpen}
            >
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                {sidebar}
              </SheetContent>
            </Sheet>
          }
        />
        <div className="flex-1 flex overflow-hidden">
          {/* Desktop sidebar */}
          <div className="hidden md:flex h-full">{sidebar}</div>

          {/* Main content */}
          <main className="flex-1 p-6 overflow-hidden min-h-0">
            <StarsDashboard
              selectedList={selectedList}
              selectedTag={selectedTag}
              selectedTopic={selectedTopic}
            />
          </main>
        </div>
      </div>
    </LocalDataProvider>
  );
}

const Repos = () => {
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

  return <AuthenticatedApp />;
};

export default Repos;
