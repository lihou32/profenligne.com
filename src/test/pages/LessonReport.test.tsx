import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const { mockInvoke, mockGetSession } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockGetSession: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: mockGetSession },
    functions: { invoke: mockInvoke },
  },
}));

import LessonReport from "@/pages/LessonReport";

function renderReport(url = "/report/lesson-1?subject=Physique&topic=Optique") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/report/:id" element={<LessonReport />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("LessonReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockInvoke.mockImplementation((
      fnName: string,
      payload: { body: { mode: string; subject?: string; topic?: string } }
    ) => {
      if (fnName !== "ai-chat") return Promise.resolve({ data: {} });
      if (payload.body.mode === "quiz") {
        return Promise.resolve({
          data: {
            questions: [{ question: "Q1", options: ["A", "B", "C", "D"], correct: 1 }],
          },
        });
      }
      return Promise.resolve({
        data: {
          mindmap: { label: "Optique", children: [{ label: "Lentilles" }] },
        },
      });
    });
  });

  it("uses subject/topic query params and calls real AI endpoint modes", async () => {
    renderReport();

    expect(screen.getByText(/Physique — Optique/)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("ai-chat", {
        body: { mode: "quiz", subject: "Physique", topic: "Optique" },
        headers: undefined,
      });
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("ai-chat", {
        body: { mode: "mindmap", subject: "Physique", topic: "Optique" },
        headers: undefined,
      });
    });
  });
});
