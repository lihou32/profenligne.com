import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 — Route inexistante :", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center animate-fade-in">
      {/* Large gradient number */}
      <div className="mb-4 text-[8rem] font-extrabold leading-none gradient-text select-none">
        404
      </div>

      <h1 className="mb-2 text-2xl font-bold">Page introuvable</h1>
      <p className="mb-8 max-w-sm text-muted-foreground">
        La page que vous cherchez n'existe pas ou a été déplacée.
      </p>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="gap-2 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
        <Button
          onClick={() => navigate("/dashboard")}
          className="gap-2 rounded-xl gradient-primary text-primary-foreground btn-glow"
        >
          <Home className="h-4 w-4" />
          Tableau de bord
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
