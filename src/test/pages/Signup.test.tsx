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

    expect(screen.getByRole("heading", { name: "Crée ton compte" })).toBeInTheDocument();
    expect(screen.getByLabelText("Prénom")).toBeInTheDocument();
    expect(screen.getByLabelText("Nom")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("toi@email.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Créer mon compte" })).toBeInTheDocument();
  });

  it("shows the Google sign-up button", async () => {
    const mod = await import("@/pages/Signup");
    Signup = mod.default;

    renderSignup();

    expect(screen.getByText("Continuer avec Google")).toBeInTheDocument();
  });

  it("has a link to the login page", async () => {
    const mod = await import("@/pages/Signup");
    Signup = mod.default;

    renderSignup();

    const loginLink = screen.getByRole("link", { name: "Se connecter" });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink.closest("a")).toHaveAttribute("href", "/login");
  });

  it("captures referral code from URL", async () => {
    const mod = await import("@/pages/Signup");
    Signup = mod.default;

    // Render with ?ref= parameter
    renderSignup("/signup?ref=ABC12345");

    // Le code de parrainage est capté et signalé à l'élève
    expect(await screen.findByText(/Invitation de parrainage appliquée/)).toBeInTheDocument();
  });
});
