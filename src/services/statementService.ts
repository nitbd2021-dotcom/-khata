import { Customer, Transaction, User } from '../types';
import { formatBanglaPaymentMethod, formatBanglaTxType } from './googleSheetsService';
import { toBanglaNumber, formatBanglaDateTime, formatWhatsAppPhone } from './receiptService';

export type StatementPeriodType = 'all' | 'this_month' | 'last_month' | 'last_3_months' | 'custom';

export interface FilteredStatementData {
  periodType: StatementPeriodType;
  periodLabel: string;
  startDate?: string;
  endDate?: string;
  openingBalance: number;
  totalDebits: number;    // মোট বাকি দেওয়া বা বিক্রয় (+)
  totalCredits: number;   // মোট টাকা আদায় বা জমা (-)
  closingBalance: number; // সমাপনী স্থিতি (পাওনা/দেনা)
  statementNo: string;
  generatedAt: string;
  items: StatementItem[];
}

export interface StatementItem {
  index: number;
  id: string;
  date: string;
  voucherNo: string;
  description: string;
  type: string;
  typeLabel: string;
  paymentMethod: string;
  debit: number;   // বাকি/পাওনা বৃদ্ধি (+)
  credit: number;  // আদায়/পরিশোধ (-)
  runningBalance: number;
}

/**
 * Normalizes ISO date string or Date object to YYYY-MM-DD
 */
export const toDateKey = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    return d.toISOString().split('T')[0];
  } catch {
    return dateStr;
  }
};

/**
 * Calculates opening balance, sequential items with running balance, and closing balance
 * for a customer within a specified date period.
 */
