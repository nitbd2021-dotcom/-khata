import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  Mic, 
  Search, 
  UserCheck, 
  HandCoins, 
  ShoppingBag, 
  Receipt,
  FileSpreadsheet,
  AlertCircle,
  Phone,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  QrCode,
  Calendar,
  X,
  Activity,
  Clock,
  ChevronRight,
  Boxes,
  AlertTriangle
} from 'lucide-react';
import { Customer, Transaction, TransactionType, User } from '../types';
import { formatBanglaPaymentMethod, formatBanglaTxType, GoogleSheetsService } from '../services/googleSheetsService';
import { StorageService } from '../services/storageService';

const formatRelativeTime = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'এইমাত্র';
    if (diffMins < 60) return `${diffMins.toLocaleString('bn-BD')} মিনিট আগে`;
    if (diffHours < 24 && now.getDate() === d.getDate()) {
      return `আজ ${d.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffDays === 1) {
      return `গতকাল ${d.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
};

interface DashboardProps {
  user: User;
  customers: Customer[];
  transactions: Transaction[];
  summary: {
    totalReceivable: number;
    totalPayable: number;
    todayReceived: number;
    todayGiven: number;
    todaySales: number;
    todayExpenseAmount: number;
  };
  onOpenAddTx: (defaultType?: TransactionType, customerId?: string) => void;
  onOpenVoiceKhata: () => void;
  onOpenQRScanner?: () => void;
  onSelectCustomer: (customer: Customer) => void;
  onAddExpense: () => void;
  isOnline?: boolean;
  pendingCount?: number;
  onOpenUserSheet?: () => void;
  onViewReceipt?: (transaction: Transaction) => void;
  onOpenInventory?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  customers,
  transactions,
  summary,
  onOpenAddTx,
  onOpenVoiceKhata,
  onOpenQRScanner,
  onSelectCustomer,
  onAddExpense,
  isOnline = true,
  pendingCount = 0,
  onOpenUserSheet,
  onViewReceipt,
  onOpenInventory,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Low stock inventory items
  const lowStockItems = StorageService.getLowStockItems(user.id);
  const outOfStockCount = lowStockItems.filter(i => i.currentStock <= 0).length;

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      tx.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      formatBanglaPaymentMethod(tx.paymentMethod).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.paymentMethod && tx.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.customerPhone && tx.customerPhone.includes(searchQuery));
    
    if (!matchesSearch) return false;

    if (selectedDate) {
      const txYMD = new Date(tx.date).toISOString().split('T')[0];
      if (txYMD !== selectedDate) return false;
    }

    if (filterType === 'all') return true;
    if (filterType === 'receivable') return tx.type === 'credit_given' || tx.type === 'loan_given';
    if (filterType === 'received') return tx.type === 'payment_received';
    if (filterType === 'payable') return tx.type === 'credit_taken' || tx.type === 'loan_taken';
    return true;
  });

  // Exact last 5 recent transactions sorted by date descending for the activity feed
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 pb-24 md:pb-12">
      
      {/* Top Welcome & Google Drive Status Alert Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5 sm:mb-2">
              <button
                type="button"
                onClick={onOpenUserSheet}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-semibold border transition cursor-pointer max-w-full truncate ${
                  !isOnline
                    ? 'bg-amber-500/25 text-amber-200 border-amber-400/40 hover:bg-amber-500/35'
                    : pendingCount > 0
                    ? 'bg-amber-500/25 text-amber-200 border-amber-400/40 hover:bg-amber-500/35'
                    : 'bg-emerald-800/80 text-emerald-100 border-emerald-500/40 hover:bg-emerald-800'
                }`}
                title="গুগল শিট ভিউয়ার ও অফলাইন সিঙ্ক তথ্য দেখুন"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {!isOnline
                    ? `অফলাইন মোড (${pendingCount}টি হিসাব ডিভাইসে সংরক্ষিত)`
                    : pendingCount > 0
                    ? `শিট সিঙ্ক হচ্ছে... (${pendingCount}টি অপেক্ষমান)`
                    : 'গুগল ড্রাইভ ও শিটে লাইভ সিঙ্ক'}
                </span>
              </button>
            </div>
            <h2 className="text-lg sm:text-2xl font-bold tracking-tight">
              {user.shopName}
            </h2>
            <p className="text-emerald-100 text-xs sm:text-sm mt-0.5">
              আজকের ব্যবসার নিখুঁত হিসাব ও ডিজিটাল খাতা
            </p>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            {onOpenQRScanner && (
              <button
                onClick={onOpenQRScanner}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 sm:gap-2 bg-slate-900/90 hover:bg-black text-white font-bold px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-xs sm:text-sm shadow-sm transition active:scale-98 cursor-pointer border border-emerald-500/40"
                title="কাস্টমারের কিউআর কোড স্ক্যান করুন"
              >
                <QrCode className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="whitespace-nowrap">QR স্ক্যান</span>
              </button>
            )}

            <button
              onClick={onOpenVoiceKhata}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 sm:gap-2 bg-white text-emerald-800 hover:bg-emerald-50 font-bold px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-xs sm:text-sm shadow-sm transition active:scale-98 cursor-pointer"
            >
              <Mic className="w-4 h-4 text-red-500 animate-bounce shrink-0" />
              <span className="whitespace-nowrap">ভয়েস খাতা</span>
            </button>
          </div>
        </div>
      </div>

      {/* New User Google Sheet Helper Banner */}
      {!GoogleSheetsService.isRealGoogleSheetId(user.googleSheetId) && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/90 rounded-2xl p-3.5 sm:p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
                  আপনার গুগল শিট কানেক্ট করে রাখুন
                </h4>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  নতুন
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 leading-relaxed">
                ১-ক্লিকে নতুন স্প্রেডশিট বানিয়ে সরাসরি আপনার গুগল ড্রাইভে সব ব্যাকআপ রাখুন।
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={onOpenUserSheet}
              className="w-full sm:w-auto justify-center px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>শিট সেটআপ ও ডাটা পাঠান</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Low Stock Warning Banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-300/80 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-xs sm:text-sm font-black text-amber-950">
                  ইনভেন্টরি স্টক সতর্কতা ({lowStockItems.length} টি পণ্য)
                </h4>
                {outOfStockCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-600 text-white rounded">
                    {outOfStockCount} টি স্টক শেষ!
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-amber-800 mt-0.5">
                {lowStockItems.slice(0, 3).map(i => `${i.name} (${i.currentStock} ${i.unit})`).join(', ')}
                {lowStockItems.length > 3 ? ` এবং আরও ${lowStockItems.length - 3} টি` : ''} - স্টক ফুরিয়ে যাচ্ছে।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              onClick={onOpenInventory}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>স্টক ইন / রিস্টক করুন</span>
            </button>
          </div>
        </div>
      )}

      {/* Primary Action Buttons: দ্রুত লেনদেন এন্ট্রি (Top Priority for Instant Access) */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-2.5 sm:mb-3 gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>দ্রুত লেনদেন এন্ট্রি</span>
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-normal text-slate-400 hidden sm:inline">এক ট্যাপেই ফরম ওপেন করুন</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          
          {/* টাকা পেলাম (Payment Received / বাকি আদায়) */}
          <button
            onClick={() => onOpenAddTx('payment_received')}
            className="flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 transition active:scale-95 group cursor-pointer"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mb-1 shadow-sm group-hover:scale-105 transition">
              <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="font-bold text-xs sm:text-base">টাকা পেলাম</span>
            <span className="text-[10px] sm:text-[11px] text-emerald-700 font-medium">বাকি টাকা আদায়</span>
          </button>

          {/* বাকি দিলাম (Credit Given) */}
          <button
            onClick={() => onOpenAddTx('credit_given')}
            className="flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-800 transition active:scale-95 group cursor-pointer"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-600 text-white flex items-center justify-center mb-1 shadow-sm group-hover:scale-105 transition">
              <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="font-bold text-xs sm:text-base">বাকি দিলাম</span>
            <span className="text-[10px] sm:text-[11px] text-red-700 font-medium">পাওনা যোগ হবে</span>
          </button>

          {/* বাকি নিলাম (Credit Taken) */}
          <button
            onClick={() => onOpenAddTx('credit_taken')}
            className="flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 transition active:scale-95 group cursor-pointer"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-purple-600 text-white flex items-center justify-center mb-1 shadow-sm group-hover:scale-105 transition">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="font-bold text-xs sm:text-base">বাকি নিলাম</span>
            <span className="text-[10px] sm:text-[11px] text-purple-700 font-medium">দেনা যোগ হবে</span>
          </button>

          {/* ধার লেনদেন (Loan) */}
          <button
            onClick={() => onOpenAddTx('loan_given')}
            className="flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 transition active:scale-95 group cursor-pointer"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mb-1 shadow-sm group-hover:scale-105 transition">
              <HandCoins className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="font-bold text-xs sm:text-base">ধার লেনদেন</span>
            <span className="text-[10px] sm:text-[11px] text-blue-700 font-medium">কর্জ আদান-প্রদান</span>
          </button>

        </div>
      </div>

      {/* Main Metric Cards: মোট পাওনা & মোট দেনা */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        {/* মোট পাওনা (Receivable) */}
        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-red-100 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-sm font-semibold mb-0.5 sm:mb-1">
            <span className="truncate">মোট পাওনা (বাকি)</span>
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
          </div>
          <div className="text-base sm:text-2xl font-extrabold text-red-600 tracking-tight truncate" title={`৳ ${summary.totalReceivable.toLocaleString('bn-BD')}`}>
            ৳ {summary.totalReceivable.toLocaleString('bn-BD')}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 truncate">
            কাস্টমারদের কাছে পাবেন
          </p>
        </div>

        {/* মোট দেনা (Payable) */}
        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-blue-100 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-sm font-semibold mb-0.5 sm:mb-1">
            <span className="truncate">মোট দেনা (দিতে হবে)</span>
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
          </div>
          <div className="text-base sm:text-2xl font-extrabold text-blue-600 tracking-tight truncate" title={`৳ ${summary.totalPayable.toLocaleString('bn-BD')}`}>
            ৳ {summary.totalPayable.toLocaleString('bn-BD')}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 truncate">
            মহাজন বা অন্যদের দিতে হবে
          </p>
        </div>

        {/* আজকের নগদ জমা */}
        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-emerald-100 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-sm font-semibold mb-0.5 sm:mb-1">
            <span className="truncate">আজকের জমা (ক্যাশ)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
          </div>
          <div className="text-base sm:text-2xl font-extrabold text-emerald-600 tracking-tight truncate" title={`৳ ${summary.todayReceived.toLocaleString('bn-BD')}`}>
            ৳ {summary.todayReceived.toLocaleString('bn-BD')}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 truncate">
            আজ নগদ আদায় ও জমা
          </p>
        </div>

        {/* আজকের খরচ */}
        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-amber-100 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-sm font-semibold mb-0.5 sm:mb-1">
            <span className="truncate">আজকের খরচ</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
          </div>
          <div className="text-base sm:text-2xl font-extrabold text-amber-600 tracking-tight truncate" title={`৳ ${summary.todayExpenseAmount.toLocaleString('bn-BD')}`}>
            ৳ {summary.todayExpenseAmount.toLocaleString('bn-BD')}
          </div>
          <div className="flex items-center justify-between mt-0.5 sm:mt-1 gap-1">
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">মোট খরচ</p>
            <button 
              onClick={onAddExpense}
              className="text-[10px] sm:text-[11px] text-emerald-700 hover:underline font-bold shrink-0 cursor-pointer"
            >
              + খরচ
            </button>
          </div>
        </div>

      </div>

      {/* Recent Activity Feed: সর্বশেষ ৫টি লেনদেন */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-700 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  সাম্প্রতিক অ্যাক্টিভিটি ফিড
                </h3>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-xs text-slate-500">সর্বশেষ ৫টি লেনদেনের দ্রুত আপডেট</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            সর্বশেষ ৫টি দেখানো হচ্ছে
          </span>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-6 text-center">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
            <p className="text-slate-600 text-xs sm:text-sm font-semibold">এখনও কোনো লেনদেন এন্ট্রি করা হয়নি</p>
            <p className="text-slate-400 text-[11px] mt-0.5">উপরের বাটনগুলো চেপে প্রথম লেনদেন যোগ করুন</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden">
            <AnimatePresence initial={false} mode="popLayout">
              {recentTransactions.map((tx, idx) => {
                const isPaymentReceived = tx.type === 'payment_received';
                const isCreditGiven = tx.type === 'credit_given';
                const isLoanGiven = tx.type === 'loan_given';
                const isCreditTaken = tx.type === 'credit_taken';
                const relativeTime = formatRelativeTime(tx.date);
                const isJustNow = relativeTime === 'এইমাত্র' || (new Date().getTime() - new Date(tx.date).getTime() < 45000);

                return (
                  <motion.div
                    key={tx.id || `feed-${idx}`}
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                    transition={{
                      type: 'spring',
                      stiffness: 420,
                      damping: 26,
                      mass: 0.6,
                      delay: idx === 0 ? 0 : idx * 0.03,
                    }}
                    layout
                    className={`p-3.5 sm:p-4 hover:bg-slate-50/90 transition-colors flex items-center justify-between gap-3 cursor-pointer group ${
                      isJustNow ? 'bg-emerald-50/35' : ''
                    }`}
                    onClick={() => {
                      const cust = customers.find(c => c.id === tx.customerId);
                      if (cust) onSelectCustomer(cust);
                    }}
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 font-bold shadow-2xs ${
                          isPaymentReceived
                            ? 'bg-emerald-100 text-emerald-700'
                            : isCreditGiven
                            ? 'bg-red-100 text-red-700'
                            : isCreditTaken
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {isPaymentReceived ? (
                          <ArrowDownLeft className="w-5 h-5" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm leading-snug group-hover:text-emerald-700 transition">
                            {tx.customerName}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-700 whitespace-nowrap shrink-0">
                            {formatBanglaTxType(tx.type)}
                          </span>
                          {tx.paymentMethod && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap shrink-0">
                              {formatBanglaPaymentMethod(tx.paymentMethod)}
                            </span>
                          )}
                          {isJustNow && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-600 text-white animate-pulse shrink-0">
                              নতুন
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1 text-[11px] text-teal-700 font-semibold bg-teal-50 px-1.5 py-0.5 rounded">
                            <Clock className="w-3 h-3 text-teal-600" />
                            <span>{relativeTime}</span>
                          </span>
                          {tx.description && (
                            <span className="truncate max-w-[140px] sm:max-w-xs text-slate-600">
                              • {tx.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Amount and Receipt */}
                    <div className="text-right shrink-0 pl-2 flex items-center gap-2.5">
                      <div>
                        <div
                          className={`font-black text-sm sm:text-base ${
                            isPaymentReceived
                              ? 'text-emerald-600'
                              : isCreditGiven || isLoanGiven
                              ? 'text-red-600'
                              : 'text-purple-600'
                          }`}
                        >
                          {isPaymentReceived ? '-' : '+'} ৳{tx.amount.toLocaleString('bn-BD')}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                          ব্যালেন্স: {tx.balanceAfter >= 0 ? `পাওনা ৳${tx.balanceAfter.toLocaleString('bn-BD')}` : `দেনা ৳${Math.abs(tx.balanceAfter).toLocaleString('bn-BD')}`}
                        </div>
                      </div>

                      {onViewReceipt && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewReceipt(tx);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition shadow-2xs cursor-pointer shrink-0"
                          title="রসিদ দেখুন ও WhatsApp-এ পাঠান"
                        >
                          <Receipt className="w-3 h-3 text-teal-600" />
                          <span className="hidden sm:inline">রসিদ</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Transaction History & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-900">সর্বশেষ হিসাব বিবরণ</h3>
              <p className="text-xs text-slate-500">মোট লেনদেন: {transactions.length} টি</p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  filterType === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                সব
              </button>
              <button
                onClick={() => setFilterType('receivable')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  filterType === 'receivable'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                বাকি দিলাম
              </button>
              <button
                onClick={() => setFilterType('received')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  filterType === 'received'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                টাকা পেলাম
              </button>
              <button
                onClick={() => setFilterType('payable')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  filterType === 'payable'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                বাকি নিলাম
              </button>
            </div>
          </div>

          {/* Search Box & Date Filter */}
          <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="কাস্টমারের নাম, বিবরণ বা মোবাইল দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="relative flex-1 sm:w-44">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  title="নির্দিষ্ট ১ দিনের লেনদেন দেখতে তারিখ বাছাই করুন"
                />
              </div>
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate('')}
                  className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="তারিখ ফিল্টার মুছুন"
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">সব</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Transactions Table / List */}
        <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-600 text-sm font-semibold">কোন লেনদেন খুঁজে পাওয়া যায়নি</p>
              <p className="text-slate-400 text-xs mt-0.5">নতুন লেনদেন যোগ করতে উপরের বাটনে চাপ দিন</p>
            </div>
          ) : (
            filteredTransactions.map(tx => {
              const isPaymentReceived = tx.type === 'payment_received';
              const isCreditGiven = tx.type === 'credit_given';
              const isLoanGiven = tx.type === 'loan_given';
              const isCreditTaken = tx.type === 'credit_taken';
              const isLoanTaken = tx.type === 'loan_taken';

              return (
                <div
                  key={tx.id}
                  className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition flex items-center justify-between gap-3 cursor-pointer"
                  onClick={() => {
                    const cust = customers.find(c => c.id === tx.customerId);
                    if (cust) onSelectCustomer(cust);
                  }}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                        isPaymentReceived
                          ? 'bg-emerald-100 text-emerald-700'
                          : isCreditGiven
                          ? 'bg-red-100 text-red-700'
                          : isCreditTaken
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {isPaymentReceived ? (
                        <ArrowDownLeft className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                          {tx.customerName}
                        </span>
                        <span className="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-700 whitespace-nowrap shrink-0">
                          {formatBanglaTxType(tx.type)}
                        </span>
                        {tx.paymentMethod && (
                          <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap shrink-0">
                            {formatBanglaPaymentMethod(tx.paymentMethod)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs text-slate-500">
                        <span className="truncate max-w-[200px] sm:max-w-md">
                          {tx.description} • {new Date(tx.date).toLocaleDateString('bn-BD')}
                        </span>
                        {tx.syncedToSheet ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 font-semibold shrink-0" title="গুগল শিটে সিঙ্ক হয়েছে">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>শিট সিঙ্কড</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] text-amber-700 font-semibold bg-amber-50 px-1 rounded border border-amber-200 shrink-0" title="অফলাইনে ডিভাইসে সংরক্ষিত, অনলাইন হওয়ামাত্রই নিজে থেকে শিটে যাবে">
                            ⏳ অফলাইন সংরক্ষিত
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Amount and Running Balance */}
                  <div className="text-right shrink-0 pl-2">
                    <div
                      className={`font-black text-sm sm:text-base ${
                        isPaymentReceived
                          ? 'text-emerald-600'
                          : isCreditGiven || isLoanGiven
                          ? 'text-red-600'
                          : 'text-purple-600'
                      }`}
                    >
                      {isPaymentReceived ? '-' : '+'} ৳{tx.amount.toLocaleString('bn-BD')}
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium whitespace-nowrap">
                      ব্যালেন্স: {tx.balanceAfter >= 0 ? `পাওনা ৳${tx.balanceAfter.toLocaleString('bn-BD')}` : `দেনা ৳${Math.abs(tx.balanceAfter).toLocaleString('bn-BD')}`}
                    </div>
                    {onViewReceipt && (
                      <div className="mt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewReceipt(tx);
                          }}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[10px] font-bold transition shadow-2xs cursor-pointer"
                          title="রসিদ দেখুন ও WhatsApp-এ পাঠান"
                        >
                          <Receipt className="w-2.5 h-2.5 text-teal-600" />
                          <span>রসিদ</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
};
