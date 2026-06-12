import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NTAModeProvider } from "@/contexts/NTAModeContext";
import Dashboard from "./pages/Dashboard";
import CreateTest from "./pages/CreateTest";
import MyTests from "./pages/MyTests";
import ExamInterface from "./pages/ExamInterface";
import TestAnalysis from "./pages/TestAnalysis";
import History from "./pages/History";
import MistakeBook from "./pages/MistakeBook";
import StudyPlanner from "./pages/StudyPlanner";
import ExportImport from "./pages/ExportImport";
import GoalTracker from "./pages/GoalTracker";
import JoinTest from "./pages/JoinTest";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import Community from "./pages/Community";
import AdminPanel from "./pages/AdminPanel";
import ExternalAnalysis from "./pages/ExternalAnalysis";
import Guide from "./pages/Guide";
import BiroBrain from "./pages/BiroBrain";
import PublicTests from "./pages/PublicTests";
import Auth from "./pages/Auth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <NTAModeProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create" element={<CreateTest />} />
            <Route path="/tests" element={<MyTests />} />
            <Route path="/exam/:testId" element={<ExamInterface />} />
            <Route path="/analysis/:attemptId" element={<TestAnalysis />} />
            <Route path="/history" element={<History />} />
            <Route path="/mistakes" element={<MistakeBook />} />
            <Route path="/plan" element={<StudyPlanner />} />
            <Route path="/export" element={<ExportImport />} />
            <Route path="/goal" element={<GoalTracker />} />
            <Route path="/join/:shareCode" element={<JoinTest />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/community" element={<Community />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/external-analysis" element={<ExternalAnalysis />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="/biro-brain" element={<BiroBrain />} />
            <Route path="/public-tests" element={<PublicTests />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/analysis" element={<History />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </NTAModeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
