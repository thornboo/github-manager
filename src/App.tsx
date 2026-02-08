import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { SyncProvider } from "@/contexts/SyncContext";
import Index from "./pages/Index";
import { PageLoading } from "@/components/common/PageLoading";
import { PWAPrompt } from "@/components/pwa/PWAPrompt";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Repos = lazy(() => import("./pages/Repos"));
const PullRequests = lazy(() => import("./pages/PullRequests"));
const Issues = lazy(() => import("./pages/Issues"));
const Releases = lazy(() => import("./pages/Releases"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SyncProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<PageLoading />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/repos" element={<Repos />} />
                  <Route path="/pulls" element={<PullRequests />} />
                  <Route path="/issues" element={<Issues />} />
                  <Route path="/releases" element={<Releases />} />
                  <Route path="/settings" element={<Settings />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
            <PWAPrompt />
            <InstallPrompt />
          </TooltipProvider>
        </SyncProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
