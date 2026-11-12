import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { CookieBanner } from "@/components/legal/CookieBanner";

// Eagerly loaded — needed immediately on first paint
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AuthCallback from "./pages/AuthCallback";

// Lazy loaded — only fetched when the user navigates to that page
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));
const Lessons = lazy(() => import("./pages/Lessons"));
const LiveConnect = lazy(() => import("./pages/LiveConnect"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Help = lazy(() => import("./pages/Help"));
// Paiement : solde en euros rechargé manuellement (voir /credits)
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const LessonRoom = lazy(() => import("./pages/LessonRoom"));
const LessonReport = lazy(() => import("./pages/LessonReport"));
const TutorReviews = lazy(() => import("./pages/TutorReviews"));
const TutorEarnings = lazy(() => import("./pages/TutorEarnings"));
const TutorAvailability = lazy(() => import("./pages/TutorAvailability"));
const Membership = lazy(() => import("./pages/Membership"));
const BuyCredits = lazy(() => import("./pages/BuyCredits"));
// AI Tutor removed — feature supprimée du produit
const Profile = lazy(() => import("./pages/Profile"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const TutorProfile = lazy(() => import("./pages/TutorProfile"));
const Tutors = lazy(() => import("./pages/Tutors"));
const JoinLesson = lazy(() => import("./pages/JoinLesson"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCancel = lazy(() => import("./pages/PaymentCancel"));
const Certificates = lazy(() => import("./pages/Certificates"));
const Referral = lazy(() => import("./pages/Referral"));
const TutorOnboarding = lazy(() => import("./pages/TutorOnboarding"));
// Pages légales (accessibles même en mode « Bientôt disponible »)
const MentionsLegales = lazy(() => import("./pages/legal/MentionsLegales"));
const Conditions = lazy(() => import("./pages/legal/Conditions"));
const Confidentialite = lazy(() => import("./pages/legal/Confidentialite"));
const Fonctionnement = lazy(() => import("./pages/legal/Fonctionnement"));


// Shared page-level loading fallback
const PageLoader = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const legalRoutes = (
  <Route element={<PublicLayout />}>
    <Route path="/mentions-legales" element={<Suspense fallback={<PageLoader />}><MentionsLegales /></Suspense>} />
    <Route path="/conditions" element={<Suspense fallback={<PageLoader />}><Conditions /></Suspense>} />
    <Route path="/confidentialite" element={<Suspense fallback={<PageLoader />}><Confidentialite /></Suspense>} />
    <Route path="/fonctionnement" element={<Suspense fallback={<PageLoader />}><Fonctionnement /></Suspense>} />
  </Route>
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
// Mettre VITE_COMING_SOON_MODE=true dans .env pour activer le mode maintenance
const COMING_SOON_MODE = import.meta.env.VITE_COMING_SOON_MODE === "true";

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
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {legalRoutes}
        <Route path="*" element={<Suspense fallback={<PageLoader />}><ComingSoon /></Suspense>} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* ── Public discovery routes (no auth required) ── */}
      <Route element={<PublicLayout />}>
        <Route path="/tutors" element={<Suspense fallback={<PageLoader />}><Tutors /></Suspense>} />
        <Route path="/rejoindre" element={<Suspense fallback={<PageLoader />}><JoinLesson /></Suspense>} />
        <Route path="/abonnement" element={<Suspense fallback={<PageLoader />}><Membership /></Suspense>} />
        <Route path="/tutors/:id" element={<Suspense fallback={<PageLoader />}><TutorProfile /></Suspense>} />
      </Route>
      {legalRoutes}

      {/* ── Authenticated app routes ── */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
        <Route path="/lessons" element={<Suspense fallback={<PageLoader />}><Lessons /></Suspense>} />
        <Route path="/live" element={<Suspense fallback={<PageLoader />}><LiveConnect /></Suspense>} />
        <Route path="/notifications" element={<Suspense fallback={<PageLoader />}><Notifications /></Suspense>} />
        <Route path="/help" element={<Suspense fallback={<PageLoader />}><Help /></Suspense>} />
        <Route path="/pricing" element={<Navigate to="/credits" replace />} />
        <Route path="/buy-credits" element={<Navigate to="/credits" replace />} />
        <Route path="/reviews" element={<Suspense fallback={<PageLoader />}><TutorReviews /></Suspense>} />
        <Route path="/disponibilites" element={<ProtectedRoute requiredRole="tutor"><Suspense fallback={<PageLoader />}><TutorAvailability /></Suspense></ProtectedRoute>} />
        <Route path="/earnings" element={<ProtectedRoute requiredRole="tutor"><Suspense fallback={<PageLoader />}><TutorEarnings /></Suspense></ProtectedRoute>} />
        <Route path="/credits" element={<Suspense fallback={<PageLoader />}><BuyCredits /></Suspense>} />
        {/* AI Tutor route removed */}
        <Route path="/profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
        <Route path="/settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
        <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Suspense fallback={<PageLoader />}><AdminPanel /></Suspense></ProtectedRoute>} />
        <Route path="/room/:id" element={<Suspense fallback={<PageLoader />}><LessonRoom /></Suspense>} />
        <Route path="/report/:id" element={<Suspense fallback={<PageLoader />}><LessonReport /></Suspense>} />
        <Route path="/certificates" element={<Suspense fallback={<PageLoader />}><Certificates /></Suspense>} />
        <Route path="/referral" element={<Suspense fallback={<PageLoader />}><Referral /></Suspense>} />
      </Route>

      <Route path="/become-tutor" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><TutorOnboarding /></Suspense></ProtectedRoute>} />
      <Route path="/payment/success" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><PaymentSuccess /></Suspense></ProtectedRoute>} />
      <Route path="/payment/cancel" element={<Suspense fallback={<PageLoader />}><PaymentCancel /></Suspense>} />
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
              <CookieBanner />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
