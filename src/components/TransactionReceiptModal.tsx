import React, { useEffect, useState, useRef } from 'react';
import { 
  X, 
  Send, 
  Download, 
  Printer, 
  Share2, 
  Copy, 
  Check, 
  CheckCircle2, 
  Store, 
  Phone, 
  Calendar, 
  CreditCard, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  FileText,
  AlertCircle
} from 'lucide-react';
import QRCode from 'qrcode';
import { Customer, Transaction, User } from '../types';
import { 
  buildWhatsAppUrl, 
  calculatePreviousBalance, 
  formatBanglaDateTime, 
  formatWhatsAppPhone, 
  generateReceiptWhatsAppText, 
  generateVoucherNumber, 
  renderReceiptToCanvas 
} from '../services/receiptService';
import { formatBanglaPaymentMethod, formatBanglaTxType } from '../services/googleSheetsService';

interface TransactionReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  customer: Customer | null;
  user: User;
  onAddNewTx?: () => void;
}

export const TransactionReceiptModal: React.FC<TransactionReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction,
  customer,
  user,
  onAddNewTx,
}) => {
  const [whatsappPhone, setWhatsappPhone] = useState<string>('');
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string>('');
  const [showPreviewText, setShowPreviewText] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string>('');

  const receiptRef = useRef<HTMLDivElement>(null);

  // Initialize data on modal open or transaction change
  useEffect(() => {
    if (!isOpen || !transaction || !customer) return;

    // Reset feedback
    setCopiedText(false);
    setCopiedLink(false);
    setShareFeedback('');

    // Prepopulate phone number
    const initialPhone = customer.phone && customer.phone !== '০১৭...' ? customer.phone : '';
    setWhatsappPhone(initialPhone);

    // Generate QR Code for receipt verification
    const voucherNo = generateVoucherNumber(transaction, customer);
    const qrPayload = JSON.stringify({
      vch: voucherNo,
      shop: user.shopName,
      cust: customer.name,
      code: customer.code || '',
      amount: transaction.amount,
      type: transaction.type,
      date: transaction.date,
    });

    QRCode.toDataURL(
      qrPayload,
      {
        width: 240,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      },
      (err, url) => {
        if (!err && url) {
          setQrDataUrl(url);
        }
      }
    );
  }, [isOpen, transaction?.id, customer?.id, user.shopName]);

  if (!isOpen || !transaction || !customer) return null;

  const voucherNo = generateVoucherNumber(transaction, customer);
  const prevBalance = calculatePreviousBalance(transaction);
  const currentBalance = transaction.balanceAfter;
  const isReceived = transaction.type === 'payment_received';
  const isCreditGiven = transaction.type === 'credit_given' || transaction.type === 'loan_given';
  const whatsappMessage = generateReceiptWhatsAppText(transaction, customer, user, voucherNo);
  const cleanPhone = formatWhatsAppPhone(whatsappPhone || customer.phone || '');

  // 1. Direct WhatsApp Send
  const handleSendWhatsApp = () => {
    const url = buildWhatsAppUrl(whatsappPhone || customer.phone || '', whatsappMessage);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // 2. Copy Message Text to clipboard
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = whatsappMessage;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    }
  };

  // 3. Download Receipt as PNG image
  const handleDownloadImage = async () => {
    try {
      setIsGeneratingImage(true);
      const dataUrl = await renderReceiptToCanvas(transaction, customer, user, voucherNo, qrDataUrl);
      const link = document.createElement('a');
      const safeCustName = customer.name.replace(/\s+/g, '_');
      link.download = `রসিদ_${safeCustName}_${voucherNo}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShareFeedback('ছবি সফলভাবে ডাউনলোড হয়েছে!');
      setTimeout(() => setShareFeedback(''), 3000);
    } catch (err) {
      console.error('Failed to download image:', err);
      setShareFeedback('ছবি তৈরিতে সমস্যা হয়েছে।');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // 4. Share Receipt Image (Web Share API with file fallback to text)
  const handleShareImage = async () => {
    try {
      setIsGeneratingImage(true);
      const dataUrl = await renderReceiptToCanvas(transaction, customer, user, voucherNo, qrDataUrl);
      setPreviewImage(dataUrl);

      // Try Web Share API with File
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `Receipt_${voucherNo}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `রসিদ: ${user.shopName} - ${customer.name}`,
          text: whatsappMessage,
          files: [file],
        });
        setShareFeedback('সফলভাবে শেয়ার করা হয়েছে!');
      } else if (navigator.share) {
        await navigator.share({
          title: `রসিদ: ${user.shopName} - ${customer.name}`,
          text: whatsappMessage,
        });
        setShareFeedback('টেক্সট রসিদ শেয়ার করা হয়েছে!');
      } else {
        // Fallback: download and prompt user
        handleDownloadImage();
        setShareFeedback('ডিভাইসে শেয়ার সাপোর্ট নেই, ছবি ডাউনলোড করা হলো।');
      }
      setTimeout(() => setShareFeedback(''), 3500);
    } catch (err) {
      console.warn('Share canceled or failed:', err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // 5. Native Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/65 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[96vh] flex flex-col print:shadow-none print:border-none print:max-h-full">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-100 bg-slate-50/70 print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                লেনদেনের ডিজিটাল রসিদ
              </h3>
              <p className="text-[11px] text-slate-500">
                সফলভাবে সংরক্ষিত ও শিটে সিঙ্ক হয়েছে
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-4 flex-1">

          {/* Feedback banner if any */}
          {shareFeedback && (
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center justify-between print:hidden">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{shareFeedback}</span>
              </span>
              <button onClick={() => setShareFeedback('')} className="text-emerald-700 hover:text-emerald-900">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* WHATSAPP ACTION CARD (Prominently Highlighted) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-emerald-100/40 border-2 border-emerald-300 shadow-xs print:hidden space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-xs">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 leading-snug flex items-center gap-1">
                    <span>WhatsApp-এ রসিদ পাঠান</span>
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium">
                    এক ক্লিকেই কাস্টমারের মোবাইলে মেমো চলে যাবে
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider">
                সহজ সমাধান
              </span>
            </div>

            {/* Mobile Number Input / Confirm */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <div className="relative flex-1">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={whatsappPhone}
                  onChange={e => setWhatsappPhone(e.target.value)}
                  placeholder="কাস্টমারের হোয়াটসঅ্যাপ নাম্বার (০১...)"
                  className="w-full bg-white border border-emerald-300 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                />
              </div>

              <button
                onClick={handleSendWhatsApp}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-xs sm:text-sm font-black transition active:scale-95 shadow-md hover:shadow-lg cursor-pointer shrink-0"
                title="হোয়াটসঅ্যাপে পাঠান"
              >
                <Send className="w-4 h-4" />
                <span>হোয়াটসঅ্যাপে পাঠান</span>
              </button>
            </div>

            {/* Secondary WhatsApp Actions: Copy Text & Preview Toggle */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                onClick={handleCopyText}
                className="inline-flex items-center gap-1 text-emerald-800 hover:text-emerald-950 font-bold bg-white px-2.5 py-1 rounded-lg border border-emerald-200 transition shadow-2xs cursor-pointer text-[11px]"
              >
                {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedText ? 'মেসেজ কপি হয়েছে!' : 'মেসেজ কপি করুন'}</span>
              </button>

              <button
                onClick={() => setShowPreviewText(!showPreviewText)}
                className="text-slate-600 hover:text-slate-900 font-semibold text-[11px] underline cursor-pointer"
              >
                {showPreviewText ? 'মেসেজ লুকান ▲' : 'মেসেজ প্রিভিউ দেখুন ▼'}
              </button>
            </div>

            {/* Expanded Text Preview */}
            {showPreviewText && (
              <div className="p-3 bg-white/90 rounded-xl border border-emerald-200 text-slate-800 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed text-[11px]">
                {whatsappMessage}
              </div>
            )}
          </div>

          {/* THE PRINTABLE / VISUAL RECEIPT CARD */}
          <div 
            ref={receiptRef}
            id="printable-receipt-card"
            className="bg-white rounded-2xl border-2 border-slate-200 p-4 sm:p-5 shadow-xs relative overflow-hidden print:border-none print:p-0 print:shadow-none"
          >
            {/* Top Store Header */}
            <div className="text-center pb-3 border-b-2 border-slate-200">
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-teal-100 text-teal-800 mb-1">
                <Store className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                {user.shopName || 'আমার দোকান'}
              </h2>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-600 font-medium mt-0.5 flex-wrap">
                {user.shopCategory && <span>{user.shopCategory}</span>}
                {user.shopCategory && user.phone && <span>•</span>}
                {user.phone && <span>মোবাইল: {user.phone}</span>}
                {user.name && <span>• প্রোপাইটার: {user.name}</span>}
              </div>
              <div className="mt-2 inline-block px-3 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                ডিজিটাল ক্যাশ মেমো / লেনদেন রসিদ
              </div>
            </div>

            {/* Voucher No & Date Row */}
            <div className="py-2.5 border-b border-dashed border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600 flex-wrap gap-1">
              <div>
                <span className="text-slate-400">রসিদ নং: </span>
                <span className="font-mono font-bold text-slate-900">{voucherNo}</span>
              </div>
              <div className="text-[11px] text-slate-700 font-bold">
                {formatBanglaDateTime(transaction.date)}
              </div>
            </div>

            {/* Customer Details */}
            <div className="py-2.5 border-b border-slate-100 flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">গ্রাহকের তথ্য</span>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="font-black text-slate-900 text-sm">{customer.name}</span>
                  {customer.code && (
                    <span className="px-1.5 py-0.2 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[10px] font-bold">
                      {customer.code}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                  {customer.phone && customer.phone !== '০১৭...' && (
                    <span>মোবাইল: {customer.phone}</span>
                  )}
                  {customer.address && (
                    <span>ঠিকানা: {customer.address}</span>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-right shrink-0">
                <span className={`px-2 py-0.5 rounded-lg text-xs font-black inline-block ${
                  isReceived
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}>
                  {formatBanglaTxType(transaction.type)}
                </span>
              </div>
            </div>

            {/* Transaction Highlight Box */}
            <div className={`my-3 p-3 rounded-xl border ${
              isReceived ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
            } flex items-center justify-between gap-3`}>
              <div>
                <span className="text-[11px] font-bold text-slate-600 block">
                  বিবরণ: {transaction.description || formatBanglaTxType(transaction.type)}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-0.5 block">
                  পদ্ধতি: {formatBanglaPaymentMethod(transaction.paymentMethod)}
                </span>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">পরিমাণ</span>
                <span className={`text-xl sm:text-2xl font-black ${
                  isReceived ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  {isReceived ? '-' : '+'} ৳{transaction.amount.toLocaleString('bn-BD')}
                </span>
              </div>
            </div>

            {/* Running Balance Ledger Table */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-600">
                <span>পূর্বের ব্যালেন্স (বাকি):</span>
                <span className="font-bold text-slate-900">৳{prevBalance.toLocaleString('bn-BD')}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>বর্তমান লেনদেন ({formatBanglaTxType(transaction.type)}):</span>
                <span className={`font-bold ${isReceived ? 'text-emerald-700' : 'text-red-700'}`}>
                  {isReceived ? '-' : '+'} ৳{transaction.amount.toLocaleString('bn-BD')}
                </span>
              </div>
              <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between font-bold text-sm">
                <span className="text-slate-900">সর্বমোট বর্তমান বাকি:</span>
                <span className={`font-black ${currentBalance > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  ৳{currentBalance.toLocaleString('bn-BD')}
                </span>
              </div>
            </div>

            {/* Bottom Verification & QR Code */}
            <div className="mt-3 pt-3 border-t border-dashed border-slate-200 flex items-center justify-between gap-3">
              <div className="text-[10px] text-slate-500 leading-tight">
                <p className="font-bold text-slate-700">হিসাব স্বচ্ছ রাখতে ডিজিটাল রসিদ সংরক্ষণ করুন।</p>
                <p className="mt-0.5">গুগল শিট ক্লাউডে স্বয়ংক্রিয় সিঙ্ক সম্পন্ন। ধন্যবাদ!</p>
              </div>

              {qrDataUrl && (
                <div className="shrink-0 text-center">
                  <img 
                    src={qrDataUrl} 
                    alt="Receipt QR Code" 
                    className="w-14 h-14 rounded-lg border border-slate-200 p-0.5 bg-white shadow-2xs"
                  />
                  <span className="text-[9px] text-slate-400 font-mono block mt-0.5">QR ভেরিফিকেশন</span>
                </div>
              )}
            </div>
          </div>

          {/* SECONDARY SHARING BUTTONS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 print:hidden">
            <button
              onClick={handleShareImage}
              disabled={isGeneratingImage}
              className="flex items-center justify-center gap-1.5 py-2 px-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
              title="ডিভাইসের যে কোনো অ্যাপে ছবি শেয়ার করুন"
            >
              <Share2 className="w-3.5 h-3.5 text-teal-600" />
              <span>{isGeneratingImage ? 'প্রস্তুত হচ্ছে...' : 'ছবি শেয়ার'}</span>
            </button>

            <button
              onClick={handleDownloadImage}
              disabled={isGeneratingImage}
              className="flex items-center justify-center gap-1.5 py-2 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
              title="রসিদের স্পষ্ট PNG ছবি ডাউনলোড করুন"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>ছবি ডাউনলোড</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              title="প্রিন্ট / PDF সংরক্ষণ"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>প্রিন্ট / PDF</span>
            </button>

            <button
              onClick={handleCopyText}
              className="flex items-center justify-center gap-1.5 py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              title="মেসেজ কপি করুন"
            >
              <Copy className="w-3.5 h-3.5 text-slate-600" />
              <span>{copiedText ? 'কপি হয়েছে' : 'টেক্সট কপি'}</span>
            </button>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 print:hidden shrink-0">
          {onAddNewTx ? (
            <button
              onClick={() => {
                onClose();
                onAddNewTx();
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>নতুন লেনদেন লিখুন</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shadow-sm"
          >
            সম্পন্ন / বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
};
