import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/dashboard";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Une erreur inattendue s'est produite</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Quelque chose a mal tourné. L'erreur a été enregistrée.
              Retournez au tableau de bord pour continuer.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-4 rounded-lg bg-muted p-3 text-left text-xs text-destructive overflow-auto max-w-lg">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <Button onClick={this.handleReset} className="gradient-primary text-primary-foreground">
            Retour au tableau de bord
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
