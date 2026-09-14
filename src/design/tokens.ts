export const TOKENS = {
  colors: {
    bg: '#FDFCFB',
    surface: '#FFFFFF',
    surfaceAlt: '#F7F5F2',
    border: '#E8E5DF',
    borderLight: '#D5D0C7',
    gold: '#1A1A1A',
    goldDim: '#6B7280',
    text: '#1A1A1A',
    muted: '#6B7280',
    income: '#15803D',
    expense: '#B91C1C',
    danger: '#DC2626',
    blue: '#2563EB',
    purple: '#7C3AED',
  },
  chartPalette: [
    '#1A1A1A',
    '#15803D',
    '#B91C1C',
    '#D97706',
    '#2563EB',
    '#7C3AED',
    '#4B5563',
    '#0D9488',
  ],
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    pill: '9999px',
  },
};

export const CATEGORY_COLORS: Record<string, string> = {
  'Consulting & Retainer': '#15803D',
  'Salary & Wages': '#15803D',
  'Side Project Sales': '#2563EB',
  'Investments & Dividends': '#D97706',
  'Other Income': '#0D9488',
  'Housing & Utilities': '#B91C1C',
  'Groceries & Household': '#D97706',
  'Transport & Fuel': '#7C3AED',
  'Dining & Leisure': '#EA580C',
  'Health & Wellness': '#0284C7',
  'Tech & Software': '#1A1A1A',
  'Savings & Investments': '#15803D',
  'Debt Repayments': '#DC2626',
  'General Expense': '#6B7280',
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || '#1A1A1A';
}

export function formatCurrency(amount: number, currency = 'GHS'): string {
  const symbols: Record<string, string> = {
    GHS: 'GH₵',
    USD: '$',
    EUR: '€',
    GBP: '£',
    NGN: '₦',
  };

  const symbol = symbols[currency] || `${currency} `;
  const formattedNumber = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${symbol} ${formattedNumber}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/* ---------------------------------------------------------------------------
   Additive helpers for the redesigned surfaces.
   formatCurrency() above is left exactly as it was — every existing caller
   keeps its current output. These split the same value into its parts so a
   hero figure can weight the symbol, the integer and the decimals
   differently instead of rendering one flat string.
   ------------------------------------------------------------------------ */

const CURRENCY_SYMBOLS: Record<string, string> = {
  GHS: 'GH₵',
  USD: '$',
  EUR: '€',
  GBP: '£',
  NGN: '₦',
};

export function currencySymbol(currency = 'GHS'): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

/** Absolute value, grouped, always two decimals. No symbol, no sign. */
export function formatAmount(amount: number): string {
  return Math.abs(Number.isFinite(amount) ? amount : 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Splits a figure into integer and decimal parts for typographic emphasis. */
export function splitAmount(amount: number): { whole: string; fraction: string } {
  const [whole, fraction = '00'] = formatAmount(amount).split('.');
  return { whole, fraction };
}

/** "13 Sep" — compact enough to sit in a metadata line. */
export function formatDayMonth(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}
