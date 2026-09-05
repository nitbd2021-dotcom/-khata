import { Customer, PaymentMethod, Transaction, User } from '../types';
import { formatBanglaPaymentMethod, formatBanglaTxType } from './googleSheetsService';

/**
 * Normalizes Bengali numerals (০-৯) to standard Arabic digits (0-9)
 */
export const normalizeBanglaDigits = (str: string): string => {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return (str || '').replace(/[০-৯]/g, d => String(banglaDigits.indexOf(d)));
};

/**
 * Converts English numbers to Bengali numerals
 */
export const toBanglaNumber = (num: number | string): string => {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, d => banglaDigits[Number(d)]);
};

/**
 * Formats a phone number for WhatsApp wa.me link
 * Accepts 017..., +88017..., 88017... or Bengali numerals
 */
export const formatWhatsAppPhone = (rawPhone: string): string => {
  const normalized = normalizeBanglaDigits(rawPhone || '');
  let digits = normalized.replace(/[^0-9]/g, '');
  if (digits.startsWith('880')) {
    return digits;
  }
  if (digits.startsWith('01')) {
    return '88' + digits;
  }
  if (digits.length === 10 && digits.startsWith('1')) {
    return '880' + digits;
  }
  return digits;
};

/**
 * Generates a clean, professional voucher/receipt number
 */
export const generateVoucherNumber = (transaction: Transaction, customer?: Customer): string => {
  const d = new Date(transaction.date);
  const yearMonth = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const codePrefix = customer?.code ? `${customer.code}-` : '';
  const cleanId = transaction.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || 'TX01';
  return `VCH-${codePrefix}${yearMonth}-${cleanId}`;
};

/**
 * Calculates the exact balance before this transaction took place
 */
export const calculatePreviousBalance = (transaction: Transaction): number => {
  const { type, amount, balanceAfter } = transaction;
  const numAmount = Math.max(0, Number(amount) || 0);

  if (type === 'credit_given' || type === 'loan_given') {
    return balanceAfter - numAmount;
  }
  if (type === 'payment_received') {
    return balanceAfter + numAmount;
  }
  if (type === 'credit_taken' || type === 'loan_taken') {
    return balanceAfter + numAmount;
  }
  if (type === 'payment_given') {
    return balanceAfter - numAmount;
  }
  return balanceAfter;
};

/**
 * Formats date and time nicely into Bengali text
 */
export const formatBanglaDateTime = (isoDateStr: string): string => {
  try {
    const date = new Date(isoDateStr);
    const months = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    const day = toBanglaNumber(date.getDate());
    const month = months[date.getMonth()];
    const year = toBanglaNumber(date.getFullYear());
    
    let hours = date.getHours();
    const minutes = toBanglaNumber(String(date.getMinutes()).padStart(2, '0'));
    const isPm = hours >= 12;
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const hourStr = toBanglaNumber(hours);
    const period = isPm ? 'দুপুর/সন্ধ্যা' : 'সকাল';

    return `${day} ${month} ${year}, ${period} ${hourStr}:${minutes}`;
  } catch {
    return isoDateStr;
  }
};

/**
 * Generates an elegantly formatted Bengali WhatsApp receipt message
 */
export const generateReceiptWhatsAppText = (
  transaction: Transaction,
  customer: Customer,
  user: User,
  voucherNo?: string
): string => {
  const vch = voucherNo || generateVoucherNumber(transaction, customer);
  const prevBal = calculatePreviousBalance(transaction);
  const currBal = transaction.balanceAfter;
  const dateBangla = formatBanglaDateTime(transaction.date);
  const txTypeStr = formatBanglaTxType(transaction.type);
  const methodStr = formatBanglaPaymentMethod(transaction.paymentMethod);

  let balanceLine = '';
  if (currBal > 0) {
    balanceLine = `👉 *বর্তমান মোট বাকি (পাওনা):* ৳${currBal.toLocaleString('bn-BD')}`;
  } else if (currBal < 0) {
    balanceLine = `👉 *বর্তমান মোট দেনা:* ৳${Math.abs(currBal).toLocaleString('bn-BD')}`;
  } else {
    balanceLine = `👉 *বর্তমান ব্যালেন্স:* ৳০ (সম্পূর্ণ পরিশোধিত)`;
  }

  let prevBalLine = '';
  if (prevBal > 0) {
    prevBalLine = `📊 *পূর্বের বাকি:* ৳${prevBal.toLocaleString('bn-BD')}`;
  } else if (prevBal < 0) {
    prevBalLine = `📊 *পূর্বের দেনা:* ৳${Math.abs(prevBal).toLocaleString('bn-BD')}`;
  } else {
    prevBalLine = `📊 *পূর্বের বাকি:* ৳০`;
  }

  const lines = [
    `🧾 *লেনদেন ডিজিটাল রসিদ / ক্যাশ মেমো*`,
    `🏪 *${user.shopName}*`,
  ];

  if (user.shopCategory) {
    lines.push(`🏷️ ধরন: ${user.shopCategory}`);
  }
  if (user.phone) {
    lines.push(`📞 যোগাযোগ: ${user.phone}`);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`📋 *রসিদ নং:* ${vch}`);
  lines.push(`🗓 *তারিখ:* ${dateBangla}`);
  lines.push(`👤 *গ্রাহকের নাম:* ${customer.name}${customer.code ? ` (${customer.code})` : ''}`);
  if (customer.phone && customer.phone !== '০১৭...') {
    lines.push(`📱 *মোবাইল:* ${customer.phone}`);
  }
  if (customer.address) {
    lines.push(`📍 *ঠিকানা:* ${customer.address}`);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`📌 *লেনদেনের ধরন:* ${txTypeStr}`);
  lines.push(`💵 *টাকার পরিমাণ:* ৳${transaction.amount.toLocaleString('bn-BD')}`);
  lines.push(`💳 *পেমেন্ট মাধ্যম:* ${methodStr}`);
  if (transaction.description && transaction.description.trim()) {
    lines.push(`📝 *বিবরণ:* ${transaction.description.trim()}`);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(prevBalLine);
  lines.push(balanceLine);
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`হিসাব স্বচ্ছ রাখতে ডিজিটাল রসিদ সংরক্ষণ করুন।`);
  lines.push(`লেনদেনের জন্য ধন্যবাদ! 🙏`);

  return lines.join('\n');
};

