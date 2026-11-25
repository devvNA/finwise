import assert from "node:assert/strict";
import {
  calculateLoan,
  calculatePindar,
  generateAmortization,
} from "./calculator.js";
import {
  calculateAffordability,
  calculateEmergencyFund,
  calculateRecommendation,
} from "./finance.js";

const tests = [];

function test(name, callback) {
  tests.push({ name, callback });
}

function approximately(actual, expected, tolerance = 0.01) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

test("calculates a 0% installment including down payment", () => {
  const result = calculateLoan({
    price: 5000000,
    downPayment: 2000000,
    principal: 3000000,
    tenor: 6,
    rate: 0,
    method: "annuity",
  });

  assert.equal(result.installment, 500000);
  assert.equal(result.totalPayment, 5000000);
  assert.equal(result.totalInterest, 0);
});

test("calculates flat interest loan costs", () => {
  const result = calculateLoan({
    principal: 3000000,
    tenor: 6,
    rate: 2,
    method: "flat",
  });

  assert.equal(result.totalInterest, 360000);
  assert.equal(result.totalCreditPayment, 3360000);
  assert.equal(result.installment, 560000);
});

test("calculates affordability using income cap and disposable income", () => {
  const result = calculateAffordability({
    income: 3000000,
    essentials: 1500000,
    recurring: 300000,
    existingInstallments: 0,
    savings: 300000,
    buffer: 200000,
    targetRatio: 15,
  });

  assert.equal(result.incomeCap, 450000);
  assert.equal(result.disposableIncome, 700000);
  assert.equal(result.maximumNewInstallment, 450000);
});

test("calculates debt-to-income ratio", () => {
  const result = calculateAffordability({
    income: 3000000,
    existingInstallments: 600000,
  });

  assert.equal(result.dti, 20);
});

test("treats 0% annuity as equal principal payments", () => {
  const result = calculateLoan({
    principal: 1200000,
    tenor: 12,
    rate: 0,
    method: "annuity",
  });

  assert.equal(result.installment, 100000);
});

test("rejects invalid loan inputs without NaN or Infinity", () => {
  const result = calculateLoan({
    principal: "",
    tenor: 0,
    rate: -1,
    method: "annuity",
  });

  assert.equal(result.valid, false);
  assert.equal(Number.isFinite(result.installment), true);
});

test("calculates daily simple interest for Pindar simulation", () => {
  const result = calculatePindar({
    disbursedAmount: 1000000,
    dailyRate: 0.2,
    days: 10,
    otherFees: 10000,
  });

  assert.equal(result.totalInterest, 20000);
  assert.equal(result.totalRepayment, 1030000);
});

test("creates a dated amortization schedule with a zero balance", () => {
  const schedule = generateAmortization({
    principal: 1200000,
    tenor: 12,
    rate: 0,
    method: "annuity",
    intervalDays: 30,
    startDate: "2026-01-01",
  });

  assert.equal(schedule.length, 12);
  approximately(schedule.at(-1).endingBalance, 0);
});

test("plans an emergency fund without dividing by zero", () => {
  const result = calculateEmergencyFund({
    essentialExpenses: 1000000,
    targetMonths: 6,
    currentSavings: 1000000,
    monthlyAllocation: 0,
  });

  assert.equal(result.target, 6000000);
  assert.equal(result.estimatedMonths, null);
});

test("does not recommend unaffordable installments", () => {
  const recommendation = calculateRecommendation({
    affordability: {
      maximumNewInstallment: 200000,
      disposableIncome: 100000,
      dti: 20,
      incomeCap: 450000,
    },
    emergency: { progress: 10 },
    proposedInstallment: 500000,
    cashPrice: 5000000,
    availableCash: 0,
  });

  assert.equal(recommendation.status, "not-recommended");
});

let failures = 0;

for (const { name, callback } of tests) {
  try {
    callback();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}\n${error.message}`);
  }
}

console.log(`\n${tests.length - failures}/${tests.length} tests passed`);
process.exitCode = failures ? 1 : 0;
