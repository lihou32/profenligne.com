/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import Signup from "@/pages/Signup"
import Login from "@/pages/Login"
import Dashboard from "@/pages/Dashboard"

const mockSignUp = vi.fn()
const mockSignIn = vi.fn()
const mockNavigate = vi.fn()
const mockMutateAsync = vi.fn()
const mockUseAuth = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()

vi.mock("sonner", () => ({
  toast: {
    success: (...args: any[]) => mockToastSuccess(...args),
    error: (...args: any[]) => mockToastError(...args),
  },
}))

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock("@/hooks/useData", () => ({
  useDashboardStats: () => ({ data: { totalHours: "0.0", completedLessons: 0, averageRating: "0.0", upcomingLessons: [] }, isLoading: false }),
  useTutors: () => ({ data: [{ id: "t-1", user_id: "tutor-1", status: "online", subjects: ["Mathématiques"], profiles: { first_name: "Alice", last_name: "Martin" } }] }),
  useCreateLesson: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}))

vi.mock("@/integrations/lovable/index", () => ({
  lovable: { auth: { signInWithOAuth: vi.fn().mockResolvedValue({}) } },
}))

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { total_xp: 0 }, error: null }) })),
      })),
    })),
  },
}))

vi.mock("@/components/ui/select", async () => {
  const React = await vi.importActual<typeof import("react")>("react")
  const SelectContext = React.createContext<{ value?: string; onValueChange?: (v: string) => void }>({})
  return {
    Select: ({ value, onValueChange, children }: any) => (
      <SelectContext.Provider value={{ value, onValueChange }}>{children}</SelectContext.Provider>
    ),
    SelectTrigger: ({ children }: any) => <div>{children}</div>,
    SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
    SelectContent: ({ children }: any) => <div>{children}</div>,
    SelectItem: ({ value, children }: any) => {
      const ctx = React.useContext(SelectContext)
      return (
        <button type="button" onClick={() => ctx.onValueChange?.(value)}>
          {children}
        </button>
      )
    },
  }
})

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe("Integration: signup -> login -> dashboard -> book lesson", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignUp.mockResolvedValue(undefined)
    mockSignIn.mockResolvedValue(undefined)
    mockMutateAsync.mockResolvedValue({ id: "lesson-1" })
    mockUseAuth.mockReturnValue({
      signUp: mockSignUp,
      signIn: mockSignIn,
      user: { id: "student-1" },
      profile: { first_name: "Jean" },
      loading: false,
      hasRole: (role: string) => role === "student",
    })
  })

  it("covers the critical flow across auth/dashboard/booking", async () => {
    const signupView = renderWithProviders(<Signup />)
    fireEvent.change(screen.getByPlaceholderText("Jean"), { target: { value: "Jean" } })
    fireEvent.change(screen.getByPlaceholderText("Dupont"), { target: { value: "Dupont" } })
    fireEvent.change(screen.getByPlaceholderText("votre@email.com"), { target: { value: "jean@example.com" } })
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "motdepasse123" } })
    fireEvent.click(screen.getByRole("button", { name: /créer mon compte/i }))

    await vi.waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith("jean@example.com", "motdepasse123", expect.objectContaining({ first_name: "Jean" }))
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard")
    })
    signupView.unmount()

    const loginView = renderWithProviders(<Login />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "jean@example.com" } })
    fireEvent.change(screen.getByLabelText(/mot de passe|password/i), { target: { value: "motdepasse123" } })
    fireEvent.click(screen.getByRole("button", { name: /connexion|se connecter/i }))

    await vi.waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("jean@example.com", "motdepasse123")
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard")
    })
    loginView.unmount()

    renderWithProviders(<Dashboard />)
    expect(screen.getByText(/bonjour/i)).toBeDefined()

    fireEvent.click(screen.getByRole("button", { name: /réserver un cours/i }))
    fireEvent.click(screen.getAllByRole("button", { name: /mathématiques/i })[0])
    fireEvent.change(screen.getByPlaceholderText(/intégrales|chapitre/i), { target: { value: "Fonctions" } })
    fireEvent.click(screen.getByRole("button", { name: /alice martin/i }))

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const date = tomorrow.toISOString().split("T")[0]

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    const timeInput = document.querySelector('input[type="time"]') as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: date } })
    fireEvent.change(timeInput, { target: { value: "10:30" } })
    fireEvent.click(screen.getByRole("button", { name: /confirmer la réservation/i }))

    await vi.waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          student_id: "student-1",
          tutor_id: "tutor-1",
          subject: "Mathématiques",
          topic: "Fonctions",
          duration_minutes: 60,
          status: "pending",
        })
      )
      expect(mockToastSuccess).toHaveBeenCalledWith("Cours réservé avec succès !")
    })
  })
})
