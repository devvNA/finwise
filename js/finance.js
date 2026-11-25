import { nonNegative, numberValue } from "./calculator.js";

export function calculateAffordability(input = {}) {
  const income = nonNegative(input.income);
  const essentials = nonNegative(input.essentials);
  const recurring = nonNegative(input.recurring);
  const existingInstallments = nonNegative(input.existingInstallments);
  const savings = nonNegative(input.savings);
  const buffer = nonNegative(input.buffer);
  const targetRatio = Math.max(0, numberValue(input.targetRatio, 15));
  const incomeCap = income * (targetRatio / 100);
  const disposableIncome =
    income - essentials - recurring - existingInstallments - savings - buffer;
  const dti = income ? (existingInstallments / income) * 100 : 0;
  const maximumNewInstallment = Math.max(
    0,
    Math.min(incomeCap - existingInstallments, disposableIncome)
  );
  const ratioUse = incomeCap ? (existingInstallments / incomeCap) * 100 : 0;
  let status = "healthy";

  if (disposableIncome < 0 || existingInstallments > incomeCap) {
    status = "over-budget";
  } else if (ratioUse >= 80 || maximumNewInstallment <= income * 0.03) {
    status = "caution";
  }

  return {
    income,
    essentials,
    recurring,
    existingInstallments,
    savings,
    buffer,
    targetRatio,
    incomeCap,
    disposableIncome,
    dti,
    ratioUse,
    maximumNewInstallment,
    recommendedInstallment: maximumNewInstallment * 0.8,
    remainingAfterMaximum: disposableIncome - maximumNewInstallment,
    status,
  };
}

export function calculateDashboard(input = {}) {
  const affordability = calculateAffordability(input);
  const totalExpenses = affordability.essentials + affordability.recurring;
  const residualIncome =
    affordability.income -
    totalExpenses -
    affordability.existingInstallments -
    affordability.savings;
  const expenseRatio = affordability.income
    ? (totalExpenses / affordability.income) * 100
    : 0;

  return {
    ...affordability,
    totalExpenses,
    residualIncome,
    expenseRatio,
    potentialSavings: Math.max(0, residualIncome),
  };
}

export function calculateEmergencyFund(input = {}) {
  const essentialExpenses = nonNegative(input.essentialExpenses);
  const dependents = Math.max(0, numberValue(input.dependents));
  const targetMonths = Math.max(0, numberValue(input.targetMonths, 3));
  const currentSavings = nonNegative(input.currentSavings);
  const monthlyAllocation = nonNegative(input.monthlyAllocation);
  const target = essentialExpenses * targetMonths;
  const remaining = Math.max(0, target - currentSavings);
  const progress = target ? Math.min(100, (currentSavings / target) * 100) : 0;

  return {
    essentialExpenses,
    dependents,
    targetMonths,
    currentSavings,
    monthlyAllocation,
    target,
    remaining,
    progress,
    estimatedMonths: remaining === 0 ? 0 : monthlyAllocation ? remaining / monthlyAllocation : null,
  };
}

export function calculateRecommendation(input = {}) {
  const affordability = input.affordability || calculateAffordability();
  const emergency = input.emergency || { progress: 0, remaining: 0 };
  const proposedInstallment = nonNegative(input.proposedInstallment);
  const cashPrice = nonNegative(input.cashPrice);
  const availableCash = nonNegative(input.availableCash);
  const canPayCash =
    cashPrice > 0 &&
    availableCash >= cashPrice &&
    availableCash - cashPrice >= nonNegative(emergency.remaining);

  if (canPayCash) {
    return {
      status: "cash-recommended",
      title: "Pembelian tunai lebih hemat",
      reason:
        "Dana tersedia cukup dan pembayaran tunai tidak mengurangi target dana darurat.",
    };
  }

  if (
    proposedInstallment > affordability.maximumNewInstallment ||
    affordability.disposableIncome < 0
  ) {
    return {
      status: "not-recommended",
      title: "Belum direkomendasikan",
      reason:
        "Cicilan melampaui ruang keuangan setelah kebutuhan, tabungan, dan buffer dipenuhi.",
    };
  }

  if (
    proposedInstallment > affordability.recommendedInstallment ||
    emergency.progress < 50 ||
    affordability.status === "caution"
  ) {
    return {
      status: "caution",
      title: "Lanjutkan dengan hati-hati",
      reason:
        "Cicilan masih mungkin dibayar, tetapi ruang keuangan atau kesiapan dana darurat terbatas.",
    };
  }

  return {
    status: "safe",
    title: "Masih dalam batas aman",
    reason:
      "Cicilan berada di bawah batas konservatif dan kebutuhan, tabungan, serta buffer masih terlindungi.",
  };
}
