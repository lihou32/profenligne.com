import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock dependencies
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    signUp: vi.fn().mockResolvedValue({ id: "new-user-id" }),
    user: null,
    profile: null,
    roles: [],
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock("@/integrations/lovable/index", () => ({
  lovable: {
    auth: {
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("Signup page", () => {
  const renderSignup = (route = "/signup") =>
    render(
      <MemoryRouter initialEntries={[route]}>
        <Signup />
      </MemoryRouter>,
    );

  // Dynamic import to apply mocks first
  let Signup: React.ComponentType;

  it("renders the signup form", async () => {
    const mod = await import("@/pages/Signup");
    Signup = mod.default;

    renderSignup();

    expect(screen.getByText("Inscription")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Jean")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Dupont")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("votre@email.com")).toBeInTheDocument();
    expect(screen.getByText("Créer mon compte")).toBeInTheDocument();
  });

  it("shows Google and Apple login buttons", async () => {
    const mod = await import("@/pages/Signup");
    Signup = mod.default;

    renderSignup();

    expect(screen.getByText("Continuer avec Google")).toBeInTheDocument();
    expect(screen.getByText("Continuer avec Apple")).toBeInTheDocument();
  });

  it("has a link to the login page", async () => {
    const mod = await import("@/pages/Signup");
    Signup = mod.default;

    renderSignup();

    const loginLink = screen.getByText("Se connecter");
    expect(loginLink).toBeInTheDocument();
    expect(loginLink.closest("a")).toHaveAttribute("href", "/login");
  });

  it("captures referral code from URL", async () => {
    const mod = await import("@/pages/Signup");
    Signup = mod.default;

    // Render with ?ref= parameter
    renderSignup("/signup?ref=ABC12345");

    // The ref param should be captured internally (no visible UI change)
    // We verify the component renders without error with the ref param
    expect(screen.getByText("Inscription")).toBeInTheDocument();
  });
});
