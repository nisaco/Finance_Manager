import { Profile } from '../types.js';

export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) return amount;
  
  // Rate gives the value of 1 unit of currency in GHS
  const fromRateInGHS = rates[fromCurrency] || (fromCurrency === 'GHS' ? 1 : 1);
  const toRateInGHS = rates[toCurrency] || (toCurrency === 'GHS' ? 1 : 1);

  // Convert from source to GHS, then GHS to target
  const amountInGHS = amount * fromRateInGHS;
  const targetAmount = amountInGHS / toRateInGHS;

  return Math.round(targetAmount * 100) / 100;
}
