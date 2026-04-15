/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { AuthProvider, useAuth } from "@/hooks/useAuth"

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
  getSession: vi.fn(),
  unsubscribe: vi.fn(),
  from: vi.fn(),
}))

let profileResponse: any = { data: null, error: null }
let rolesResponse: any = { data: [], error: null }

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signUp: mocks.signUp,
      signInWithPassword: mocks.signInWithPassword,
      signOut: mocks.signOut,
      onAuthStateChange: mocks.onAuthStateChange,
      getSession: mocks.getSession,
    },
    from: mocks.from,
  },
}))

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    profileResponse = {
      data: {
        id: "profile-1",
        user_id: "user-1",
        first_name: "Jean",
        last_name: "Dupont",
        avatar_url: null,
      },
      error: null,
    }
    rolesResponse = { data: [{ role: "student" }], error: null }

    mocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mocks.unsubscribe } },
    })

    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: "user-1", email: "jean@example.com" },
        },
      },
    })

    mocks.signUp.mockResolvedValue({ error: null })
    mocks.signInWithPassword.mockResolvedValue({ error: null })
    mocks.signOut.mockResolvedValue({ error: null })

    mocks.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue(profileResponse),
            }),
          }),
        }
      }

      if (table === "user_roles") {
        return {
          select: () => ({
            eq: vi.fn().mockResolvedValue(rolesResponse),
          }),
        }
      }

      return {
        select: () => ({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }
    })
  })

  it("throws when used outside provider", () => {
    expect(() => renderHook(() => useAuth())).toThrow("useAuth must be used within AuthProvider")
  })

  it("loads session, profile and roles from supabase", async () => {
    const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>
    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user?.id).toBe("user-1")
    expect(result.current.profile?.first_name).toBe("Jean")
    expect(result.current.roles).toEqual(["student"])
    expect(result.current.hasRole("student")).toBe(true)
    expect(result.current.hasRole("admin")).toBe(false)
  })

  it("calls auth methods and propagates errors", async () => {
    const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>
    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.signUp("new@example.com", "secret", { first_name: "New" })
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "secret",
      options: expect.objectContaining({ data: { first_name: "New" } }),
    })

    await result.current.signIn("new@example.com", "secret")
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "secret",
    })

    await result.current.signOut()
    expect(mocks.signOut).toHaveBeenCalled()

    mocks.signInWithPassword.mockResolvedValueOnce({ error: new Error("bad credentials") })
    await expect(result.current.signIn("a@b.c", "wrong")).rejects.toThrow("bad credentials")
  })
})
