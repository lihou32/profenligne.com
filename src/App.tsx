import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

// Eagerly loaded — needed immediately on first paint
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ComingSoon from "./pages/ComingSoon";
import Dashboard from "./pages/Dashboard";

// Lazy loaded — only fetched when the user navigates to that page
const Lessons = lazy(() => import("./pages/Lessons"));
const LiveConnect = lazy(() => import("./pages/LiveConnect"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Help = lazy(() => import("./pages/Help"));
const Pricing = lazy(() => import("./pages/Pricing"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const LessonRoom = lazy(() => import("./pages/LessonRoom"));
const LessonReport = lazy(() => import("./pages/LessonReport"));
const TutorReviews = lazy(() => import("./pages/TutorReviews"));
const TutorEarnings = lazy(() => import("./pages/TutorEarnings"));
const BuyCredits = lazy(() => import("./pages/BuyCredits"));
const AITutor = lazy(() => import("./pages/AITutor")); // heavy: includes KaTeX
const Profile = lazy(() => import("./pages/Profile"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const TutorProfile = lazy(() => import("./pages/TutorProfile"));
const Tutors = lazy(() => import("./pages/Tutors"));

// Shared page-level loading fallback
const PageLoader = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

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
        <Route path="/lessons" element={<Suspense fallback={<PageLoader />}><Lessons /></Suspense>} />
        <Route path="/live" element={<Suspense fallback={<PageLoader />}><LiveConnect /></Suspense>} />
        <Route path="/notifications" element={<Suspense fallback={<PageLoader />}><Notifications /></Suspense>} />
        <Route path="/help" element={<Suspense fallback={<PageLoader />}><Help /></Suspense>} />
        <Route path="/pricing" element={<Suspense fallback={<PageLoader />}><Pricing /></Suspense>} />
        <Route path="/reviews" element={<Suspense fallback={<PageLoader />}><TutorReviews /></Suspense>} />
        <Route path="/earnings" element={<ProtectedRoute requiredRole="tutor"><Suspense fallback={<PageLoader />}><TutorEarnings /></Suspense></ProtectedRoute>} />
        <Route path="/credits" element={<ProtectedRoute requiredRole="student"><Suspense fallback={<PageLoader />}><BuyCredits /></Suspense></ProtectedRoute>} />
        <Route path="/ai-tutor" element={<Suspense fallback={<PageLoader />}><AITutor /></Suspense>} />
        <Route path="/profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
        <Route path="/settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
        <Route path="/tutors" element={<Suspense fallback={<PageLoader />}><Tutors /></Suspense>} />
        <Route path="/tutors/:id" element={<Suspense fallback={<PageLoader />}><TutorProfile /></Suspense>} />
        <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Suspense fallback={<PageLoader />}><AdminPanel /></Suspense></ProtectedRoute>} />
        <Route path="/room/:id" element={<Suspense fallback={<PageLoader />}><LessonRoom /></Suspense>} />
        <Route path="/report/:id" element={<Suspense fallback={<PageLoader />}><LessonReport /></Suspense>} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
};

export default App;
