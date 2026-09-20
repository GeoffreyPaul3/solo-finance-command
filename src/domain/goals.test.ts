import { describe, expect, it } from "vitest";
import { calculateGoalProgress } from "./goals";

describe("Financial Goals Planning Logic", () => {
  it("calculates progress percentage and remaining amount accurately", () => {
    const progress = calculateGoalProgress({
      targetAmount: 10000000,
      currentAmount: 4500000,
      targetDate: "2026-12-31",
      asOfDate: "2026-09-20",
    });

    expect(progress.percentComplete).toBe(45);
    expect(progress.remainingAmount).toBe(5500000);
    expect(progress.isComplete).toBe(false);
    expect(progress.daysRemaining).toBe(102);
    expect(progress.statusLabel).toBe("45% Funded");
  });

  it("identifies target reached when current amount equals or exceeds target", () => {
    const progress = calculateGoalProgress({
      targetAmount: 5000,
      currentAmount: 5000,
      targetDate: "2026-10-01",
      asOfDate: "2026-09-20",
    });

    expect(progress.percentComplete).toBe(100);
    expect(progress.remainingAmount).toBe(0);
    expect(progress.isComplete).toBe(true);
    expect(progress.statusLabel).toBe("Target Reached");
  });

  it("handles past target date when goal is not complete", () => {
    const progress = calculateGoalProgress({
      targetAmount: 2000,
      currentAmount: 800,
      targetDate: "2026-09-01",
      asOfDate: "2026-09-20",
    });

    expect(progress.isComplete).toBe(false);
    expect(progress.daysRemaining).toBeLessThan(0);
    expect(progress.statusLabel).toBe("Past Target Date");
  });
});
