export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  rateToUsd: number;
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', rateToUsd: 1.0 },
  { code: 'EUR', name: 'Euro', symbol: '€', rateToUsd: 1.08 },
  { code: 'GBP', name: 'British Pound', symbol: '£', rateToUsd: 1.28 },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', rateToUsd: 0.0084 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', rateToUsd: 0.0067 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', rateToUsd: 0.012 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', rateToUsd: 0.65 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', rateToUsd: 0.73 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', rateToUsd: 0.76 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', rateToUsd: 1.12 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', rateToUsd: 0.27 },
];

const currencyMap = new Map<string, CurrencyInfo>(
  SUPPORTED_CURRENCIES.map((currency) => [currency.code, currency])
);

export function getCurrencyInfo(code: string): CurrencyInfo {
  return currencyMap.get(code.toUpperCase()) ?? {
    code: code.toUpperCase(),
    name: code.toUpperCase(),
    symbol: code.toUpperCase(),
    rateToUsd: 1.0,
  };
}

export function formatCurrency(amount: number, currencyCode: string = 'USD'): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const info = getCurrencyInfo(currencyCode);
    return `${info.symbol}${amount.toFixed(2)}`;
  }
}

export function getExchangeRate(fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return 1.0;
  const fromInfo = getCurrencyInfo(fromCurrency);
  const toInfo = getCurrencyInfo(toCurrency);
  return fromInfo.rateToUsd / toInfo.rateToUsd;
}

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  customRate?: number
): number {
  if (fromCurrency === toCurrency) return amount;
  const rate = customRate ?? getExchangeRate(fromCurrency, toCurrency);
  return Math.round(amount * rate * 100) / 100;
}
