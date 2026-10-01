/**
 * Local Offline Parser for Ghana Mobile Money (MTN MoMo, Telecel Cash, AT Money)
 * and Bank Transaction SMS Alerts.
 * 
 * Operates completely offline with zero server calls.
 */

export interface ParsedTransactionData {
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string;
  reference?: string;
  senderOrRecipient?: string;
  fee?: number;
  confidence: number; // 0 to 1
  source: 'sms_regex' | 'ai';
}

function detectCategory(description: string, type: 'income' | 'expense' | 'transfer'): string {
  const text = description.toLowerCase();

  if (type === 'income') {
    if (text.includes('salary') || text.includes('wage') || text.includes('payroll')) return 'Salary';
    if (text.includes('dividend') || text.includes('interest')) return 'Investments';
    if (text.includes('refund')) return 'Refund';
    return 'Income';
  }

  if (text.includes('melcom') || text.includes('shoprite') || text.includes('mart') || text.includes('supermarket') || text.includes('store')) {
    return 'Shopping';
  }
  if (text.includes('food') || text.includes('restaurant') || text.includes('kfc') || text.includes('chop') || text.includes('pizza') || text.includes('buka') || text.includes('cafe')) {
    return 'Food & Dining';
  }
  if (text.includes('fuel') || text.includes('total') || text.includes('shell') || text.includes('goil') || text.includes('uber') || text.includes('bolt') || text.includes('yango') || text.includes('transport')) {
    return 'Transportation';
  }
  if (text.includes('ecg') || text.includes('gwcl') || text.includes('water') || text.includes('electricity') || text.includes('dstv') || text.includes('gotv') || text.includes('airtime') || text.includes('internet') || text.includes('bundle')) {
    return 'Utilities';
  }
  if (text.includes('health') || text.includes('pharmacy') || text.includes('hospital') || text.includes('clinic') || text.includes('med')) {
    return 'Healthcare';
  }
  if (text.includes('school') || text.includes('tuition') || text.includes('fees') || text.includes('course')) {
    return 'Education';
  }
  if (type === 'transfer' || text.includes('transfer') || text.includes('cash out')) {
    return 'Transfer';
  }

  return 'General Expense';
}

/**
 * Extracts transaction details from raw SMS texts
 */
export function parseMoMoSMS(smsText: string): ParsedTransactionData | null {
  if (!smsText || typeof smsText !== 'string' || smsText.trim().length < 10) {
    return null;
  }

  const raw = smsText.trim();
  const todayIso = new Date().toISOString().split('T')[0];

  // 1. Currency & Amount extraction
  // Matches: GHS 120.00, GHc 50, GHS50.50, USD 40, NGN 5000
  const amountMatch = raw.match(/(?:GHS|GHC|GH¢|\$|USD|EUR|GBP|NGN)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
                      raw.match(/([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:GHS|GHC|GH¢)/i);

  if (!amountMatch) {
    return null;
  }

  const rawAmountStr = amountMatch[1].replace(/,/g, '');
  const amount = parseFloat(rawAmountStr);
  if (isNaN(amount) || amount <= 0) {
    return null;
  }

  let currency = 'GHS';
  if (/\$|USD/i.test(raw)) currency = 'USD';
  else if (/EUR|€/i.test(raw)) currency = 'EUR';
  else if (/GBP|£/i.test(raw)) currency = 'GBP';
  else if (/NGN|₦/i.test(raw)) currency = 'NGN';

  // 2. Transaction Type detection
  let type: 'income' | 'expense' | 'transfer' = 'expense';
  const lower = raw.toLowerCase();

  if (
    lower.includes('received') ||
    lower.includes('payment received') ||
    lower.includes('credited') ||
    lower.includes('credit:') ||
    lower.includes('deposit') ||
    lower.includes('has sent you') ||
    lower.includes('cashed in')
  ) {
    type = 'income';
  } else if (
    lower.includes('transferred to') ||
    lower.includes('transfer to') ||
    lower.includes('cash out') ||
    lower.includes('cashed out')
  ) {
    type = 'transfer';
  } else {
    // Payment to merchant, bought airtime, debited, paid
    type = 'expense';
  }

  // 3. Sender / Recipient / Counterparty
  let counterparty = '';
  // "from KODJO MENSAH"
  const fromMatch = raw.match(/from\s+([A-Za-z0-9\s.-]+?)(?:\.|\s+Current|\s+Balance|\s+Ref|\s+Trans|$)/i);
  // "to AMA ASANTE" or "to 0244123456" or "to MELCOM"
  const toMatch = raw.match(/to\s+([A-Za-z0-9\s.-]+?)(?:\.|\s+Fee|\s+Current|\s+Balance|\s+Ref|\s+Trans|$)/i);
  // "paid to MERCHANT"
  const paidToMatch = raw.match(/paid\s+(?:to\s+)?([A-Za-z0-9\s.-]+?)(?:\.|\s+Ref|\s+Fee|\s+Trans|$)/i);

  if (type === 'income' && fromMatch) {
    counterparty = fromMatch[1].trim();
  } else if (paidToMatch) {
    counterparty = paidToMatch[1].trim();
  } else if (toMatch) {
    counterparty = toMatch[1].trim();
  }

  // Clean trailing punctuation
  counterparty = counterparty.replace(/[.,;:]+$/, '').trim();

  // 4. Reference / Transaction ID
  let reference = '';
  const refMatch = raw.match(/(?:Ref(?:erence)?|Trans(?:action)?\s*ID|Txn\s*ID)[:\s]+([A-Za-z0-9]+)/i);
  if (refMatch) {
    reference = refMatch[1].trim();
  }

  // 5. Transfer / Service Fee
  let fee: number | undefined;
  const feeMatch = raw.match(/Fee(?:\s*charged)?[:\s]*(?:GHS|GHC|GH¢)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
  if (feeMatch) {
    const parsedFee = parseFloat(feeMatch[1]);
    if (!isNaN(parsedFee)) {
      fee = parsedFee;
    }
  }

  // 6. Build intuitive description
  let description = '';
  if (counterparty) {
    if (type === 'income') {
      description = `Received from ${counterparty}`;
    } else if (type === 'transfer') {
      description = `Transfer to ${counterparty}`;
    } else {
      description = `Paid to ${counterparty}`;
    }
  } else {
    if (type === 'income') {
      description = 'MoMo / Bank Deposit Received';
    } else if (type === 'transfer') {
      description = 'MoMo Transfer Out';
    } else {
      description = 'MoMo / Bank Card Payment';
    }
  }

  if (reference) {
    description += ` (${reference})`;
  }

  const category = detectCategory(counterparty || description, type);

  return {
    type,
    amount,
    currency,
    category,
    description,
    date: todayIso,
    reference: reference || undefined,
    senderOrRecipient: counterparty || undefined,
    fee,
    confidence: counterparty ? 0.95 : 0.8,
    source: 'sms_regex',
  };
}

export const parseGhanaMoMoSms = parseMoMoSMS;


