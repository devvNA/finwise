import { calculateLoan } from "./calculator.js";

export function calculateOffer(offer) {
  const result = calculateLoan(offer);
  return {
    ...offer,
    ...result,
    affordable: result.periodicPayment <= (Number(offer.capacity) || 0),
  };
}

export function compareOffers(offers, sortBy = "cost") {
  const validOffers = offers
    .filter((offer) => offer.name?.trim())
    .slice(0, 5)
    .map(calculateOffer);
  const order = {
    cost: (offer) => offer.creditCost,
    installment: (offer) => offer.periodicPayment,
    tenor: (offer) => offer.tenor,
  };
  const sorter = order[sortBy] || order.cost;
  const sorted = [...validOffers].sort((first, second) => sorter(first) - sorter(second));
  const cheapest = [...validOffers].sort(
    (first, second) => first.totalPayment - second.totalPayment
  )[0];
  const suitable = sorted.find((offer) => offer.affordable);

  return sorted.map((offer) => ({
    ...offer,
    isCheapest: offer.name === cheapest?.name,
    isMostSuitable: offer.name === suitable?.name,
    costDifference: cheapest ? offer.totalPayment - cheapest.totalPayment : 0,
  }));
}