/**
 * Builds the wa.me URL
 */
export const buildWhatsAppUrl = (phone: string, text: string): string => {
  const clean = formatWhatsAppPhone(phone);
  const encoded = encodeURIComponent(text);
  if (clean) {
    return `https://wa.me/${clean}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
};

/**
 * Renders the receipt directly onto an HTML5 Canvas and exports a high-resolution PNG Data URL.
 */
export const renderReceiptToCanvas = async (
  transaction: Transaction,
  customer: Customer,
  user: User,
  voucherNo: string,
  qrDataUrl?: string
): Promise<string> => {
  const canvas = document.createElement('canvas');
  // High resolution 2x Retina canvas
  const scale = 2;
  const width = 640;
  const height = 860;
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context could not be created');

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Outer border with subtle rounded effect
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // Top header banner
  const isReceived = transaction.type === 'payment_received';
  const isCredit = transaction.type === 'credit_given';
  const headerBg = isReceived ? '#065f46' : isCredit ? '#991b1b' : '#0f766e';
  
  ctx.fillStyle = headerBg;
  ctx.fillRect(10, 10, width - 20, 120);

  // Store Name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px system-ui, -apple-system, sans-serif, "Noto Sans Bengali"';
  ctx.textAlign = 'center';
  ctx.fillText(user.shopName || 'আমার দোকান', width / 2, 48);

  // Store Subtitle / Category / Phone
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = '13px system-ui, -apple-system, sans-serif, "Noto Sans Bengali"';
  const subText = [
    user.shopCategory || 'ব্যবসার খাতা',
    user.phone ? `মোবাইল: ${user.phone}` : '',
    user.name ? `প্রোপাইটার: ${user.name}` : ''
  ].filter(Boolean).join(' • ');
  ctx.fillText(subText, width / 2, 72);

  // Badge on Header
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(width / 2 - 120, 84, 240, 26);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif, "Noto Sans Bengali"';
  ctx.fillText('ডিজিটাল লেনদেন রসিদ / ক্যাশ মেমো', width / 2, 101);

  // Voucher details row
  let y = 150;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = '12px system-ui, -apple-system, sans-serif, "Noto Sans Bengali"';
  ctx.fillText('রসিদ নং:', 24, y);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif, "Noto Sans Bengali"';
  ctx.fillText(voucherNo, 85, y);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748b';
  ctx.font = '12px system-ui, -apple-system, sans-serif, "Noto Sans Bengali"';
  ctx.fillText('তারিখ:', width - 180, y);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif, "Noto Sans Bengali"';
  ctx.fillText(formatBanglaDateTime(transaction.date), width - 24, y);

  // Divider
  y += 16;
  ctx.strokeStyle = '#e2e8f0';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(24, y);
  ctx.lineTo(width - 24, y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Customer Card Box
  y += 18;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(24, y, width - 48, 80);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(24, y, width - 48, 80);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = '11px system-ui, -apple-system, sans-serif, "Noto Sans Bengali"';
  ctx.fillText('গ্রাহকের বিবরণ:', 38, y + 20);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px system-ui, -apple-system, sans-serif, "Noto Sans Bengali"';
  ctx.fillText(customer.name, 38, y + 42);

  if (customer.code) {
    const nameWidth = ctx.measureText(customer.name).width;
    ctx.fillStyle = '#e0e7ff';
    ctx.fillRect(38 + nameWidth + 8, y + 28, 55, 18);
    ctx.fillStyle = '#3730a3';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(customer.code, 38 + nameWidth + 14, y + 41);
  }

  ctx.fillStyle = '#475569';
  ctx.font = '12px system-ui, -apple-system, sans-serif, "Noto Sans Bengali"';
  const custMeta = [
    customer.phone ? `ফোন: ${customer.phone}` : '',
    customer.address ? `ঠিকানা: ${customer.address}` : ''
  ].filter(Boolean).join('  |  ');
  ctx.fillText(custMeta || 'নিয়মিত কাস্টমার', 38, y + 64);

  // Transaction Highlight Box
  y += 98;
  const txBoxBg = isReceived ? '#ecfdf5' : '#fef2f2';
  const txBoxBorder = isReceived ? '#a7f3d0' : '#fecaca';
  ctx.fillStyle = txBoxBg;
  ctx.fillRect(24, y, width - 48, 125);
  ctx.strokeStyle = txBoxBorder;
  ctx.strokeRect(24, y, width - 48, 125);

  ctx.fillStyle = isReceived ? '#065f46' : '#991b1b';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif, "Noto Sans Bengali"';
  ctx.fillText(`লেনদেনের ধরন: ${formatBanglaTxType(transaction.type)}`, 38, y + 28);

  ctx.fillStyle = '#475569';
  ctx.font = '12px system-ui, -apple-system, sans-serif, "Noto Sans Bengali"';
  ctx.fillText(`পদ্ধতি: ${formatBanglaPaymentMethod(transaction.paymentMethod)}`, 38, y + 50);

  if (transaction.description) {
    ctx.fillText(`বিবরণ: ${transaction.description}`, 38, y + 72);
  }

  // Large Amount Display
  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748b';
  ctx.font = '11px system-ui, -apple-system, sans-serif, "Noto Sans Bengali"';
  ctx.fillText('টাকার পরিমাণ', width - 38, y + 36);

  ctx.fillStyle = isReceived ? '#059669' : '#dc2626';
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif, "Noto Sans Bengali"';
  ctx.fillText(`৳ ${transaction.amount.toLocaleString('bn-BD')}`, width - 38, y + 74);

  // Balance Ledger Summary
  y += 142;
  const prevBal = calculatePreviousBalance(transaction);
  const currBal = transaction.balanceAfter;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif, "Noto Sans Bengali"';
  ctx.fillText('খতিয়ান হিসাব বিবরণী:', 24, y);

  y += 14;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(24, y, width - 48, 120);
  ctx.strokeStyle = '#cbd5e1';
  ctx.strokeRect(24, y, width - 48, 120);

  // Row 1: Previous Balance
  ctx.fillStyle = '#475569';
  ctx.font = '13px system-ui, -apple-system, sans-serif, "Noto Sans Bengali"';
  ctx.fillText('পূর্বের ব্যালেন্স (বাকি)', 40, y + 30);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(`৳ ${prevBal.toLocaleString('bn-BD')}`, width - 40, y + 30);

  // Row 2: This Transaction
  ctx.textAlign = 'left';
  ctx.fillStyle = '#475569';
  ctx.fillText(`বর্তমান লেনদেন (${formatBanglaTxType(transaction.type)})`, 40, y + 60);
  ctx.textAlign = 'right';
  ctx.fillStyle = isReceived ? '#059669' : '#dc2626';
  ctx.fillText(`${isReceived ? '-' : '+'} ৳ ${transaction.amount.toLocaleString('bn-BD')}`, width - 40, y + 60);

  // Divider inside balance box
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(38, y + 75);
  ctx.lineTo(width - 38, y + 75);
  ctx.stroke();

  // Row 3: Current Net Balance
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif, "Noto Sans Bengali"';
  ctx.fillText('সর্বমোট বর্তমান বাকি:', 40, y + 98);

  ctx.textAlign = 'right';
  ctx.fillStyle = currBal > 0 ? '#b91c1c' : '#047857';
  ctx.font = 'bold 16px system-ui, -apple-system, sans-serif, "Noto Sans Bengali"';
  ctx.fillText(`৳ ${currBal.toLocaleString('bn-BD')}`, width - 40, y + 98);

  // QR Code + Footer Note
  y += 140;

  if (qrDataUrl) {
    try {
      const img = new Image();
      img.src = qrDataUrl;
      await new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });
      ctx.drawImage(img, 36, y, 90, 90);
    } catch {
      // ignore image failure
    }
  }

  // Footer text
  ctx.textAlign = 'left';
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif, "Noto Sans Bengali"';
  ctx.fillText('হিসাব স্বচ্ছ রাখতে ডিজিটাল রসিদ সংরক্ষণ করুন।', 140, y + 32);

  ctx.fillStyle = '#64748b';
  ctx.font = '11px system-ui, -apple-system, sans-serif, "Noto Sans Bengali"';
  ctx.fillText('লেনদেনের জন্য ধন্যবাদ! ডিজিটাল খাতা ও হিসাব সফটওয়্যার।', 140, y + 54);
  ctx.fillText('স্বয়ংক্রিয়ভাবে ক্লাউড গুগল শিট ডাটাবেজে সিঙ্ক সম্পন্ন।', 140, y + 74);

  // Bottom stamp line
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px system-ui, -apple-system, sans-serif';
  ctx.fillText(`POWERED BY DSR KHATA • VERIFIED RECEIPT ${voucherNo}`, width / 2, height - 20);

  return canvas.toDataURL('image/png');
};
