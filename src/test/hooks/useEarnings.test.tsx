/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useEarningsBalance, useTutorEarnings, useRequestWithdrawal } from "@/hooks/useEarnings"

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
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe("useEarnings hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useAuth.mockReturnValue({ user: { id: "tutor-1" } })

    mocks.from.mockImplementation((table: string) => {
      if (table === "tutor_earnings") {
        return {
          select: (fields?: string) => ({
            eq: () => {
              if (fields === "amount, status") {
                return Promise.resolve({
                  data: [
                    { amount: "20.1", status: "paid" },
                    { amount: "10.235", status: "pending" },
                  ],
                  error: null,
                })
              }

              return {
                order: vi.fn().mockResolvedValue({
                  data: [{ id: "earn-1", amount: "20.1", status: "paid" }],
                  error: null,
                }),
              }
            },
          }),
        }
      }

      if (table === "withdrawal_requests") {
        return {
          insert: () => ({
            select: () => ({
              single: vi.fn().mockResolvedValue({
                data: { id: "wr-1", amount: 50, tutor_id: "tutor-1" },
                error: null,
              }),
            }),
          }),
        }
      }

      return { select: () => ({ eq: vi.fn() }) }
    })
  })

  it("fetches tutor earnings list", async () => {
    const { result } = renderHook(() => useTutorEarnings(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0].id).toBe("earn-1")
  })

  it("computes rounded earnings balance", async () => {
    const { result } = renderHook(() => useEarningsBalance(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ total: 30.34, paid: 20.1, pending: 10.24 })
  })

  it("creates withdrawal request and rejects when unauthenticated", async () => {
    const { result } = renderHook(() => useRequestWithdrawal(), { wrapper: createWrapper() })

    let created: any
    await act(async () => {
      created = await result.current.mutateAsync(50)
    })
    expect(created).toMatchObject({ id: "wr-1", amount: 50 })

    mocks.useAuth.mockReturnValue({ user: null })
    const { result: unauth } = renderHook(() => useRequestWithdrawal(), { wrapper: createWrapper() })

    await expect(unauth.current.mutateAsync(25)).rejects.toThrow("Not authenticated")
  })
})
