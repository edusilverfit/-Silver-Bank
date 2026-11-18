import { describe, expect, it } from "@jest/globals";
import { validateDeposit } from "../deposit.js";

describe("validateDeposit", () => {
  it("deve aceitar valores positivos", () => {
    expect(validateDeposit(100)).toBe(true);
    expect(validateDeposit(50.50)).toBe(true);
  });

  it("não deve aceitar valores iguais a zero", () => {
    expect(validateDeposit(0)).toBe(false);
  });

  it("não deve aceitar valores negativos", () => {
    expect(validateDeposit(-100)).toBe(false);
  });

  it("não deve aceitar valores inválidos", () => {
    expect(validateDeposit(NaN)).toBe(false);
    expect(validateDeposit(Infinity)).toBe(false);
  });
});