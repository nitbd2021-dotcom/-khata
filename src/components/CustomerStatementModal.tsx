import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Send, 
  Copy, 
  Check, 
  Calendar, 
  FileText, 
  Store, 
  Phone, 
  MapPin, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertTriangle, 
  CheckCircle2, 
  Filter,
  Layers,
  ChevronRight,
  SlidersHorizontal,
  RotateCcw,
  Save,
  MessageSquare,
  Building2,
  Eye,
  Pencil,
  Sparkles,
  CheckCheck
} from 'lucide-react';
import QRCode from 'qrcode';
import { Customer, Transaction, User } from '../types';
import { 
  FilteredStatementData, 
  generateCustomerStatementData, 
  generateStatementWhatsAppText, 
  StatementPeriodType 
} from '../services/statementService';
import { formatBanglaDateTime, formatWhatsAppPhone, toBanglaNumber } from '../services/receiptService';

interface CustomerStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  transactions: Transaction[];
  user: User;
}

export const CustomerStatementModal: React.FC<CustomerStatementModalProps> = ({
  isOpen,
  onClose,
  customer,
  transactions,
  user,
}) => {
  const [periodType, setPeriodType] = useState<StatementPeriodType>('all');
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [customEnd, setCustomEnd] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [statementData, setStatementData] = useState<FilteredStatementData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [shareFeedback, setShareFeedback] = useState<string>('');

  // Storage key for user-specific statement customizations
  const statementStorageKey = `khata_statement_custom_prefs_${user.id}`;

  // Customization States (with localStorage memory)
  const [customShopName, setCustomShopName] = useState<string>(user.shopName);
  const [customShopAddress, setCustomShopAddress] = useState<string>(user.shopAddress || '');
  const [customPhone, setCustomPhone] = useState<string>(user.phone || '');
  const [customStatementTitle, setCustomStatementTitle] = useState<string>('ডিজিটাল খাতা লেজার বিবরণী');
  const [customFooterMessage, setCustomFooterMessage] = useState<string>(
    '* এটি একটি কম্পিউটারাইজড ডিজিটাল লেজার স্টেটমেন্ট। এতে কোনো ভুলত্রুটি পরিলক্ষিত হলে অনুগ্রহ করে তিন (৩) কার্যদিবসের মধ্যে DSR বা বিক্রয় প্রতিনিধির সাথে যোগাযোগ করার অনুরোধ করা হলো।'
  );
  const [customPaymentNote, setCustomPaymentNote] = useState<string>('');
  const [showSignatures, setShowSignatures] = useState<boolean>(true);
  const [showQrCode, setShowQrCode] = useState<boolean>(true);
  const [showSummaryCards, setShowSummaryCards] = useState<boolean>(true);

  // Customization panel expand/collapse and toast message
  const [isCustomizing, setIsCustomizing] = useState<boolean>(false);
  const [customSaveToast, setCustomSaveToast] = useState<string>('');

  const statementRef = useRef<HTMLDivElement>(null);

  // Load saved preferences on mount or when user changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(statementStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.shopName) setCustomShopName(parsed.shopName);
        if (parsed.shopAddress !== undefined) setCustomShopAddress(parsed.shopAddress);
        if (parsed.phone !== undefined) setCustomPhone(parsed.phone);
        if (parsed.statementTitle) setCustomStatementTitle(parsed.statementTitle);
        if (parsed.footerMessage !== undefined) setCustomFooterMessage(parsed.footerMessage);
        if (parsed.paymentNote !== undefined) setCustomPaymentNote(parsed.paymentNote);
        if (typeof parsed.showSignatures === 'boolean') setShowSignatures(parsed.showSignatures);
        if (typeof parsed.showQrCode === 'boolean') setShowQrCode(parsed.showQrCode);
        if (typeof parsed.showSummaryCards === 'boolean') setShowSummaryCards(parsed.showSummaryCards);
        return;
      }
    } catch (err) {
      console.warn('Error reading saved statement settings:', err);
    }

    // Default initialization
    setCustomShopName(user.shopName);
    setCustomShopAddress(user.shopAddress || '');
    setCustomPhone(user.phone || '');
  }, [user.id, user.shopName, user.shopAddress, user.phone, statementStorageKey]);

  // Save current customization as default
  const handleSaveCustomPrefs = () => {
    try {
      const prefs = {
        shopName: customShopName,
        shopAddress: customShopAddress,
        phone: customPhone,
        statementTitle: customStatementTitle,
        footerMessage: customFooterMessage,
        paymentNote: customPaymentNote,
        showSignatures,
        showQrCode,
        showSummaryCards,
      };
      localStorage.setItem(statementStorageKey, JSON.stringify(prefs));
      setCustomSaveToast('কাস্টমাইজেশন তথ্য ডিফল্ট হিসেবে সংরক্ষিত হয়েছে!');
      setTimeout(() => setCustomSaveToast(''), 3000);
    } catch (err) {
      console.error('Failed to save statement preferences:', err);
    }
  };

  // Reset customizations to current user account default
  const handleResetCustomPrefs = () => {
    setCustomShopName(user.shopName);
    setCustomShopAddress(user.shopAddress || '');
    setCustomPhone(user.phone || '');
    setCustomStatementTitle('ডিজিটাল খাতা লেজার বিবরণী');
    setCustomFooterMessage(
      '* এটি একটি কম্পিউটারাইজড ডিজিটাল লেজার স্টেটমেন্ট। এতে কোনো ভুলত্রুটি পরিলক্ষিত হলে অনুগ্রহ করে তিন (৩) কার্যদিবসের মধ্যে DSR বা বিক্রয় প্রতিনিধির সাথে যোগাযোগ করার অনুরোধ করা হলো।'
    );
    setCustomPaymentNote('');
    setShowSignatures(true);
    setShowQrCode(true);
    setShowSummaryCards(true);

    try {
      localStorage.removeItem(statementStorageKey);
      setCustomSaveToast('ডিফল্ট সেটিংসে সফলভাবে রিসেট করা হয়েছে!');
      setTimeout(() => setCustomSaveToast(''), 3000);
    } catch (err) {
      console.error('Failed to reset statement preferences:', err);
    }
  };

  // Quick preset messages for footer
  const quickFooterPresets = [
    {
      id: 'default',
      title: 'ডিফল্ট নোটিশ',
      text: '* এটি একটি কম্পিউটারাইজড ডিজিটাল লেজার স্টেটমেন্ট। এতে কোনো ভুলত্রুটি পরিলক্ষিত হলে অনুগ্রহ করে তিন (৩) কার্যদিবসের মধ্যে DSR বা বিক্রয় প্রতিনিধির সাথে যোগাযোগ করার অনুরোধ করা হলো।'
    },
    {
      id: 'urgent',
      title: 'বকেয়া তাগাদা',
      text: 'সম্মানিত গ্রাহক, উল্লেখিত বকেয়া টাকাটি আগামী ৭ দিনের মধ্যে পরিশোধ করার জন্য বিশেষভাবে অনুরোধ করা হলো। কোনো গরমিল থাকলে দ্রুত আমাদের জানান।'
    },
    {
      id: 'payment',
      title: 'বিকাশ/নগদ পেমেন্ট',
      text: `বকেয়া পরিশোধের সহজ মাধ্যম: বিকাশ / নগদ (পার্সোনাল): ${customPhone || user.phone || '০১৭XXXXXXXX'}। টাকা পরিশোধের পর অনুগ্রহ করে এসএমএস দিয়ে নিশ্চিত করুন।`
    },
    {
      id: 'appreciation',
      title: 'ধন্যবাদ ও শুভেচ্ছা',
      text: 'আমাদের সাথে নিয়মিত লেনদেন ও ব্যবসার জন্য আন্তরিক ধন্যবাদ। আপনার ব্যবসার উত্তরোত্তর উন্নতি ও সমৃদ্ধি কামনা করি।'
    }
  ];

  // Re-generate statement whenever customer, transactions, or date filters change
  useEffect(() => {
    if (!isOpen || !customer) return;

    const data = generateCustomerStatementData(
      customer,
      transactions,
      user,
      periodType,
      customStart,
      customEnd
    );
    setStatementData(data);

    // Generate Verification QR Code
    const qrPayload = JSON.stringify({
      stm: data.statementNo,
      shop: customShopName || user.shopName,
      cust: customer.name,
      code: customer.code || '',
      bal: data.closingBalance,
      period: data.periodLabel,
      date: data.generatedAt,
    });

    QRCode.toDataURL(
      qrPayload,
      {
        width: 140,
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
  }, [isOpen, customer, transactions, user, periodType, customStart, customEnd, customShopName]);

  if (!isOpen || !customer || !statementData) return null;

  // Print Statement Handler (triggers clean A4 browser print/PDF)
  const handlePrintOrPdf = () => {
    const printContent = statementRef.current;
    if (!printContent) {
      window.print();
      return;
    }

    // Try hidden iframe approach first for seamless in-page printing (safe for iframes & mobile)
    try {
      let printFrame = document.getElementById('printable-statement-iframe') as HTMLIFrameElement;
      if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'printable-statement-iframe';
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        document.body.appendChild(printFrame);
      }

      const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(`
          <!DOCTYPE html>
          <html lang="bn">
          <head>
            <meta charset="UTF-8">
            <title>${customStatementTitle || 'স্টেটমেন্ট'}_${customer.name}_${statementData.statementNo}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap');
              body {
                font-family: 'Hind Siliguri', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #ffffff;
                color: #0f172a;
                margin: 0;
                padding: 16px;
              }
              @page {
                size: A4 portrait;
                margin: 8mm;
              }
              @media print {
                body {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
          </html>
        `);
        frameDoc.close();

        setTimeout(() => {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        }, 500);
        return;
      }
    } catch (e) {
      console.warn('Iframe print error, falling back to window.print', e);
    }

    // Standalone printable window or fallback
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8">
        <title>${customStatementTitle || 'স্টেটমেন্ট'}_${customer.name}_${statementData.statementNo}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap');
          body {
            font-family: 'Hind Siliguri', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #ffffff;
            color: #0f172a;
            margin: 0;
            padding: 0;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body class="p-4 sm:p-8 bg-white">
        ${printContent.innerHTML}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Download Standalone Statement Document
  const handleDownloadHtmlFile = () => {
    const printContent = statementRef.current;
    if (!printContent) return;

    const fullHtml = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${customStatementTitle || 'স্টেটমেন্ট'}_${customer.name}_${statementData.statementNo}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap');
    body {
      font-family: 'Hind Siliguri', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      padding: 20px 10px;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body class="flex flex-col items-center">
  <div class="no-print mb-4 flex gap-2">
    <button onclick="window.print()" style="background:#059669;color:#fff;padding:8px 16px;border-radius:8px;font-weight:bold;border:none;cursor:pointer;">
      🖨️ প্রিন্ট অথবা পিডিএফ হিসেবে সেভ করুন
    </button>
  </div>
  <div class="w-full max-w-3xl bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
    ${printContent.innerHTML}
  </div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${customStatementTitle || 'স্টেটমেন্ট'}_${customer.name}_${statementData.statementNo}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // WhatsApp Share Handler
  const handleShareWhatsApp = () => {
    const text = generateStatementWhatsAppText(customer, user, statementData, {
      shopName: customShopName,
      phone: customPhone,
      shopAddress: customShopAddress,
      title: customStatementTitle,
      footerMessage: [customFooterMessage, customPaymentNote].filter(Boolean).join('\n'),
    });
    let cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('01')) {
      cleanPhone = '88' + cleanPhone;
    }
    const encoded = encodeURIComponent(text);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(url, '_blank');
  };

  // Copy Statement Text Handler
  const handleCopyText = async () => {
    const text = generateStatementWhatsAppText(customer, user, statementData, {
      shopName: customShopName,
      phone: customPhone,
      shopAddress: customShopAddress,
      title: customStatementTitle,
      footerMessage: [customFooterMessage, customPaymentNote].filter(Boolean).join('\n'),
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setShareFeedback('স্টেটমেন্ট বিবরণী সফলভাবে কপি হয়েছে!');
      setTimeout(() => {
        setCopiedText(false);
        setShareFeedback('');
      }, 2500);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedText(true);
      setShareFeedback('স্টেটমেন্ট বিবরণী কপি হয়েছে!');
      setTimeout(() => {
        setCopiedText(false);
        setShareFeedback('');
      }, 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs print:p-0 print:bg-white overflow-y-auto">
      <div className="bg-slate-50 rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col print:shadow-none print:border-none print:max-h-full print:bg-white">
        
        {/* Top Modal Header & Period Control (Hidden in Print) */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4 shrink-0 print:hidden space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5 sm:space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    কাস্টমার লেজার স্টেটমেন্ট (PDF Statement)
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                    A4 রেডি
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {customer.name} {customer.code ? `(${customer.code})` : ''} • {statementData.periodLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
                title="বন্ধ করুন"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Period Filter Buttons */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                <span>সময়কাল:</span>
              </span>

              <button
                type="button"
                onClick={() => setPeriodType('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  periodType === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                সকল লেনদেন
              </button>

              <button
                type="button"
                onClick={() => setPeriodType('this_month')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  periodType === 'this_month'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                চলতি মাস
              </button>

              <button
                type="button"
                onClick={() => setPeriodType('last_month')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  periodType === 'last_month'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                গত মাস
              </button>

              <button
                type="button"
                onClick={() => setPeriodType('last_3_months')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  periodType === 'last_3_months'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                শেষ ৩ মাস
              </button>

              <button
                type="button"
                onClick={() => setPeriodType('custom')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  periodType === 'custom'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                নির্দিষ্ট তারিখ
              </button>
            </div>

            {/* Print / Download Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintOrPdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                title="পিডিএফ সেভ করুন অথবা প্রিন্ট করুন"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>পিডিএফ / প্রিন্ট করুন</span>
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition cursor-pointer"
                title="হোয়াটসঅ্যাপে পাঠান"
              >
                <Send className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">হোয়াটসঅ্যাপ</span>
              </button>

              <button
                onClick={handleCopyText}
                className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition cursor-pointer"
                title="স্টেটমেন্ট টেক্সট কপি করুন"
              >
                {copiedText ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Customization Toggle & Quick Status Bar */}
            <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 flex-wrap">
              <button
                type="button"
                onClick={() => setIsCustomizing(prev => !prev)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isCustomizing
                    ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-300'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>স্টেটমেন্ট কাস্টমাইজ করুন (দোকানের নাম, ফুটার নোট)</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                  isCustomizing ? 'bg-white/20 text-white' : 'bg-indigo-200/70 text-indigo-900'
                }`}>
                  {isCustomizing ? 'লুকান' : 'এডিট'}
                </span>
              </button>

              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="truncate max-w-[200px] font-semibold text-slate-700">
                  🏪 {customShopName || user.shopName}
                </span>
                {customPaymentNote && (
                  <span className="hidden sm:inline bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 font-medium">
                    💳 পেমেন্ট তথ্য যুক্ত
                  </span>
                )}
              </div>
            </div>

            {/* Expandable Customization Settings Card */}
            {isCustomizing && (
              <div className="mt-2 p-3.5 sm:p-4.5 bg-slate-50 border border-indigo-200/80 rounded-2xl space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        পিডিএফ ও প্রিন্ট স্টেটমেন্ট কাস্টমাইজেশন
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        এখানে পরিবর্তিত তথ্য সরাসরি স্টেটমেন্ট প্রিভিউ, ডাউনলোড ও হোয়াটসঅ্যাপ টেক্সটে যুক্ত হবে।
                      </p>
                    </div>
                  </div>

                  {customSaveToast && (
                    <div className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-lg border border-emerald-300 flex items-center gap-1">
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{customSaveToast}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Shop & Letterhead Info */}
                  <div className="space-y-3 bg-white p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>দোকান ও ব্র্যান্ডিং তথ্য</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        দোকানের নাম (Shop Name):
                      </label>
                      <input
                        type="text"
                        value={customShopName}
                        onChange={e => setCustomShopName(e.target.value)}
                        placeholder={user.shopName}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        স্টেটমেন্টের শিরোনাম (Statement Title):
                      </label>
                      <input
                        type="text"
                        value={customStatementTitle}
                        onChange={e => setCustomStatementTitle(e.target.value)}
                        placeholder="যেমন: ডিজিটাল খাতা লেজার বিবরণী"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          মোবাইল নম্বর:
                        </label>
                        <input
                          type="text"
                          value={customPhone}
                          onChange={e => setCustomPhone(e.target.value)}
                          placeholder={user.phone || '০১৭XXXXXXXX'}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          দোকানের ঠিকানা:
                        </label>
                        <input
                          type="text"
                          value={customShopAddress}
                          onChange={e => setCustomShopAddress(e.target.value)}
                          placeholder={user.shopAddress || 'ঠিকানা'}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Footer Note, Presets & Payment Note */}
                  <div className="space-y-3 bg-white p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                      <span>ফুটার বার্তা ও বিশেষ নির্দেশিকা</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          ফুটার মেসেজ (Footer Message):
                        </label>
                      </div>
                      <textarea
                        rows={2}
                        value={customFooterMessage}
                        onChange={e => setCustomFooterMessage(e.target.value)}
                        placeholder="স্টেটমেন্টের নিচের বার্তা লিখুন..."
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-indigo-500 resize-none"
                      />
                    </div>

                    {/* Quick Preset Buttons */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">
                        রেডিমেড মেসেজ সিলেক্ট করুন:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {quickFooterPresets.map(preset => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setCustomFooterMessage(preset.text)}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 transition font-medium cursor-pointer"
                          >
                            {preset.title}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        পেমেন্ট নোট / বিকাশ নম্বর (ঐচ্ছিক):
                      </label>
                      <input
                        type="text"
                        value={customPaymentNote}
                        onChange={e => setCustomPaymentNote(e.target.value)}
                        placeholder="যেমন: বিকাশ / নগদ (পার্সোনাল): ০১৭XXXXXXXX"
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Display Visibility Toggles & Actions */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200 flex-wrap">
                  <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs text-slate-700">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showSignatures}
                        onChange={e => setShowSignatures(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                      />
                      <span className="text-[11px] font-semibold">স্বাক্ষর ব্লক</span>
                    </label>

                    <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showQrCode}
                        onChange={e => setShowQrCode(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                      />
                      <span className="text-[11px] font-semibold">QR কোড</span>
                    </label>

                    <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showSummaryCards}
                        onChange={e => setShowSummaryCards(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                      />
                      <span className="text-[11px] font-semibold">সামারি কার্ডস</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetCustomPrefs}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold transition cursor-pointer"
                      title="ডিফল্ট তথ্যে ফিরে যান"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>রিসেট</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveCustomPrefs}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
                      title="ভবিষ্যতের স্টেটমেন্টের জন্য সংরক্ষণ করুন"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>ডিফল্ট সেভ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCustomizing(false)}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-600" />
                      <span>প্রিভিউ দেখুন</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Custom Date Inputs if 'custom' selected */}
          {periodType === 'custom' && (
            <div className="flex items-center gap-2 pt-2 text-xs bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100">
              <span className="font-bold text-slate-700">হতে:</span>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
              />
              <span className="font-bold text-slate-700">পর্যন্ত:</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}

          {shareFeedback && (
            <div className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{shareFeedback}</span>
            </div>
          )}
        </div>

        {/* Scrollable Printable Statement Body */}
        <div className="overflow-y-auto p-3 sm:p-6 flex-1 bg-slate-100 print:p-0 print:bg-white print:overflow-visible">
          
          {/* Printable Sheet Container (Styled like standard A4 letterhead) */}
          <div 
            ref={statementRef}
            id="customer-statement-printable-sheet"
            className="bg-white rounded-2xl p-5 sm:p-8 shadow-sm border border-slate-200 max-w-3xl mx-auto space-y-6 print:border-none print:shadow-none print:p-0 print:max-w-none text-slate-900"
          >
            {/* Header: Shop / Distributor Letterhead */}
            <div className="border-b-2 border-slate-900 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-bold tracking-wider uppercase mb-1">
                    {customStatementTitle || 'ডিজিটাল খাতা লেজার বিবরণী'}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                    {customShopName || user.shopName}
                  </h1>
                  {user.shopCategory && (
                    <p className="text-xs font-bold text-slate-600 mt-0.5">
                      {user.shopCategory}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    {(customShopAddress || user.shopAddress) ? `ঠিকানা: ${customShopAddress || user.shopAddress}` : ''}
                    {(customPhone || user.phone) ? ` • মোবাইল: ${customPhone || user.phone}` : ''}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-mono font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                    {statementData.statementNo}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    তারিখ: {formatBanglaDateTime(statementData.generatedAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer & Period Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  গ্রাহকের বিবরণ (Customer Details)
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black text-slate-900">{customer.name}</span>
                  {customer.code && (
                    <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-900 font-mono font-bold text-[10px]">
                      ID: {customer.code}
                    </span>
                  )}
                </div>
                <p className="text-slate-600">
                  মোবাইল: <span className="font-bold text-slate-900">{customer.phone || 'দেওয়া হয়নি'}</span>
                </p>
                {customer.address && (
                  <p className="text-slate-600">
                    ঠিকানা: <span className="text-slate-900">{customer.address}</span>
                  </p>
                )}
                {typeof customer.creditLimit === 'number' && customer.creditLimit > 0 && (
                  <p className="text-slate-600">
                    অনুমোদিত ক্রেডিট লিমিট: <span className="font-bold text-teal-700">৳{customer.creditLimit.toLocaleString('bn-BD')}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  স্টেটমেন্ট বিবরণ (Statement Overview)
                </span>
                <p className="text-slate-600">
                  বিবরণীর সময়কাল: <span className="font-bold text-indigo-900">{statementData.periodLabel}</span>
                </p>
                <p className="text-slate-600">
                  মোট লেনদেন: <span className="font-bold text-slate-900">{toBanglaNumber(statementData.items.length)} টি</span>
                </p>
                <p className="text-slate-600">
                  হিসাবের ধরন: <span className="font-bold text-slate-900">চলতি বাকি খাতা</span>
                </p>
              </div>
            </div>

            {/* Summary KPI Cards */}
            {showSummaryCards && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block">প্রারম্ভিক জের (Opening)</span>
                  <div className="text-sm sm:text-base font-black text-slate-800 mt-0.5">
                    ৳{statementData.openingBalance.toLocaleString('bn-BD')}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-red-50/70 border border-red-200">
                  <span className="text-[10px] font-bold text-red-700 block">মোট বাকি / বিক্রয় (+)</span>
                  <div className="text-sm sm:text-base font-black text-red-700 mt-0.5">
                    ৳{statementData.totalDebits.toLocaleString('bn-BD')}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-700 block">মোট জমা / পরিশোধ (-)</span>
                  <div className="text-sm sm:text-base font-black text-emerald-700 mt-0.5">
                    ৳{statementData.totalCredits.toLocaleString('bn-BD')}
                  </div>
                </div>

                <div className={`p-3 rounded-xl border ${
                  statementData.closingBalance > 0
                    ? 'bg-red-50 border-red-300'
                    : statementData.closingBalance < 0
                    ? 'bg-purple-50 border-purple-300'
                    : 'bg-emerald-50 border-emerald-300'
                }`}>
                  <span className={`text-[10px] font-bold block ${
                    statementData.closingBalance > 0 ? 'text-red-800' : 'text-emerald-800'
                  }`}>
                    বর্তমান নিট বকেয়া
                  </span>
                  <div className={`text-sm sm:text-base font-black mt-0.5 ${
                    statementData.closingBalance > 0 ? 'text-red-700' : 'text-emerald-700'
                  }`}>
                    ৳{Math.abs(statementData.closingBalance).toLocaleString('bn-BD')}
                    <span className="text-[10px] ml-1 font-bold">
                      {statementData.closingBalance > 0 ? '(পাওনা)' : statementData.closingBalance < 0 ? '(দেনা)' : '(পরিশোধ)'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Transaction Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                লেনদেন ক্রম ও লেজার টেবিল
              </h4>
              
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-bold">
                      <th className="py-2 px-2 text-center w-8">#</th>
                      <th className="py-2 px-2.5">তারিখ</th>
                      <th className="py-2 px-2.5">ভাউচার নং</th>
                      <th className="py-2 px-2.5">বিবরণ</th>
                      <th className="py-2 px-2">মাধ্যম</th>
                      <th className="py-2 px-2.5 text-right text-red-700">বাকি (+)</th>
                      <th className="py-2 px-2.5 text-right text-emerald-700">জমা (-)</th>
                      <th className="py-2 px-2.5 text-right">ব্যালেন্স ৳</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {/* Opening Balance Row */}
                    <tr className="bg-slate-50/60 font-semibold text-slate-600">
                      <td className="py-2 px-2 text-center text-[11px]">-</td>
                      <td className="py-2 px-2.5 text-[11px]" colSpan={4}>
                        <span className="italic font-bold text-slate-700">প্রারম্ভিক ব্যালেন্স (Opening Balance)</span>
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-[11px] text-slate-400">-</td>
                      <td className="py-2 px-2.5 text-right font-mono text-[11px] text-slate-400">-</td>
                      <td className="py-2 px-2.5 text-right font-mono font-black text-slate-900">
                        ৳{statementData.openingBalance.toLocaleString('bn-BD')}
                      </td>
                    </tr>

                    {/* Transaction Rows */}
                    {statementData.items.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-400 italic">
                          এই নির্দিষ্ট সময়সীমায় কোনো লেনদেন পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      statementData.items.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-500">
                            {toBanglaNumber(row.index)}
                          </td>
                          <td className="py-2 px-2.5 text-[11px] text-slate-600 whitespace-nowrap">
                            {new Date(row.date).toLocaleDateString('bn-BD', {
                              day: 'numeric',
                              month: 'short',
                              year: '2-digit'
                            })}
                          </td>
                          <td className="py-2 px-2.5 font-mono text-[10px] text-indigo-900 font-bold whitespace-nowrap">
                            {row.voucherNo}
                          </td>
                          <td className="py-2 px-2.5 text-slate-800 max-w-[140px] truncate" title={row.description}>
                            {row.description}
                          </td>
                          <td className="py-2 px-2 text-[11px] text-slate-500 whitespace-nowrap">
                            {row.paymentMethod}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono font-bold text-red-700">
                            {row.debit > 0 ? `৳${row.debit.toLocaleString('bn-BD')}` : '-'}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-700">
                            {row.credit > 0 ? `৳${row.credit.toLocaleString('bn-BD')}` : '-'}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono font-black text-slate-900">
                            ৳{row.runningBalance.toLocaleString('bn-BD')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {/* Table Footer Totals */}
                  <tfoot>
                    <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                      <td colSpan={5} className="py-2.5 px-3 text-right">
                        সর্বমোট যোগফল:
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-red-700 font-mono font-black">
                        ৳{statementData.totalDebits.toLocaleString('bn-BD')}
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-emerald-700 font-mono font-black">
                        ৳{statementData.totalCredits.toLocaleString('bn-BD')}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-black text-indigo-900">
                        ৳{statementData.closingBalance.toLocaleString('bn-BD')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Note & Authorization / Signatures */}
            <div className="pt-6 border-t border-slate-200 space-y-4">
              {/* Optional Custom Payment Note */}
              {customPaymentNote && (
                <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-50/80 border border-indigo-200 text-xs text-indigo-950 font-semibold flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{customPaymentNote}</span>
                </div>
              )}

              <div className="flex items-start justify-between text-[11px] text-slate-600 gap-4">
                <div className="space-y-1 flex-1">
                  <p className="leading-relaxed font-medium">
                    {customFooterMessage || '* এটি একটি কম্পিউটারাইজড ডিজিটাল লেজার স্টেটমেন্ট। এতে কোনো ভুলত্রুটি পরিলক্ষিত হলে অনুগ্রহ করে তিন (৩) কার্যদিবসের মধ্যে যোগাযোগ করার অনুরোধ করা হলো।'}
                  </p>
                </div>
                {showQrCode && qrDataUrl && (
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <img src={qrDataUrl} alt="QR Verification" className="w-12 h-12 rounded border border-slate-200" />
                    <span className="text-[9px] text-slate-400 max-w-[60px] leading-tight">
                      স্ক্যান করে তথ্য যাচাই করুন
                    </span>
                  </div>
                )}
              </div>

              {/* Signatures */}
              {showSignatures && (
                <div className="grid grid-cols-2 gap-8 pt-6">
                  <div className="text-center">
                    <div className="border-t border-dashed border-slate-400 pt-1.5 mx-auto w-36 sm:w-48">
                      <p className="text-xs font-bold text-slate-800">গ্রাহকের স্বাক্ষর</p>
                      <p className="text-[10px] text-slate-400">Customer Signature</p>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="border-t border-dashed border-slate-400 pt-1.5 mx-auto w-36 sm:w-48">
                      <p className="text-xs font-bold text-slate-800">অনুমোদিত কর্মকর্তার স্বাক্ষর</p>
                      <p className="text-[10px] text-slate-400">Authorized DSR / Manager</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Modal Footer Actions (Mobile Friendly) */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-2 shrink-0 print:hidden">
          <div className="text-xs text-slate-500 hidden sm:block">
            A4 পেপারে প্রফেশনাল পিডিএফ ডাউনলোড বা সরাসরি প্রিন্ট নিতে পারেন।
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              বন্ধ করুন
            </button>

            <button
              onClick={handleDownloadHtmlFile}
              title="স্টেটমেন্ট ফাইল ডাউনলোড করুন"
              className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 active:scale-95 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">ফাইল ডাউনলোড</span>
              <span className="sm:hidden">ডাউনলোড</span>
            </button>

            <button
              onClick={handlePrintOrPdf}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>পিডিএফ ডাউনলোড / প্রিন্ট</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
