import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  CheckCircle2,
  Clock,
  ArrowRight,
  Download,
  AlertCircle,
  Plus,
  Filter,
  Sparkles,
  Layers,
  ChevronDown
} from 'lucide-react';
import { Customer, Expense, Transaction, User } from '../types';
import { formatBanglaPaymentMethod, formatBanglaTxType, GoogleSheetsService } from '../services/googleSheetsService';

interface ReportsCalendarViewProps {
  user: User;
  customers: Customer[];
  transactions: Transaction[];
  expenses: Expense[];
  onAddExpense?: () => void;
  onViewReceipt?: (transaction: Transaction) => void;
  initialSelectedDate?: string;
  onSelectDateForFilter?: (dateYMD: string) => void;
}

const BANGLA_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const BANGLA_WEEKDAYS = [
  { key: 'sun', short: 'রবি', full: 'রবিবার' },
  { key: 'mon', short: 'সোম', full: 'সোমবার' },
  { key: 'tue', short: 'মঙ্গল', full: 'মঙ্গলবার' },
  { key: 'wed', short: 'বুধ', full: 'বুধবার' },
  { key: 'thu', short: 'বৃহঃ', full: 'বৃহস্পতিবার' },
  { key: 'fri', short: 'শুক্র', full: 'শুক্রবার', isWeekend: true },
  { key: 'sat', short: 'শনি', full: 'শনিবার' },
];

