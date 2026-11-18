import { validatePix } from "../pix.js";
import { describe, expect, it } from "@jest/globals";



describe("validatePix", () => {
  it("deve aceitar Pix com saldo suficiente e contas diferentes", () => {
    expect(validatePix(100, 500, "conta1", "conta2")).toBe(true);
    expect(validatePix(500, 500, "conta1", "conta2")).toBe(true);
  });

  it("não deve aceitar Pix com saldo insuficiente", () => {
    expect(validatePix(600, 500, "conta1", "conta2")).toBe(false);
  });

  it("não deve aceitar valores iguais a zero", () => {
    expect(validatePix(0, 500, "conta1", "conta2")).toBe(false);
  });

  it("não deve aceitar valores negativos", () => {
    expect(validatePix(-100, 500, "conta1", "conta2")).toBe(false);
  });

  it("não deve aceitar Pix para a própria conta", () => {
    expect(validatePix(100, 500, "conta1", "conta1")).toBe(false);
  });

  it("não deve aceitar valores inválidos", () => {
    expect(validatePix(NaN, 500, "conta1", "conta2")).toBe(false);
    expect(validatePix(Infinity, 500, "conta1", "conta2")).toBe(false);
  });
});