import { describe, it, expect } from "vitest";
import { hydrateDraft } from "./workout-draft";
describe("FORGED draft compatibility", () => {
  it("retains warmup kind and completed flag", () => {
    expect(
      hydrateDraft(["Press"], { Press: [{ weight: 22, reps: 10, kind: "W", done: true }] })
        .Press[0],
    ).toEqual({ weight: "22", reps: "10", kind: "W", done: true });
  });
  it("keeps unknown exercise entries instead of deleting old data", () => {
    const r = hydrateDraft(["Press"], { Old: [{ weight: "5", reps: "8" }] });
    expect(r.Old[0].weight).toBe("5");
    expect(r.Press).toHaveLength(1);
  });
  it("handles missing and malformed values", () => {
    expect(hydrateDraft(["Press"], null).Press).toEqual([{ weight: "", reps: "" }]);
    expect(hydrateDraft(["Press"], { Press: [] }).Press).toHaveLength(1);
  });
});
