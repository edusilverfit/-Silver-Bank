import { describe, expect, it } from "@jest/globals";
import { calculateFinancialSummary } from "../financialSummary.js";

describe("calculateFinancialSummary", () => {
  it("deve calcular corretamente entradas, saídas e saldo", () => {
    const transactions = [
      {
        amount: "150.00",
        status: "COMPLETED",
        fromAccountId: "conta-2",
        toAccountId: "conta-1",
      },
      {
        amount: "50.00",
        status: "COMPLETED",
        fromAccountId: "conta-1",
        toAccountId: "conta-2",
      },
      {
        amount: "100.00",
        status: "PENDING",
        fromAccountId: "conta-2",
        toAccountId: "conta-1",
      },
    ];

    const result = calculateFinancialSummary(
      transactions,
      "conta-1",
      1000
    );

    expect(result).toEqual({
      totalIncome: 150,
      totalExpenses: 50,
      currentBalance: 1000,
    });
  });

  it("deve retornar zero quando não existem transações", () => {
    const result = calculateFinancialSummary([], "conta-1", 500);

    expect(result).toEqual({
      totalIncome: 0,
      totalExpenses: 0,
      currentBalance: 500,
    });
  });

  it("não deve considerar transações pendentes ou falhas", () => {
    const transactions = [
      {
        amount: "200.00",
        status: "PENDING",
        fromAccountId: "conta-2",
        toAccountId: "conta-1",
      },
      {
        amount: "100.00",
        status: "FAILED",
        fromAccountId: "conta-1",
        toAccountId: "conta-2",
      },
    ];

    const result = calculateFinancialSummary(
      transactions,
      "conta-1",
      700
    );

    expect(result).toEqual({
      totalIncome: 0,
      totalExpenses: 0,
      currentBalance: 700,
    });
  });
});