export const generateCustomerStatementData = (
  customer: Customer,
  transactions: Transaction[],
  user: User,
  periodType: StatementPeriodType,
  customStart?: string,
  customEnd?: string
): FilteredStatementData => {
  // Only transactions of this customer
  const custTxs = transactions
    .filter(t => t.customerId === customer.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const now = new Date();
  let startLimit: Date | null = null;
  let endLimit: Date | null = null;
  let periodLabel = 'সকল লেনদেন';

  if (periodType === 'this_month') {
    startLimit = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    endLimit = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const months = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    periodLabel = `চলতি মাস (${months[now.getMonth()]} ${toBanglaNumber(now.getFullYear())})`;
  } else if (periodType === 'last_month') {
    startLimit = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    endLimit = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const months = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    const prevMonthIdx = (now.getMonth() + 11) % 12;
    const prevMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    periodLabel = `গত মাস (${months[prevMonthIdx]} ${toBanglaNumber(prevMonthYear)})`;
  } else if (periodType === 'last_3_months') {
    startLimit = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0);
    endLimit = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    periodLabel = 'শেষ ৩ মাস';
  } else if (periodType === 'custom' && customStart && customEnd) {
    startLimit = new Date(`${customStart}T00:00:00`);
    endLimit = new Date(`${customEnd}T23:59:59`);
    periodLabel = `${customStart} হতে ${customEnd}`;
  }

  // 1. Calculate Opening Balance: simulate balance before startLimit
  let openingBalance = 0;
  let periodTxs: Transaction[] = [];

  custTxs.forEach(tx => {
    const txDate = new Date(tx.date);
    const numAmount = Math.max(0, Number(tx.amount) || 0);

    const isDebit = tx.type === 'credit_given' || tx.type === 'loan_given';
    const isCredit = tx.type === 'payment_received' || tx.type === 'credit_taken' || tx.type === 'loan_taken';

    if (startLimit && txDate < startLimit) {
      if (isDebit) {
        openingBalance += numAmount;
      } else if (isCredit) {
        openingBalance -= numAmount;
      }
    } else if (!endLimit || txDate <= endLimit) {
      periodTxs.push(tx);
    }
  });

  // If "all" period is selected, openingBalance starts at 0 (or derived from earliest)
  if (periodType === 'all') {
    openingBalance = 0;
    periodTxs = custTxs;
  }

  // 2. Build rows with sequential running balance
  let currentBalance = openingBalance;
  let totalDebits = 0;
  let totalCredits = 0;

  const items: StatementItem[] = periodTxs.map((tx, idx) => {
    const numAmount = Math.max(0, Number(tx.amount) || 0);
    const isDebit = tx.type === 'credit_given' || tx.type === 'loan_given';
    const isCredit = tx.type === 'payment_received' || tx.type === 'credit_taken' || tx.type === 'loan_taken';

    let debit = 0;
    let credit = 0;

    if (isDebit) {
      debit = numAmount;
      totalDebits += numAmount;
      currentBalance += numAmount;
    } else {
      credit = numAmount;
      totalCredits += numAmount;
      currentBalance -= numAmount;
    }

    const d = new Date(tx.date);
    const yearMonth = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    const cleanId = tx.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || 'TX01';
    const voucherNo = `VCH-${customer.code ? `${customer.code}-` : ''}${yearMonth}-${cleanId}`;

    return {
      index: idx + 1,
      id: tx.id,
      date: tx.date,
      voucherNo,
      description: tx.description || 'নিয়মিত লেনদেন',
      type: tx.type,
      typeLabel: formatBanglaTxType(tx.type),
      paymentMethod: formatBanglaPaymentMethod(tx.paymentMethod),
      debit,
      credit,
      runningBalance: currentBalance,
    };
  });

  const nowStr = new Date().toISOString();
  const statementNo = `STM-${customer.code || 'CUST'}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

  return {
    periodType,
    periodLabel,
    startDate: customStart,
    endDate: customEnd,
    openingBalance,
    totalDebits,
    totalCredits,
    closingBalance: currentBalance,
    statementNo,
    generatedAt: nowStr,
    items,
  };
};

export interface StatementCustomOptions {
  shopName?: string;
  phone?: string;
  shopAddress?: string;
  title?: string;
  footerMessage?: string;
}

/**
 * Generates an elegant WhatsApp summary for the Statement
 */
export const generateStatementWhatsAppText = (
  customer: Customer,
  user: User,
  data: FilteredStatementData,
  customOptions?: StatementCustomOptions
): string => {
  const shopName = customOptions?.shopName?.trim() || user.shopName;
  const phone = customOptions?.phone !== undefined ? customOptions.phone.trim() : (user.phone || '');
  const address = customOptions?.shopAddress !== undefined ? customOptions.shopAddress.trim() : (user.shopAddress || '');
  const title = customOptions?.title?.trim() || 'কাস্টমার লেজার বিবরণী (Account Statement)';
  const footerMessage = customOptions?.footerMessage?.trim();

  const lines = [
    `📊 *${title}*`,
    `🏪 *${shopName}*`,
  ];

  if (phone) lines.push(`📞 যোগাযোগ: ${phone}`);
  if (address) lines.push(`📍 ঠিকানা: ${address}`);

  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`👤 *গ্রাহক:* ${customer.name}${customer.code ? ` (${customer.code})` : ''}`);
  if (customer.phone && customer.phone !== '০১৭...') lines.push(`📱 মোবাইল: ${customer.phone}`);
  lines.push(`📋 *স্টেটমেন্ট নং:* ${data.statementNo}`);
  lines.push(`🗓 *সময়কাল:* ${data.periodLabel}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`📌 *প্রারম্ভিক জের (Opening):* ৳${data.openingBalance.toLocaleString('bn-BD')}`);
  lines.push(`📈 *মোট বাকি / ক্রয় (+):* ৳${data.totalDebits.toLocaleString('bn-BD')}`);
  lines.push(`📉 *মোট জমা / পরিশোধ (-):* ৳${data.totalCredits.toLocaleString('bn-BD')}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);

  if (data.closingBalance > 0) {
    lines.push(`👉 *বর্তমান নিট বকেয়া (পাওনা):* ৳${data.closingBalance.toLocaleString('bn-BD')}`);
  } else if (data.closingBalance < 0) {
    lines.push(`👉 *বর্তমান দেনা স্থিতি:* ৳${Math.abs(data.closingBalance).toLocaleString('bn-BD')}`);
  } else {
    lines.push(`👉 *বর্তমান ব্যালেন্স:* ৳০ (সম্পূর্ণ পরিশোধিত) ✅`);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`মোট লেনদেন সংখ্যা: ${toBanglaNumber(data.items.length)} টি`);
  
  if (footerMessage) {
    lines.push(`📝 *বিশেষ বার্তা:* ${footerMessage}`);
  } else {
    lines.push(`স্বচ্ছ হিসাব ব্যবস্থাপনায় সাথে থাকার জন্য ধন্যবাদ! 🙏`);
  }

  return lines.join('\n');
};
