import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ComingSoon from "./pages/ComingSoon";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Lessons from "./pages/Lessons";
import LiveConnect from "./pages/LiveConnect";
import Notifications from "./pages/Notifications";
import Help from "./pages/Help";
import Pricing from "./pages/Pricing";
import AdminPanel from "./pages/AdminPanel";
import LessonRoom from "./pages/LessonRoom";
import LessonReport from "./pages/LessonReport";
import TutorReviews from "./pages/TutorReviews";
import TutorEarnings from "./pages/TutorEarnings";
import BuyCredits from "./pages/BuyCredits";
import AITutor from "./pages/AITutor";
import Profile from "./pages/Profile";
import SettingsPage from "./pages/Settings";
import TutorProfile from "./pages/TutorProfile";
import Tutors from "./pages/Tutors";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,     // 1 minute — évite les refetch à chaque montage
      gcTime: 5 * 60 * 1000,   // 5 minutes en cache après démontage
      retry: 1,
    },
  },
});

// Contrôlé par la variable d'environnement VITE_COMING_SOON_MODE
// Mettre VITE_COMING_SOON_MODE=false dans .env pour ouvrir l'app à tous
const COMING_SOON_MODE = import.meta.env.VITE_COMING_SOON_MODE !== "false";

/**
 * Wrapper that shows Coming Soon to regular visitors,
 * but grants full access to authenticated admins.
 */
function AppRoutes() {
  const { user, hasRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const isAdmin = user && hasRole("admin");

  // In Coming Soon mode, only admins bypass the landing page
  if (COMING_SOON_MODE && !isAdmin) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<ComingSoon />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/lessons" element={<Lessons />} />
        <Route path="/live" element={<LiveConnect />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/help" element={<Help />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/reviews" element={<TutorReviews />} />
        <Route path="/earnings" element={<ProtectedRoute requiredRole="tutor"><TutorEarnings /></ProtectedRoute>} />
        <Route path="/credits" element={<ProtectedRoute requiredRole="student"><BuyCredits /></ProtectedRoute>} />
        <Route path="/ai-tutor" element={<AITutor />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/tutors" element={<Tutors />} />
        <Route path="/tutors/:id" element={<TutorProfile />} />
        <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminPanel /></ProtectedRoute>} />
        <Route path="/room/:id" element={<LessonRoom />} />
        <Route path="/report/:id" element={<LessonReport />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
