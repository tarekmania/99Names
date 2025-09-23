import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Play from "./pages/Play";
import EndSummary from "./pages/EndSummary";
import HowToPlay from "./pages/HowToPlay";
import Settings from "./pages/Settings";
import Stats from "./pages/Stats";
import Study from "./pages/Study";
import StudyDetail from "./pages/StudyDetail";
import Daily from "./pages/Daily";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { InstallPrompt } from "@/components/InstallPrompt";
import { AuthWrapper } from "@/components/AuthWrapper";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthWrapper>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/play" element={<Play />} />
              <Route path="/end-summary" element={<EndSummary />} />
              <Route path="/how-to-play" element={<HowToPlay />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/study" element={<Study />} />
              <Route path="/study/:id" element={<StudyDetail />} />
              <Route path="/daily" element={<Daily />} />
              <Route path="/auth" element={<Auth />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <InstallPrompt />
          </AuthWrapper>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
