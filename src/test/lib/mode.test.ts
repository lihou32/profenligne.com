import { describe, expect, it } from "vitest";
import { resolveMode } from "@/lib/mode";

describe("espace élève / prof", () => {
  it("un élève seul est en espace élève, un prof seul en espace prof", () => {
    expect(resolveMode(["student"], "tutor")).toBe("student");
    expect(resolveMode(["tutor"], "student")).toBe("tutor");
    expect(resolveMode(["admin", "tutor"], null)).toBe("tutor");
  });
  it("un compte élève + prof ouvre l'espace prof par défaut, puis garde son choix", () => {
    expect(resolveMode(["student", "tutor"], null)).toBe("tutor");
    expect(resolveMode(["student", "tutor", "admin"], "student")).toBe("student");
    expect(resolveMode(["student", "tutor"], "n'importe quoi")).toBe("tutor");
  });
});
