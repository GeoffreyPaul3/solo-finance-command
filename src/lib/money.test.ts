import { describe, expect, it } from "vitest";

import {
  formatMoney,
  formatMoneyCompact,
  formatMoneyInput,
  formatPercent,
  parseMoneyInput,
  toDisplayNumber,
} from "./money";

describe("parseMoneyInput", () => {
  it("strips commas from thousands-separated inputs", () => {
    expect(parseMoneyInput("1,000")).toBe("1000");
    expect(parseMoneyInput("20,000,000.50")).toBe("20000000.50");
    expect(parseMoneyInput("100,000,000")).toBe("100000000");
  });

  it("strips currency symbols, letters, and whitespace", () => {
    expect(parseMoneyInput("$1,234.56")).toBe("1234.56");
    expect(parseMoneyInput("MWK 50,000.00")).toBe("50000.00");
    expect(parseMoneyInput("€ 999.99")).toBe("999.99");
    expect(parseMoneyInput("  2500  ")).toBe("2500");
  });

  it("handles trailing decimal points without throwing or corrupting", () => {
    expect(parseMoneyInput("1000.")).toBe("1000");
  });

  it("collapses multiple decimals keeping only the first", () => {
    expect(parseMoneyInput("10.50.25")).toBe("10.5025");
  });

  it("returns empty string for empty or blank inputs", () => {
    expect(parseMoneyInput("")).toBe("");
    expect(parseMoneyInput("   ")).toBe("");
  });

  it("preserves negative sign for debit/adjustment amounts", () => {
    expect(parseMoneyInput("-500")).toBe("-500");
    expect(parseMoneyInput("-1,250.75")).toBe("-1250.75");
  });
});

describe("formatMoneyInput", () => {
  it("formats numbers and string numbers with thousands commas", () => {
    expect(formatMoneyInput("1000")).toBe("1,000");
    expect(formatMoneyInput("20000000.50")).toBe("20,000,000.50");
    expect(formatMoneyInput(1000000)).toBe("1,000,000");
  });

  it("returns empty string for null, undefined, or empty values", () => {
    expect(formatMoneyInput(null)).toBe("");
    expect(formatMoneyInput(undefined)).toBe("");
    expect(formatMoneyInput("")).toBe("");
  });

  it("returns empty string for zero by default to avoid prefilling inputs", () => {
    expect(formatMoneyInput(0)).toBe("");
    expect(formatMoneyInput("0")).toBe("");
    expect(formatMoneyInput("0.00")).toBe("");
  });

  it("displays zero when showZero option is passed", () => {
    expect(formatMoneyInput(0, { showZero: true })).toBe("0");
    expect(formatMoneyInput("0.00", { showZero: true })).toBe("0.00");
  });

  it("formats negative numbers with leading minus and commas", () => {
    expect(formatMoneyInput("-5000")).toBe("-5,000");
    expect(formatMoneyInput("-1000000.25")).toBe("-1,000,000.25");
  });
});

describe("formatMoneyCompact", () => {
  it("formats large numbers in compact form without throwing", () => {
    const compactUsd = formatMoneyCompact(1000000, "USD");
    expect(compactUsd).toBeTruthy();
    expect(typeof compactUsd).toBe("string");

    const compactMwk = formatMoneyCompact(20000000, "MWK");
    expect(compactMwk).toBeTruthy();
    expect(typeof compactMwk).toBe("string");
  });
});

describe("authoritative money & percent utilities", () => {
  it("toDisplayNumber converts numbers and string numbers accurately", () => {
    expect(toDisplayNumber(123.45)).toBe(123.45);
    expect(toDisplayNumber("987.65")).toBe(987.65);
    expect(toDisplayNumber(null)).toBe(0);
    expect(toDisplayNumber("invalid")).toBe(0);
  });

  it("formatPercent formats percentage values", () => {
    expect(formatPercent(25)).toBe("25.0%");
    expect(formatPercent(33.333, 2)).toBe("33.33%");
  });

  it("formatMoney formats currency with standard 2 decimal places", () => {
    const usd = formatMoney(1234.5, "USD");
    expect(usd).toContain("1,234.50");
  });
});
