import { validateWithdraw } from "../withdraw.js";
import { describe, expect, it } from "@jest/globals";

describe("validateWithdraw", () => {
  it("deve aceitar saques com saldo suficiente", () => {
    expect(validateWithdraw(100, 500)).toBe(true);
    expect(validateWithdraw(500, 500)).toBe(true);
  });

  it("não deve aceitar saques maiores que o saldo", () => {
    expect(validateWithdraw(600, 500)).toBe(false);
  });

  it("não deve aceitar valores iguais a zero", () => {
    expect(validateWithdraw(0, 500)).toBe(false);
  });

  it("não deve aceitar valores negativos", () => {
    expect(validateWithdraw(-100, 500)).toBe(false);
  });

  it("não deve aceitar valores inválidos", () => {
    expect(validateWithdraw(NaN, 500)).toBe(false);
    expect(validateWithdraw(Infinity, 500)).toBe(false);
  });
});