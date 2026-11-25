const DEFAULTS = {
  price: 0,
  downPayment: 0,
  principal: 0,
  tenor: 1,
  rate: 0,
  adminFee: 0,
  serviceFee: 0,
  insuranceFee: 0,
  extraFee: 0,
  lateFee: 0,
  days: 30,
};

export function numberValue(value, fallback = 0) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function nonNegative(value) {
  return Math.max(0, numberValue(value));
}

export function calculateLoan(input = {}) {
  const values = { ...DEFAULTS, ...input };
  const price = nonNegative(values.price);
  const downPayment = nonNegative(values.downPayment);
  const explicitPrincipal = nonNegative(values.principal);
  const tenor = numberValue(values.tenor);
  const rate = numberValue(values.rate);
  const method = values.method || "annuity";
  const fees =
    nonNegative(values.adminFee) +
    nonNegative(values.serviceFee) +
    nonNegative(values.insuranceFee) +
    nonNegative(values.extraFee);
  const hasPrice = price > 0;
  const principal = explicitPrincipal || Math.max(0, price - downPayment);
  const valid =
    tenor > 0 &&
    rate >= 0 &&
    downPayment >= 0 &&
    (!hasPrice || downPayment <= price) &&
    principal >= 0;

  if (!valid) {
    return {
      valid: false,
      message: "Periksa tenor, bunga, uang muka, dan pokok pembiayaan.",
      principal: 0,
      totalInterest: 0,
      totalFees: fees,
      totalCreditPayment: 0,
      totalPayment: 0,
      installment: 0,
      periodicPayment: 0,
      creditCost: fees,
      costPercentage: 0,
    };
  }

  const monthlyRate = rate / 100;
  const days = Math.max(1, numberValue(values.days, 30));
  let installment = 0;
  let totalInterest = 0;

  if (method === "flat") {
    totalInterest = principal * monthlyRate * tenor;
    installment = (principal + totalInterest) / tenor;
  } else if (method === "daily") {
    totalInterest = principal * monthlyRate * days;
    installment = (principal + totalInterest) / tenor;
  } else if (monthlyRate === 0) {
    installment = principal / tenor;
  } else {
    installment =
      (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -tenor));
    totalInterest = installment * tenor - principal;
  }

  const totalCreditPayment = principal + totalInterest + fees;
  const totalPayment = downPayment + totalCreditPayment;
  const periodicPayment = totalCreditPayment / tenor;
  const creditCost = totalInterest + fees;

  return {
    valid: true,
    message: "",
    price,
    downPayment,
    principal,
    tenor,
    rate,
    method,
    totalInterest,
    totalFees: fees,
    totalCreditPayment,
    totalPayment,
    installment,
    periodicPayment,
    creditCost,
    costPercentage: principal ? (creditCost / principal) * 100 : 0,
  };
}

export function calculatePindar(input = {}) {
  const disbursedAmount = nonNegative(input.disbursedAmount);
  const dailyRate = numberValue(input.dailyRate);
  const days = numberValue(input.days);
  const otherFees = nonNegative(input.otherFees);
  const valid = disbursedAmount > 0 && dailyRate >= 0 && days > 0;
  const totalInterest = valid ? disbursedAmount * (dailyRate / 100) * days : 0;

  return {
    valid,
    disbursedAmount,
    dailyRate: Math.max(0, dailyRate),
    days: Math.max(0, days),
    otherFees,
    totalInterest,
    totalRepayment: valid ? disbursedAmount + totalInterest + otherFees : 0,
    totalCost: totalInterest + otherFees,
  };
}

export function calculateCreditCard(input = {}) {
  const transaction = nonNegative(input.transaction);
  const payment = nonNegative(input.payment);
  const minimumPercent = Math.max(0, numberValue(input.minimumPercent, 10));
  const monthlyRate = Math.max(0, numberValue(input.monthlyRate, 0));
  const minimumPayment = transaction * (minimumPercent / 100);
  const remainder = Math.max(0, transaction - payment);
  const interest = payment >= transaction ? 0 : remainder * (monthlyRate / 100);

  return {
    transaction,
    payment,
    minimumPayment,
    remainder,
    interest,
    nextBalance: remainder + interest,
    paysInFull: payment >= transaction,
    belowMinimum: payment > 0 && payment < minimumPayment,
  };
}

export function calculatePayLaterPlans(input = {}) {
  const amount = nonNegative(input.amount);
  const serviceFee = nonNegative(input.serviceFee);
  const rates = input.rates || {};

  return [1, 3, 6, 12].map((tenor) => {
    const result = calculateLoan({
      principal: amount,
      tenor,
      rate: nonNegative(rates[tenor]),
      method: "flat",
      serviceFee,
    });
    return { tenor, label: tenor === 1 ? "Bulan depan" : `${tenor} bulan`, ...result };
  });
}

export function generateAmortization(input = {}) {
  const loan = calculateLoan(input);
  if (!loan.valid || loan.principal <= 0) return [];

  const start = new Date(input.startDate || new Date().toISOString().slice(0, 10));
  const intervalDays = Math.max(1, numberValue(input.intervalDays, 30));
  const rate = loan.rate / 100;
  const schedule = [];
  let balance = loan.principal;

  for (let index = 1; index <= loan.tenor; index += 1) {
    const openingBalance = balance;
    let interest = 0;
    let principalPayment = 0;

    if (loan.method === "flat") {
      interest = loan.principal * rate;
      principalPayment = loan.principal / loan.tenor;
    } else if (loan.method === "daily") {
      interest = loan.totalInterest / loan.tenor;
      principalPayment = loan.principal / loan.tenor;
    } else {
      interest = rate === 0 ? 0 : openingBalance * rate;
      principalPayment = loan.installment - interest;
    }

    principalPayment = Math.min(openingBalance, Math.max(0, principalPayment));
    balance = Math.max(0, openingBalance - principalPayment);
    const dueDate = new Date(start);
    dueDate.setDate(start.getDate() + index * intervalDays);

    schedule.push({
      number: index,
      dueDate: dueDate.toISOString().slice(0, 10),
      openingBalance,
      principalPayment,
      interest,
      payment: principalPayment + interest + (loan.totalFees / loan.tenor),
      endingBalance: balance,
    });
  }

  return schedule;
}
