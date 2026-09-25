import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import CrimeMapPage from "./pages/CrimeMapPage";
import CommunityPage from "./pages/CommunityPage";
import NotFound from "./pages/NotFound";
import EmergencyButton from "./components/emergency/EmergencyButton";
import { LanguageProvider } from "./contexts/LanguageContext";
import PartnersPage from "./pages/PartnersPage";
import SupportPage from "./pages/SupportPage";
import TrackReportPage from "./pages/TrackReportPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/map" element={<CrimeMapPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/partners" element={<PartnersPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/track" element={<TrackReportPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <EmergencyButton />
      </BrowserRouter>
    </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
