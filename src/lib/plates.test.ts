import { describe, it, expect } from "vitest";
import { platesPerSide, nextSetKind } from "./plates";

describe("platesPerSide", () => {
  it("100kg on a 20kg bar = 25+15 per side", () => {
    expect(platesPerSide(100)).toEqual({ plates: [25, 15], remainder: 0 });
  });
  it("62.5kg = 20 + 1.25 per side", () => {
    expect(platesPerSide(62.5)).toEqual({ plates: [20, 1.25], remainder: 0 });
  });
  it("empty bar needs no plates", () => {
    expect(platesPerSide(20).plates).toEqual([]);
  });
  it("reports weight that cannot be loaded", () => {
    expect(platesPerSide(21).remainder).toBe(1);
  });
});

describe("nextSetKind", () => {
  it("cycles Normal → Warm-up → Drop → Failure → Normal", () => {
    expect(nextSetKind("N")).toBe("W");
    expect(nextSetKind("W")).toBe("D");
    expect(nextSetKind("D")).toBe("F");
    expect(nextSetKind("F")).toBe("N");
  });
});
