import React, { useState } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Receipt, 
  Plus, 
  FileSpreadsheet, 
  Banknote, 
  Smartphone, 
  Building2,
  CalendarRange,
  Clock,
  ArrowRight,
  Filter,
  CheckCircle2,
  RotateCcw,
  Info,
  CalendarDays
} from 'lucide-react';
import { Customer, Expense, Transaction, User } from '../types';
import { formatBanglaPaymentMethod, formatBanglaTxType, GoogleSheetsService } from '../services/googleSheetsService';
import { DailyTransactionsBarChart } from './DailyTransactionsBarChart';

interface ReportsViewProps {
  user: User;
  customers: Customer[];
  transactions: Transaction[];
  expenses: Expense[];
  onAddExpense: () => void;
  onViewReceipt?: (transaction: Transaction) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  user,
  customers,
  transactions,
  expenses,
  onAddExpense,
  onViewReceipt,
}) => {
  const [timeRange, setTimeRange] = useState<'today' | '7days' | 'month' | 'all' | 'custom'>('month');
  const [customMode, setCustomMode] = useState<'single' | 'range'>('single');

  // Helper to convert Date to YYYY-MM-DD
  const toLocalYMD = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const now = new Date();
  const todayStr = toLocalYMD(now);
  const curYear = now.getFullYear();
  const curMonthStr = String(now.getMonth() + 1).padStart(2, '0');

  // Default custom dates: 1st of month and 10th of month
  const firstOfMonthStr = `${curYear}-${curMonthStr}-01`;
  const tenthOfMonthStr = `${curYear}-${curMonthStr}-10`;

  const [startDate, setStartDate] = useState<string>(firstOfMonthStr);
  const [endDate, setEndDate] = useState<string>(tenthOfMonthStr);

  // Bengali Date Formatter
  const formatBanglaDate = (ymdStr: string) => {
    if (!ymdStr) return '';
    try {
      const [y, m, d] = ymdStr.split('-').map(Number);
      const months = [
        'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
        'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
      ];
      return `${d.toLocaleString('bn-BD')} ${months[m - 1]} ${y.toLocaleString('bn-BD').replace(/,/g, '')}`;
    } catch {
      return ymdStr;
    }
  };

  // Filter function for Date
  const filterDate = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;

    if (timeRange === 'today') {
      const itemYMD = toLocalYMD(d);
      return itemYMD === todayStr || d.toDateString() === now.toDateString();
    }
    if (timeRange === '7days') {
      return now.getTime() - d.getTime() <= 7 * 86400000 && d.getTime() <= now.getTime();
    }
    if (timeRange === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (timeRange === 'all') {
      return true;
    }
    if (timeRange === 'custom') {
      const itemYMD = toLocalYMD(d);

      if (customMode === 'single' || !endDate || startDate === endDate) {
        // Specific 1 single date (e.g. ১ তারিখ)
        return itemYMD === startDate;
      }

      // Range between start and end (e.g. ১ থেকে ১০ তারিখ)
      const minDate = startDate <= endDate ? startDate : endDate;
      const maxDate = startDate <= endDate ? endDate : startDate;
      return itemYMD >= minDate && itemYMD <= maxDate;
    }
    return true;
  };

  // Filtered transactions and expenses
  const filteredTx = transactions.filter(t => filterDate(t.date));
  const filteredExp = expenses.filter(e => filterDate(e.date));

  // Quick preset shortcuts
  const handleSelectSingleDay = (dayNum: number) => {
    const ymd = `${curYear}-${curMonthStr}-${String(dayNum).padStart(2, '0')}`;
    setTimeRange('custom');
    setCustomMode('single');
    setStartDate(ymd);
    setEndDate(ymd);
  };

  const handleSelectRangeDays = (startDay: number, endDay: number) => {
    const sYmd = `${curYear}-${curMonthStr}-${String(startDay).padStart(2, '0')}`;
    const eYmd = `${curYear}-${curMonthStr}-${String(endDay).padStart(2, '0')}`;
    setTimeRange('custom');
    setCustomMode('range');
    setStartDate(sYmd);
    setEndDate(eYmd);
  };

  const handleSelectToday = () => {
    setTimeRange('custom');
    setCustomMode('single');
    setStartDate(todayStr);
    setEndDate(todayStr);
  };

  const handleSelectYesterday = () => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yStr = toLocalYMD(y);
    setTimeRange('custom');
    setCustomMode('single');
    setStartDate(yStr);
    setEndDate(yStr);
  };

  // Financial Calculations for the selected period
  const totalReceived = filteredTx
    .filter(t => t.type === 'payment_received')
    .reduce((s, t) => s + t.amount, 0);

  // Payment Methods Breakdown
  const cashReceived = filteredTx
    .filter(t => t.type === 'payment_received' && (!t.paymentMethod || t.paymentMethod === 'cash' || t.paymentMethod === 'নগদ'))
    .reduce((s, t) => s + t.amount, 0);

  const bkashReceived = filteredTx
    .filter(t => t.type === 'payment_received' && (t.paymentMethod === 'bkash' || t.paymentMethod === 'বিকাশ'))
    .reduce((s, t) => s + t.amount, 0);

  const bankReceived = filteredTx
    .filter(t => t.type === 'payment_received' && (t.paymentMethod === 'bank' || t.paymentMethod === 'ব্যাংক'))
    .reduce((s, t) => s + t.amount, 0);

  const totalSales = filteredTx
    .filter(t => t.type === 'credit_given' || t.type === 'sale')
    .reduce((s, t) => s + t.amount, 0);

  const totalCreditGiven = filteredTx
    .filter(t => t.type === 'credit_given')
    .reduce((s, t) => s + t.amount, 0);

  const totalExpense = filteredExp.reduce((s, e) => s + e.amount, 0);

  // Total balance overview (customer ledgers)
  const totalReceivable = customers.reduce((s, c) => s + (c.netBalance > 0 ? c.netBalance : 0), 0);
  const totalPayable = customers.reduce((s, c) => s + (c.netBalance < 0 ? Math.abs(c.netBalance) : 0), 0);

  const handleDownloadCsv = () => {
    // Download CSV specifically for the filtered transactions!
    GoogleSheetsService.downloadLedgerCsv(user, filteredTx.length > 0 ? filteredTx : transactions);
  };

  // Selected date range text for header
  const getSelectedRangeLabel = () => {
    if (timeRange === 'today') return 'আজকের হিসাব';
    if (timeRange === '7days') return 'বিগত ৭ দিনের হিসাব';
    if (timeRange === 'month') return 'চলতি মাসের পূর্ণাঙ্গ হিসাব';
    if (timeRange === 'all') return 'শুরু থেকে আজ পর্যন্ত সকল হিসাব';
    if (timeRange === 'custom') {
      if (customMode === 'single' || !endDate || startDate === endDate) {
        return `${formatBanglaDate(startDate)} (১ দিনের হিসাব)`;
      }
      return `${formatBanglaDate(startDate)} থেকে ${formatBanglaDate(endDate)} পর্যন্ত হিসাব`;
    }
    return '';
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12">
      
      {/* Header with Preset & Calendar Tabs */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <span>ব্যবসার হিসাব ও আর্থিক রিপোর্ট</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              দোকানের বেচাকেনা, জমা, বকেয়া ও খরচের তারিখভিত্তিক বিস্তারিত বিবরণ
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 shadow-2xs"
              title="নির্বাচিত তারিখের এক্সেল/CSV ফাইল ডাউনলোড করুন"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>রিপোর্ট CSV</span>
            </button>
          </div>
        </div>

        {/* Time range pills (Including Calendar / Custom Date) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-slate-100 pt-3">
          <button
            onClick={() => setTimeRange('today')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              timeRange === 'today'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            আজ
          </button>
          <button
            onClick={() => setTimeRange('7days')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              timeRange === '7days'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            ৭ দিন
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              timeRange === 'month'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            চলতি মাস
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              timeRange === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            সব সময়
          </button>
          <button
            onClick={() => {
              setTimeRange('custom');
            }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              timeRange === 'custom'
                ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400/30'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>ক্যালেন্ডার / কাস্টম তারিখ</span>
          </button>
        </div>
      </div>

      {/* Interactive Calendar Date Picker Panel (When custom is active) */}
      {timeRange === 'custom' && (
        <div className="bg-gradient-to-br from-indigo-50/70 via-white to-emerald-50/40 rounded-3xl p-5 border border-indigo-200 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  ক্যালেন্ডার দিয়ে হিসাব ও রিপোর্ট ফিল্টার
                </h3>
                <p className="text-xs text-slate-500">
                  ১ তারিখ দিলে ১ তারিখের দেখাবে, অথবা ১-১০ তারিখ দিলে সেই নির্দিষ্ট সময়ের হিসাব দেখাবে
                </p>
              </div>
            </div>

            {/* Mode Selector: Single Date vs Date Range */}
            <div className="inline-flex bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-center border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setCustomMode('single');
                  setEndDate(startDate);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  customMode === 'single'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                নির্দিষ্ট ১ দিন (যেমন: ১ তারিখ)
              </button>
              <button
                type="button"
                onClick={() => setCustomMode('range')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  customMode === 'range'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                তারিখের ব্যাপ্তি (যেমন: ১-১০ তারিখ)
              </button>
            </div>
          </div>

          {/* Date Picker Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customMode === 'single' ? (
              <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-2xs md:col-span-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                  <span>তারিখ নির্বাচন করুন (ক্যালেন্ডার)</span>
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => {
                      setStartDate(e.target.value);
                      setEndDate(e.target.value);
                    }}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none flex-1"
                  />
                  <div className="text-xs font-bold text-indigo-900 bg-indigo-50 px-3 py-2.5 rounded-xl border border-indigo-200 text-center sm:text-left">
                    নির্বাচিত দিন: {formatBanglaDate(startDate)}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-2xs">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                    <span>শুরু তারিখ (From)</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {formatBanglaDate(startDate)}
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-2xs">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                    <span>শেষ তারিখ (To)</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {formatBanglaDate(endDate)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Quick 1-Click Date Shortcut Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>সহজ বাছাই:</span>
            </span>

            {/* Quick 1 Date */}
            <button
              type="button"
              onClick={() => handleSelectSingleDay(1)}
              className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
            >
              ১ তারিখ
            </button>

            {/* Quick 1 to 10 Range */}
            <button
              type="button"
              onClick={() => handleSelectRangeDays(1, 10)}
              className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
            >
              ১ - ১০ তারিখ
            </button>

            {/* Quick 1 to 15 Range */}
            <button
              type="button"
              onClick={() => handleSelectRangeDays(1, 15)}
              className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
            >
              ১ - ১৫ তারিখ
            </button>

            {/* Quick 1 to 30/31 Full Month */}
            <button
              type="button"
              onClick={() => handleSelectRangeDays(1, 31)}
              className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
            >
              ১ - ৩১ তারিখ
            </button>

            {/* Quick Today */}
            <button
              type="button"
              onClick={handleSelectToday}
              className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
            >
              আজ
            </button>

            {/* Quick Yesterday */}
            <button
              type="button"
              onClick={handleSelectYesterday}
              className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
            >
              গতকাল
            </button>
          </div>

          {/* Current Selection Status Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-indigo-900 text-white px-4 py-2.5 rounded-2xl text-xs font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>বর্তমান ফিল্টার:</strong>{' '}
                {customMode === 'single' || !endDate || startDate === endDate
                  ? `${formatBanglaDate(startDate)} (১ দিনের হিসাব)`
                  : `${formatBanglaDate(startDate)} থেকে ${formatBanglaDate(endDate)} (${
                      Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)
                    } দিনের হিসাব)`}
              </span>
            </div>
            <div className="flex items-center gap-3 text-indigo-200">
              <span>লেনদেন: <strong className="text-white">{filteredTx.length} টি</strong></span>
              <span>খরচ: <strong className="text-white">{filteredExp.length} টি</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Active Period Notification Bar when NOT in custom mode */}
      {timeRange !== 'custom' && (
        <div className="bg-emerald-50/70 border border-emerald-200 px-4 py-2 rounded-2xl text-xs text-emerald-900 font-semibold flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>ফিল্টার অবস্থা: <strong>{getSelectedRangeLabel()}</strong></span>
          </span>
          <span className="text-[11px] text-emerald-700">
            মোট {filteredTx.length}টি লেনদেন পাওয়া গেছে
          </span>
        </div>
      )}

      {/* Metrics Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>মোট বিক্রি</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            ৳{totalSales.toLocaleString('bn-BD')}
          </div>
          <span className="text-[11px] text-slate-400">নগদ ও বাকি বিক্রি সহ</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>মোট নগদ জমা</span>
            <Wallet className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600">
            ৳{totalReceived.toLocaleString('bn-BD')}
          </div>
          <span className="text-[11px] text-slate-400">ক্যাশ আদায়কৃত টাকা</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>নতুন বাকি দেওয়া</span>
            <TrendingDown className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-red-600">
            ৳{totalCreditGiven.toLocaleString('bn-BD')}
          </div>
          <span className="text-[11px] text-slate-400">গ্রাহককে বাকি দেওয়া হয়েছে</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
            <span>দোকানের খরচ</span>
            <Receipt className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600">
            ৳{totalExpense.toLocaleString('bn-BD')}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-slate-400">ভাড়া, বিল, বেতন ইত্যাদি</span>
            <button 
              onClick={onAddExpense}
              className="text-[11px] text-emerald-700 font-bold hover:underline cursor-pointer"
            >
              + খরচ
            </button>
          </div>
        </div>
      </div>

      {/* 30-Day Daily Transactions Bar Chart (Recharts) */}
      <DailyTransactionsBarChart 
        transactions={transactions}
        onSelectDate={(clickedYMD) => {
          setTimeRange('custom');
          setCustomMode('single');
          setStartDate(clickedYMD);
          setEndDate(clickedYMD);
        }}
      />

      {/* Payment Methods Breakdown Section */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span>পেমেন্ট মাধ্যম অনুযায়ী মোট জমা (নগদ, বিকাশ, ব্যাংক)</span>
          </h3>
          <span className="text-xs font-bold text-slate-500">
            সর্বমোট আদায়: ৳{totalReceived.toLocaleString('bn-BD')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* নগদ */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-700 block">নগদ ক্যাশ</span>
                <span className="text-[10px] text-slate-500">সরাসরি ক্যাশ আদায়</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-emerald-700 block">৳{cashReceived.toLocaleString('bn-BD')}</span>
              <span className="text-[10px] text-emerald-600 font-semibold">{totalReceived > 0 ? Math.round((cashReceived / totalReceived) * 100) : 0}%</span>
            </div>
          </div>

          {/* বিকাশ */}
          <div className="bg-pink-50/70 border border-pink-200 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-700 block">বিকাশ (bKash)</span>
                <span className="text-[10px] text-slate-500">মোবাইল ব্যাংকিং</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-pink-700 block">৳{bkashReceived.toLocaleString('bn-BD')}</span>
              <span className="text-[10px] text-pink-600 font-semibold">{totalReceived > 0 ? Math.round((bkashReceived / totalReceived) * 100) : 0}%</span>
            </div>
          </div>

          {/* ব্যাংক */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-700 block">ব্যাংক ট্রান্সফার</span>
                <span className="text-[10px] text-slate-500">চেক বা অনলাইন ব্যাংক</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-blue-700 block">৳{bankReceived.toLocaleString('bn-BD')}</span>
              <span className="text-[10px] text-blue-600 font-semibold">{totalReceived > 0 ? Math.round((bankReceived / totalReceived) * 100) : 0}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Transactions Section for the Selected Date / Range */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>নির্বাচিত তারিখের লেনদেন তালিকা</span>
            </h3>
            <p className="text-xs text-slate-500">
              {getSelectedRangeLabel()} • মোট {filteredTx.length} টি লেনদেন
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
            মোট আর্থিক হিসাব: ৳{(totalReceived + totalCreditGiven).toLocaleString('bn-BD')}
          </span>
        </div>

        {filteredTx.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-700 font-bold text-sm">
              এই তারিখে কোনো লেনদেন পাওয়া যায়নি
            </p>
            <p className="text-slate-400 text-xs mt-1">
              অন্য কোনো তারিখ বা ১-১০ তারিখের মতো তারিখের ব্যাপ্তি নির্বাচন করে দেখতে পারেন।
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
            {filteredTx.map(tx => {
              const isCredit = tx.type === 'credit_given' || tx.type === 'loan_given';
              const isReceived = tx.type === 'payment_received';
              
              return (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                      isReceived ? 'bg-emerald-100 text-emerald-700' : isCredit ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {isReceived ? 'জমা' : isCredit ? 'বাকি' : 'হিসাব'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{tx.customerName}</span>
                        {tx.customerPhone && (
                          <span className="text-[11px] text-slate-400 font-normal">({tx.customerPhone})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span className="font-semibold text-slate-700">{formatBanglaTxType(tx.type)}</span>
                        <span>•</span>
                        <span>{new Date(tx.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        {tx.paymentMethod && (
                          <>
                            <span>•</span>
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {formatBanglaPaymentMethod(tx.paymentMethod)}
                            </span>
                          </>
                        )}
                        {tx.description && (
                          <>
                            <span>•</span>
                            <span className="italic truncate max-w-xs">{tx.description}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end">
                    <span className={`text-sm sm:text-base font-black block ${
                      isReceived ? 'text-emerald-600' : isCredit ? 'text-red-600' : 'text-slate-800'
                    }`}>
                      {isReceived ? '+' : isCredit ? '-' : ''}৳{tx.amount.toLocaleString('bn-BD')}
                    </span>
                    {onViewReceipt && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewReceipt(tx);
                        }}
                        className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[10px] font-bold transition shadow-2xs cursor-pointer"
                        title="রসিদ দেখুন ও WhatsApp-এ পাঠান"
                      >
                        <Receipt className="w-2.5 h-2.5 text-teal-600" />
                        <span>রসিদ</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expenses Breakdown & Net Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Overall Ledger Status */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>সামগ্রিক আর্থিক খাতা অবস্থান</span>
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="text-xs text-slate-300">মোট বকেয়া পাওনা (আমি পাব)</span>
              <span className="text-sm font-black text-red-400">৳{totalReceivable.toLocaleString('bn-BD')}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="text-xs text-slate-300">মোট দেনা (আমাকে দিতে হবে)</span>
              <span className="text-sm font-black text-blue-400">৳{totalPayable.toLocaleString('bn-BD')}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/60 border border-emerald-600/40">
              <span className="text-xs font-bold text-emerald-200">নিট ব্যবসায়িক উদ্বৃত্ত</span>
              <span className="text-base font-black text-emerald-400">৳{(totalReceivable - totalPayable).toLocaleString('bn-BD')}</span>
            </div>
          </div>
        </div>

        {/* Expenses List */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">দোকানের সাম্প্রতিক খরচসমূহ</h3>
              <p className="text-xs text-slate-500">
                {getSelectedRangeLabel()} • মোট খরচ: {filteredExp.length} টি
              </p>
            </div>
            <button
              onClick={onAddExpense}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>নতুন খরচ যোগ</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {filteredExp.length === 0 ? (
              <p className="text-center py-8 text-xs text-slate-400">
                এই নির্বাচিত সময়ে কোনো খরচ রেকর্ড করা নেই
              </p>
            ) : (
              filteredExp.map(exp => (
                <div key={exp.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {exp.category}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {exp.description} • {new Date(exp.date).toLocaleDateString('bn-BD')}
                    </span>
                  </div>
                  <span className="text-xs font-black text-amber-600">
                    ৳{exp.amount.toLocaleString('bn-BD')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
