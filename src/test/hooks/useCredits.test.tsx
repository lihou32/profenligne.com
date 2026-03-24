import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useUserCredits, useCreditTransactions } from "@/hooks/useCredits"

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  from: vi.fn(),
}))

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mocks.useAuth(),
}))

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}))

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe("useCredits hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useAuth.mockReturnValue({ user: { id: "user-1" } })

    mocks.from.mockImplementation((table: string) => {
      if (table === "user_credits") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { credits: 42 }, error: null }),
            }),
          }),
        }
      }

      if (table === "credit_transactions") {
        return {
          select: () => ({
            eq: () => ({
              order: vi.fn().mockResolvedValue({
                data: [{ id: "tx-1", amount: 10 }, { id: "tx-2", amount: -5 }],
                error: null,
              }),
            }),
          }),
        }
      }

      return { select: () => ({ eq: vi.fn() }) }
    })
  })

  it("fetches user credits", async () => {
    const { result } = renderHook(() => useUserCredits(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ credits: 42 })
  })

  it("fetches credit transactions ordered by date", async () => {
    const { result } = renderHook(() => useCreditTransactions(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(2)
    expect(result.current.data?.[0].id).toBe("tx-1")
  })

  it("does not run query without authenticated user", async () => {
    mocks.useAuth.mockReturnValue({ user: null })

    const { result } = renderHook(() => useUserCredits(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"))
    expect(mocks.from).not.toHaveBeenCalled()
  })
})
