import { validateTransfer } from "../transfer.js";
import { describe, expect, it } from "@jest/globals";

describe("validateTransfer", () => {
  it("deve aceitar transferências com saldo suficiente", () => {
    expect(validateTransfer(100, 500)).toBe(true);
    expect(validateTransfer(500, 500)).toBe(true);
  });

  it("não deve aceitar transferências maiores que o saldo", () => {
    expect(validateTransfer(600, 500)).toBe(false);
  });

  it("não deve aceitar valores iguais a zero", () => {
    expect(validateTransfer(0, 500)).toBe(false);
  });

  it("não deve aceitar valores negativos", () => {
    expect(validateTransfer(-100, 500)).toBe(false);
  });

  it("não deve aceitar valores inválidos", () => {
    expect(validateTransfer(NaN, 500)).toBe(false);
    expect(validateTransfer(Infinity, 500)).toBe(false);
  });
});