export const ReportsCalendarView: React.FC<ReportsCalendarViewProps> = ({
  user,
  customers,
  transactions,
  expenses,
  onAddExpense,
  onViewReceipt,
  initialSelectedDate,
  onSelectDateForFilter,
}) => {
  // Helper to convert Date to YYYY-MM-DD
  const toLocalYMD = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = useMemo(() => new Date(), []);
  const todayYMD = useMemo(() => toLocalYMD(today), [today]);

  // Calendar view state: Year & Month
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed

  // Selected date state (default to today or initialSelectedDate)
  const [selectedDate, setSelectedDate] = useState<string>(initialSelectedDate || todayYMD);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear(prev => prev - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear(prev => prev + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleJumpToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(todayYMD);
  };

  // Convert English number to Bengali digits
  const toBanglaDigits = (num: number | string): string => {
    return Number(num).toLocaleString('bn-BD');
  };

  // Format full Bengali Date string
  const formatFullBanglaDate = (ymdStr: string): string => {
    if (!ymdStr) return '';
    try {
      const [y, m, d] = ymdStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayName = BANGLA_WEEKDAYS[dateObj.getDay()]?.full || '';
      const monthName = BANGLA_MONTHS[m - 1] || '';
      return `${dayName}, ${toBanglaDigits(d)} ${monthName} ${toBanglaDigits(y).replace(/,/g, '')}`;
    } catch {
      return ymdStr;
    }
  };

  // Precompute transaction and expense maps by YYYY-MM-DD
  const { dateDataMap, activeDaysSet, allActiveDatesSorted } = useMemo(() => {
    const map: Record<
      string,
      {
        transactions: Transaction[];
        expenses: Expense[];
        totalReceived: number;
        totalCredit: number;
        totalExpense: number;
        txCount: number;
      }
    > = {};

    const activeSet = new Set<string>();

    // Process transactions
    transactions.forEach(t => {
      if (!t.date) return;
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return;
      const ymd = toLocalYMD(d);

      if (!map[ymd]) {
        map[ymd] = {
          transactions: [],
          expenses: [],
          totalReceived: 0,
          totalCredit: 0,
          totalExpense: 0,
          txCount: 0,
        };
      }

      map[ymd].transactions.push(t);
      map[ymd].txCount += 1;
      activeSet.add(ymd);

      const amt = Number(t.amount) || 0;
      if (t.type === 'payment_received') {
        map[ymd].totalReceived += amt;
      } else if (
        t.type === 'credit_given' ||
        t.type === 'loan_given' ||
        t.type === 'sale'
      ) {
        map[ymd].totalCredit += amt;
      }
    });

    // Process expenses
    expenses.forEach(e => {
      if (!e.date) return;
      const d = new Date(e.date);
      if (isNaN(d.getTime())) return;
      const ymd = toLocalYMD(d);

      if (!map[ymd]) {
        map[ymd] = {
          transactions: [],
          expenses: [],
          totalReceived: 0,
          totalCredit: 0,
          totalExpense: 0,
          txCount: 0,
        };
      }

      map[ymd].expenses.push(e);
      map[ymd].totalExpense += Number(e.amount) || 0;
      activeSet.add(ymd);
    });

    const sortedDates = Array.from(activeSet).sort();

    return {
      dateDataMap: map,
      activeDaysSet: activeSet,
      allActiveDatesSorted: sortedDates,
    };
  }, [transactions, expenses]);

  // Calculate grid days for the selected month and year
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells: Array<{
      dayNumber: number;
      ymd: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      isWeekend: boolean;
      hasTransactions: boolean;
      txCount: number;
      totalReceived: number;
      totalCredit: number;
      totalExpense: number;
    }> = [];

    // Previous month padding cells
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const ymd = toLocalYMD(prevDate);
      const dayData = dateDataMap[ymd];

      cells.push({
        dayNumber: dayNum,
        ymd,
        isCurrentMonth: false,
        isToday: ymd === todayYMD,
        isSelected: ymd === selectedDate,
        isWeekend: prevDate.getDay() === 5,
        hasTransactions: !!dayData && (dayData.txCount > 0 || dayData.expenses.length > 0),
        txCount: dayData ? dayData.txCount : 0,
        totalReceived: dayData ? dayData.totalReceived : 0,
        totalCredit: dayData ? dayData.totalCredit : 0,
        totalExpense: dayData ? dayData.totalExpense : 0,
      });
    }

    // Current month cells
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const curDate = new Date(currentYear, currentMonth, dayNum);
      const ymd = toLocalYMD(curDate);
      const dayData = dateDataMap[ymd];

      cells.push({
        dayNumber: dayNum,
        ymd,
        isCurrentMonth: true,
        isToday: ymd === todayYMD,
        isSelected: ymd === selectedDate,
        isWeekend: curDate.getDay() === 5,
        hasTransactions: !!dayData && (dayData.txCount > 0 || dayData.expenses.length > 0),
        txCount: dayData ? dayData.txCount : 0,
        totalReceived: dayData ? dayData.totalReceived : 0,
        totalCredit: dayData ? dayData.totalCredit : 0,
        totalExpense: dayData ? dayData.totalExpense : 0,
      });
    }

    // Next month padding cells to complete a 35 or 42 grid
    const totalCellsSoFar = cells.length;
    const remainingCells = totalCellsSoFar <= 35 ? 35 - totalCellsSoFar : 42 - totalCellsSoFar;

    for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
      const nextDate = new Date(currentYear, currentMonth + 1, dayNum);
      const ymd = toLocalYMD(nextDate);
      const dayData = dateDataMap[ymd];

      cells.push({
        dayNumber: dayNum,
        ymd,
        isCurrentMonth: false,
        isToday: ymd === todayYMD,
        isSelected: ymd === selectedDate,
        isWeekend: nextDate.getDay() === 5,
        hasTransactions: !!dayData && (dayData.txCount > 0 || dayData.expenses.length > 0),
        txCount: dayData ? dayData.txCount : 0,
        totalReceived: dayData ? dayData.totalReceived : 0,
        totalCredit: dayData ? dayData.totalCredit : 0,
        totalExpense: dayData ? dayData.totalExpense : 0,
      });
    }

    return cells;
  }, [currentYear, currentMonth, dateDataMap, todayYMD, selectedDate]);

  // Aggregate monthly stats for current viewed month
  const currentMonthStats = useMemo(() => {
    let txCount = 0;
    let totalReceived = 0;
    let totalCredit = 0;
    let totalExpense = 0;
    let activeDaysCount = 0;

    calendarGrid.forEach(cell => {
      if (cell.isCurrentMonth && cell.hasTransactions) {
        activeDaysCount++;
        txCount += cell.txCount;
        totalReceived += cell.totalReceived;
        totalCredit += cell.totalCredit;
        totalExpense += cell.totalExpense;
      }
    });

    return {
      txCount,
      totalReceived,
      totalCredit,
      totalExpense,
      activeDaysCount,
    };
  }, [calendarGrid]);

  // Selected Day's detailed data
  const selectedDayData = useMemo(() => {
    const data = dateDataMap[selectedDate] || {
      transactions: [],
      expenses: [],
      totalReceived: 0,
      totalCredit: 0,
      totalExpense: 0,
      txCount: 0,
    };

    // Sort transactions latest first
    const sortedTxs = [...data.transactions].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // Net daily flow (Cash received minus expenses)
    const netCashFlow = data.totalReceived - data.totalExpense;

    return {
      ...data,
      transactions: sortedTxs,
      netCashFlow,
      isToday: selectedDate === todayYMD,
    };
  }, [dateDataMap, selectedDate, todayYMD]);

  // Handle clicking a cell
  const handleCellClick = (ymd: string, isCurrentMonth: boolean) => {
    setSelectedDate(ymd);

    // If clicked on padding from other month, optionally sync the month view
    if (!isCurrentMonth) {
      const [y, m] = ymd.split('-').map(Number);
      setCurrentYear(y);
      setCurrentMonth(m - 1);
    }
  };

  // Navigation between previous and next active transaction days
  const handlePrevActiveDay = () => {
    const prevDays = allActiveDatesSorted.filter(d => d < selectedDate);
    if (prevDays.length > 0) {
      const target = prevDays[prevDays.length - 1];
      setSelectedDate(target);
      const [y, m] = target.split('-').map(Number);
      setCurrentYear(y);
      setCurrentMonth(m - 1);
    }
  };

  const handleNextActiveDay = () => {
    const nextDays = allActiveDatesSorted.filter(d => d > selectedDate);
    if (nextDays.length > 0) {
      const target = nextDays[0];
      setSelectedDate(target);
      const [y, m] = target.split('-').map(Number);
      setCurrentYear(y);
      setCurrentMonth(m - 1);
    }
  };

  const hasPrevActiveDay = allActiveDatesSorted.some(d => d < selectedDate);
  const hasNextActiveDay = allActiveDatesSorted.some(d => d > selectedDate);

  // Download Day CSV
  const handleDownloadDayCsv = () => {
    if (selectedDayData.transactions.length > 0) {
      GoogleSheetsService.downloadLedgerCsv(user, selectedDayData.transactions);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Month Selector Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  ক্যালেন্ডার খতিয়ান ভিউ (Calendar Ledger)
                </h3>
                <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold border border-indigo-200">
                  তারিখভিত্তিক হিসাব
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                যেসব দিনে লেনদেন হয়েছে তা উজ্জ্বলভাবে চিহ্নিত রয়েছে। যেকোনো তারিখে ট্যাপ করে খতিয়ান সারাংশ দেখুন।
              </p>
            </div>
          </div>

          {/* Jump to Today Button */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={handleJumpToToday}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold transition border border-slate-200 cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>আজকের দিনে যান</span>
            </button>
          </div>
        </div>

        {/* Month & Year Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 shadow-2xs transition cursor-pointer"
              title="পূর্ববর্তী মাস"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Month Dropdown */}
            <div className="relative">
              <select
                value={currentMonth}
                onChange={e => setCurrentMonth(Number(e.target.value))}
                className="appearance-none bg-white font-bold text-slate-800 text-xs sm:text-sm pl-3 pr-7 py-2 rounded-xl border border-slate-200 shadow-2xs focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              >
                {BANGLA_MONTHS.map((name, idx) => (
                  <option key={idx} value={idx}>
                    {name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Year Dropdown */}
            <div className="relative">
              <select
                value={currentYear}
                onChange={e => setCurrentYear(Number(e.target.value))}
                className="appearance-none bg-white font-bold text-slate-800 text-xs sm:text-sm pl-3 pr-7 py-2 rounded-xl border border-slate-200 shadow-2xs focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              >
                {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y => (
                  <option key={y} value={y}>
                    {toBanglaDigits(y).replace(/,/g, '')}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 rounded-xl bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 shadow-2xs transition cursor-pointer"
              title="পরবর্তী মাস"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Month KPI Snapshot */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="bg-white px-2.5 py-1 rounded-xl border border-slate-200 text-slate-600 font-medium">
              সক্রিয় দিন: <strong className="text-indigo-700 font-black">{toBanglaDigits(currentMonthStats.activeDaysCount)}</strong> দিন
            </span>
            <span className="bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 text-emerald-800 font-medium">
              জমা: <strong className="text-emerald-700 font-black">৳{currentMonthStats.totalReceived.toLocaleString('bn-BD')}</strong>
            </span>
            <span className="bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200 text-rose-800 font-medium">
              বাকি: <strong className="text-rose-700 font-black">৳{currentMonthStats.totalCredit.toLocaleString('bn-BD')}</strong>
            </span>
          </div>
        </div>

        {/* Legend Indicator */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>টাকা জমা (Received)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span>বাকি/বিক্রি (Credit Given)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span>দোকান খরচ (Expense)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full ring-2 ring-indigo-500 bg-white inline-block" />
              <span>নির্বাচিত দিন (Selected)</span>
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            * শুক্রবার লাল চিহ্নিত
          </span>
        </div>
      </div>

      {/* Main Responsive Layout: Calendar Grid + Day Ledger Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Interactive Month Calendar (7 cols on lg) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>{BANGLA_MONTHS[currentMonth]} {toBanglaDigits(currentYear).replace(/,/g, '')} ক্যালেন্ডার</span>
            </h4>
            <span className="text-xs text-slate-400 font-medium">
              মোট {toBanglaDigits(calendarGrid.filter(c => c.isCurrentMonth).length)} দিন
            </span>
          </div>

          {/* Weekday Column Headers (7 cols) */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
            {BANGLA_WEEKDAYS.map(w => (
              <div
                key={w.key}
                className={`py-1.5 text-xs font-bold rounded-xl ${
                  w.isWeekend
                    ? 'text-rose-600 bg-rose-50/70 border border-rose-100'
                    : 'text-slate-600 bg-slate-100/70 border border-slate-200/60'
                }`}
              >
                <span>{w.short}</span>
              </div>
            ))}
          </div>

          {/* Days Cells Grid (7 cols) */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {calendarGrid.map((cell, idx) => {
              const hasActivity = cell.hasTransactions;
              const hasReceived = cell.totalReceived > 0;
              const hasCredit = cell.totalCredit > 0;
              const hasExpense = cell.totalExpense > 0;

              return (
                <button
                  key={`${cell.ymd}-${idx}`}
                  type="button"
                  onClick={() => handleCellClick(cell.ymd, cell.isCurrentMonth)}
                  className={`relative group rounded-2xl p-1.5 sm:p-2 flex flex-col justify-between min-h-[64px] sm:min-h-[82px] border text-left transition-all duration-150 cursor-pointer ${
                    cell.isSelected
                      ? 'ring-2 sm:ring-3 ring-indigo-600 border-indigo-600 bg-indigo-50/90 shadow-md z-10'
                      : cell.isToday
                      ? 'border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50/70'
                      : hasActivity
                      ? hasReceived && hasCredit
                        ? 'border-indigo-200 bg-gradient-to-b from-emerald-50/60 to-rose-50/60 hover:border-indigo-400 hover:shadow-xs'
                        : hasReceived
                        ? 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-400 hover:shadow-xs'
                        : hasCredit
                        ? 'border-rose-200 bg-rose-50/50 hover:border-rose-400 hover:shadow-xs'
                        : 'border-amber-200 bg-amber-50/50 hover:border-amber-400 hover:shadow-xs'
                      : cell.isCurrentMonth
                      ? 'border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-300'
                      : 'border-slate-100/60 bg-slate-50/40 text-slate-300 opacity-60 hover:opacity-90'
                  }`}
                >
                  {/* Day Number Header & Badges */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs sm:text-sm font-black inline-flex items-center justify-center rounded-lg w-5 h-5 sm:w-6 sm:h-6 ${
                        cell.isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : cell.isToday
                          ? 'bg-indigo-100 text-indigo-800 font-black ring-1 ring-indigo-300'
                          : cell.isWeekend
                          ? 'text-rose-600'
                          : cell.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {toBanglaDigits(cell.dayNumber)}
                    </span>

                    {/* Today Badge */}
                    {cell.isToday && (
                      <span className="hidden sm:inline-block text-[9px] font-black uppercase tracking-tight bg-indigo-600 text-white px-1.5 py-0.5 rounded-md">
                        আজ
                      </span>
                    )}

                    {/* Transaction Count Pill */}
                    {hasActivity && (
                      <span
                        className={`text-[9px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded-full ${
                          cell.isSelected
                            ? 'bg-indigo-700 text-white'
                            : 'bg-slate-800 text-white shadow-2xs'
                        }`}
                        title={`${toBanglaDigits(cell.txCount)} টি লেনদেন`}
                      >
                        {toBanglaDigits(cell.txCount)}টি
                      </span>
                    )}
                  </div>

                  {/* Financial Micro Summary in Day Cell */}
                  {hasActivity ? (
                    <div className="mt-1 space-y-0.5 w-full overflow-hidden">
                      {/* Received Micro Amount */}
                      {hasReceived && (
                        <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-emerald-700 font-bold truncate">
                          <span className="hidden sm:inline text-emerald-600">জমা:</span>
                          <span className="truncate">+{toBanglaDigits(cell.totalReceived)}৳</span>
                        </div>
                      )}

                      {/* Credit Micro Amount */}
                      {hasCredit && (
                        <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-rose-700 font-bold truncate">
                          <span className="hidden sm:inline text-rose-600">বাকি:</span>
                          <span className="truncate">-{toBanglaDigits(cell.totalCredit)}৳</span>
                        </div>
                      )}

                      {/* Dot Indicators on mobile if crowded */}
                      <div className="flex items-center gap-1 sm:hidden pt-0.5">
                        {hasReceived && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                        {hasCredit && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                        {hasExpense && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                      </div>
                    </div>
                  ) : (
                    <div className="hidden sm:block text-[10px] text-slate-300 italic pt-1">
                      -
                    </div>
                  )}

                  {/* Bottom selection indicator accent */}
                  {cell.isSelected && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full bg-indigo-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Day Ledger Summary (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Day Header Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>দিনের হিসাব সারাংশ</span>
                  </span>
                  {selectedDayData.isToday && (
                    <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                      আজকের দিন
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {formatFullBanglaDate(selectedDate)}
                </h3>
              </div>

              {/* Prev/Next active day buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevActiveDay}
                  disabled={!hasPrevActiveDay}
                  className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                  title="পূর্ববর্তী লেনদেনের দিন"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextActiveDay}
                  disabled={!hasNextActiveDay}
                  className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                  title="পরবর্তী লেনদেনের দিন"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 4 Financial Stat KPI Cards for the Selected Day */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Cash Received */}
              <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-2xl">
                <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold mb-1">
                  <span>মোট নগদ জমা</span>
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-lg font-black text-emerald-700">
                  ৳{selectedDayData.totalReceived.toLocaleString('bn-BD')}
                </div>
                <span className="text-[10px] text-emerald-600/80">ক্যাশ ও ডিজিটাল আদায়</span>
              </div>

              {/* Credit Given / Sales */}
              <div className="bg-rose-50/60 border border-rose-200 p-3 rounded-2xl">
                <div className="flex items-center justify-between text-rose-800 text-xs font-semibold mb-1">
                  <span>নতুন বাকি দেওয়া</span>
                  <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                </div>
                <div className="text-lg font-black text-rose-700">
                  ৳{selectedDayData.totalCredit.toLocaleString('bn-BD')}
                </div>
                <span className="text-[10px] text-rose-600/80">পাওনা বৃদ্ধি পেয়েছে</span>
              </div>

              {/* Day Expenses */}
              <div className="bg-amber-50/60 border border-amber-200 p-3 rounded-2xl">
                <div className="flex items-center justify-between text-amber-800 text-xs font-semibold mb-1">
                  <span>দোকানের খরচ</span>
                  <Receipt className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="text-lg font-black text-amber-700">
                  ৳{selectedDayData.totalExpense.toLocaleString('bn-BD')}
                </div>
                <span className="text-[10px] text-amber-600/80">দৈনিক ব্যয়</span>
              </div>

              {/* Net Daily Cash Flow */}
              <div className="bg-indigo-50/60 border border-indigo-200 p-3 rounded-2xl">
                <div className="flex items-center justify-between text-indigo-800 text-xs font-semibold mb-1">
                  <span>নিট ক্যাশফ্লো</span>
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <div className={`text-lg font-black ${
                  selectedDayData.netCashFlow >= 0 ? 'text-indigo-700' : 'text-rose-700'
                }`}>
                  ৳{selectedDayData.netCashFlow.toLocaleString('bn-BD')}
                </div>
                <span className="text-[10px] text-indigo-600/80">জমা - খরচ</span>
              </div>
            </div>

            {/* Actions: Download Day Report / Filter Full Report */}
            {selectedDayData.transactions.length > 0 && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleDownloadDayCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>ঐ দিনের CSV</span>
                </button>

                {onSelectDateForFilter && (
                  <button
                    type="button"
                    onClick={() => onSelectDateForFilter(selectedDate)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <span>পূর্ণাঙ্গ রিপোর্টে দেখুন</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Itemized Transactions List for Selected Date */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>ঐ দিনের লেনদেনসমূহ ({toBanglaDigits(selectedDayData.transactions.length)}টি)</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-medium">
                সর্বমোট ৳{(selectedDayData.totalReceived + selectedDayData.totalCredit).toLocaleString('bn-BD')}
              </span>
            </div>

            {selectedDayData.transactions.length === 0 ? (
              <div className="py-8 px-4 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">
                  এই তারিখে কোনো লেনদেন হয়নি
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  ক্যালেন্ডার গ্রিডে সবুজ বা লাল ডট চিহ্নিত যেকোনো সক্রিয় দিনে ক্লিক করে লেনদেন ও খতিয়ান দেখুন।
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto space-y-0.5 pr-1">
                {selectedDayData.transactions.map(tx => {
                  const isReceived = tx.type === 'payment_received';
                  const isCredit = tx.type === 'credit_given' || tx.type === 'loan_given';
                  const timeStr = tx.date ? new Date(tx.date).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }) : '';

                  return (
                    <div
                      key={tx.id}
                      className="py-2.5 px-2 rounded-xl hover:bg-slate-50 transition flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isReceived
                              ? 'bg-emerald-100 text-emerald-700'
                              : isCredit
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {isReceived ? 'জমা' : isCredit ? 'বাকি' : 'হিসাব'}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {tx.customerName}
                            </span>
                            {tx.customerPhone && (
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({tx.customerPhone})
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5 flex-wrap">
                            <span className="font-semibold text-slate-700">
                              {formatBanglaTxType(tx.type)}
                            </span>
                            {timeStr && (
                              <>
                                <span>•</span>
                                <span>{timeStr}</span>
                              </>
                            )}
                            {tx.paymentMethod && (
                              <>
                                <span>•</span>
                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                                  {formatBanglaPaymentMethod(tx.paymentMethod)}
                                </span>
                              </>
                            )}
                            {tx.description && (
                              <>
                                <span>•</span>
                                <span className="italic truncate max-w-[120px]">
                                  {tx.description}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Amount & Receipt Action */}
                      <div className="text-right shrink-0 flex flex-col items-end">
                        <span
                          className={`text-xs sm:text-sm font-black ${
                            isReceived
                              ? 'text-emerald-600'
                              : isCredit
                              ? 'text-rose-600'
                              : 'text-slate-800'
                          }`}
                        >
                          {isReceived ? '+' : isCredit ? '-' : ''}৳{tx.amount.toLocaleString('bn-BD')}
                        </span>

                        {onViewReceipt && (
                          <button
                            type="button"
                            onClick={() => onViewReceipt(tx)}
                            className="mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[10px] font-bold transition cursor-pointer shadow-2xs"
                            title="রসিদ দেখুন ও শেয়ার করুন"
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

          {/* Expenses on Selected Date */}
          {selectedDayData.expenses.length > 0 && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-amber-600" />
                  <span>ঐ দিনের দোকান খরচ ({toBanglaDigits(selectedDayData.expenses.length)}টি)</span>
                </h4>
                <span className="text-xs font-bold text-amber-700">
                  মোট ৳{selectedDayData.totalExpense.toLocaleString('bn-BD')}
                </span>
              </div>

              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {selectedDayData.expenses.map(exp => (
                  <div key={exp.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800 block">{exp.category}</span>
                      {exp.description && (
                        <span className="text-[10px] text-slate-400">{exp.description}</span>
                      )}
                    </div>
                    <span className="font-bold text-amber-600">
                      ৳{exp.amount.toLocaleString('bn-BD')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
