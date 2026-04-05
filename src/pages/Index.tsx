import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Landing from "./Landing";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    // Authenticated users go straight to their dashboard
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  // While auth resolves, show a brief spinner
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Visitors see the public landing page
  return <Landing />;
};

export default Index;
