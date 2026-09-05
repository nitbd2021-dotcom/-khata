import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Receipt, 
  Calendar, 
  Scale, 
  ArrowUpRight, 
  ArrowDownRight,
  PieChart,
  Layers,
  ChevronRight
} from 'lucide-react';
import { Transaction, Expense } from '../types';

interface MonthlyIncomeExpenseChartProps {
  transactions: Transaction[];
  expenses: Expense[];
  onSelectDate?: (dateYMD: string) => void;
}

export const MonthlyIncomeExpenseChart: React.FC<MonthlyIncomeExpenseChartProps> = ({
  transactions,
  expenses,
  onSelectDate,
}) => {
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [activeTab, setActiveTab] = useState<'chart' | 'weekly' | 'categories'>('chart');

  // Local helper to format Date to YYYY-MM-DD
  const toLocalYMD = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const bengaliMonths = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];

  // Current Month calculations
  const {
    currentMonthName,
    currentYear,
    daysData,
    totalIncome,
    totalExpense,
    netBalance,
    profitMargin,
    dailyAvgIncome,
    dailyAvgExpense,
    weeklyBreakdown,
    topCategories,
    bestIncomeDay,
    highestExpenseDay,
  } = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const curMonthName = bengaliMonths[curMonth];
    const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
    const todayDate = now.getDate();

    // Daily Accumulator Map for Current Month
    const dailyDataMap: Record<number, { income: number; expense: number; txCount: number; expCount: number }> = {};
    for (let day = 1; day <= daysInMonth; day++) {
      dailyDataMap[day] = { income: 0, expense: 0, txCount: 0, expCount: 0 };
    }

    // Process Transactions for Current Month Income
    transactions.forEach(tx => {
      if (!tx.date) return;
      const d = new Date(tx.date);
      if (isNaN(d.getTime())) return;
      if (d.getFullYear() === curYear && d.getMonth() === curMonth) {
        const day = d.getDate();
        const amt = Number(tx.amount) || 0;
        // Income is money received (payment_received or direct cash sale)
        if (tx.type === 'payment_received' || tx.type === 'sale') {
          dailyDataMap[day].income += amt;
          dailyDataMap[day].txCount += 1;
        }
      }
    });

    // Process Expenses for Current Month
    const categoryMap: Record<string, number> = {};
    expenses.forEach(exp => {
      if (!exp.date) return;
      const d = new Date(exp.date);
      if (isNaN(d.getTime())) return;
      if (d.getFullYear() === curYear && d.getMonth() === curMonth) {
        const day = d.getDate();
        const amt = Number(exp.amount) || 0;
        dailyDataMap[day].expense += amt;
        dailyDataMap[day].expCount += 1;

        const cat = exp.category || 'অন্যান্য';
        categoryMap[cat] = (categoryMap[cat] || 0) + amt;
      }
    });

    // Also include transactions that might be marked as expense
    transactions.forEach(tx => {
      if (tx.type === 'expense' && tx.date) {
        const d = new Date(tx.date);
        if (d.getFullYear() === curYear && d.getMonth() === curMonth) {
          const day = d.getDate();
          const amt = Number(tx.amount) || 0;
          dailyDataMap[day].expense += amt;
          dailyDataMap[day].expCount += 1;
          const cat = 'সাধারণ খরচ';
          categoryMap[cat] = (categoryMap[cat] || 0) + amt;
        }
      }
    });

    let sumIncome = 0;
    let sumExpense = 0;
    let maxIncome = -1;
    let maxIncomeDay = 1;
    let maxExp = -1;
    let maxExpDay = 1;

    // Up to current day of the month for realistic trend
    const chartDaysList = [];
    const maxDayToPlot = Math.min(daysInMonth, Math.max(todayDate, 1));

    for (let day = 1; day <= daysInMonth; day++) {
      const item = dailyDataMap[day];
      sumIncome += item.income;
      sumExpense += item.expense;

      if (item.income > maxIncome) {
        maxIncome = item.income;
        maxIncomeDay = day;
      }
      if (item.expense > maxExp) {
        maxExp = item.expense;
        maxExpDay = day;
      }

      // Generate date string
      const ymd = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      chartDaysList.push({
        day,
        dayLabel: `${day.toLocaleString('bn-BD')} তারিখ`,
        shortLabel: `${day}`,
        rawDate: ymd,
        income: item.income,
        expense: item.expense,
        net: item.income - item.expense,
        txCount: item.txCount,
        expCount: item.expCount,
        cumulativeIncome: sumIncome,
        cumulativeExpense: sumExpense,
      });
    }

    const net = sumIncome - sumExpense;
    const margin = sumIncome > 0 ? Math.round((net / sumIncome) * 100) : 0;
    const activeDays = Math.max(1, todayDate);
    const avgInc = Math.round(sumIncome / activeDays);
    const avgExp = Math.round(sumExpense / activeDays);

    // Weekly Groupings
    const weeks = [
      { name: '১ম সপ্তাহ (১-৭ তারিখ)', start: 1, end: 7, income: 0, expense: 0 },
      { name: '২য় সপ্তাহ (৮-১৪ তারিখ)', start: 8, end: 14, income: 0, expense: 0 },
      { name: '৩য় সপ্তাহ (১৫-২১ তারিখ)', start: 15, end: 21, income: 0, expense: 0 },
      { name: `৪র্থ সপ্তাহ (২২-${daysInMonth} তারিখ)`, start: 22, end: daysInMonth, income: 0, expense: 0 },
    ];

    weeks.forEach(w => {
      for (let d = w.start; d <= Math.min(w.end, daysInMonth); d++) {
        w.income += dailyDataMap[d]?.income || 0;
        w.expense += dailyDataMap[d]?.expense || 0;
      }
    });

    // Top categories
    const categoriesList = Object.entries(categoryMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      currentMonthName: curMonthName,
      currentYear: curYear,
      daysData: chartDaysList,
      totalIncome: sumIncome,
      totalExpense: sumExpense,
      netBalance: net,
      profitMargin: margin,
      dailyAvgIncome: avgInc,
      dailyAvgExpense: avgExp,
      weeklyBreakdown: weeks,
      topCategories: categoriesList,
      bestIncomeDay: maxIncome > 0 ? { day: maxIncomeDay, amount: maxIncome } : null,
      highestExpenseDay: maxExp > 0 ? { day: maxExpDay, amount: maxExp } : null,
    };
  }, [transactions, expenses]);

  // Custom Tooltip for Income vs Expense
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const net = data.income - data.expense;
      const isPositive = net >= 0;

      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700/80 backdrop-blur-xs text-xs space-y-2.5 min-w-[210px] pointer-events-none">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>{data.dayLabel} ({currentMonthName})</span>
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
              {data.txCount + data.expCount} টি এন্ট্রি
            </span>
          </div>

          <div className="space-y-1.5 font-medium">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                মোট আয় (জমা):
              </span>
              <span className="font-bold text-white text-sm">
                ৳{data.income.toLocaleString('bn-BD')}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-rose-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                মোট খরচ:
              </span>
              <span className="font-bold text-white text-sm">
                ৳{data.expense.toLocaleString('bn-BD')}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-slate-300">নিট লাভ / উদ্বৃত্ত:</span>
              <span className={`font-bold text-sm ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPositive ? '+' : '-'}৳{Math.abs(net).toLocaleString('bn-BD')}
              </span>
            </div>
          </div>

          {onSelectDate && (
            <p className="text-[10px] text-emerald-300 pt-1 border-t border-slate-800 text-center italic">
              ক্লিক করে এই তারিখের হিসাব বিস্তারিত দেখুন
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div id="monthly-income-expense-section" className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">
                  চলতি মাসের আয় বনাম খরচ বিশ্লেষণ
                </h3>
                <span className="text-[11px] bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                  {currentMonthName} {currentYear.toLocaleString('bn-BD').replace(/,/g, '')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                চলতি মাসে মোট জমা (আয়) ও খরচের দৈনিক গতিপ্রকৃতি এবং লাভ-লোকসান বিশ্লেষণ
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
          {/* Main Tab Controls */}
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('chart')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'chart'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>দৈনিক ট্রেন্ড</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('weekly')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'weekly'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>সাপ্তাহিক হিসাব</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'categories'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>খরচের খাত</span>
            </button>
          </div>

          {/* Chart Sub-type Toggle (when chart tab is active) */}
          {activeTab === 'chart' && (
            <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setChartType('area')}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  chartType === 'area'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
                title="এরিয়া কার্ভ গ্রাফ"
              >
                এরিয়া
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  chartType === 'bar'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
                title="বার চার্ট গ্রাফ"
              >
                বার
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Highlight Stat Cards for Current Month */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Income */}
        <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border border-emerald-200 p-4 rounded-2xl shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              <span>মোট আয় (জমা)</span>
            </span>
            <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700">
            ৳{totalIncome.toLocaleString('bn-BD')}
          </div>
          <div className="flex items-center justify-between text-[11px] text-emerald-700/80 mt-1">
            <span>দৈনিক গড়: ৳{dailyAvgIncome.toLocaleString('bn-BD')}</span>
            {bestIncomeDay && (
              <span className="text-[10px] bg-emerald-100/80 px-1.5 py-0.5 rounded font-bold">
                সেরা: {bestIncomeDay.day} তারিখ
              </span>
            )}
          </div>
        </div>

        {/* Total Expense */}
        <div className="bg-gradient-to-br from-rose-50/80 to-amber-50/50 border border-rose-200 p-4 rounded-2xl shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-rose-800 flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5 text-rose-600" />
              <span>মোট দোকান খরচ</span>
            </span>
            <span className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center text-rose-700">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-700">
            ৳{totalExpense.toLocaleString('bn-BD')}
          </div>
          <div className="flex items-center justify-between text-[11px] text-rose-700/80 mt-1">
            <span>দৈনিক গড়: ৳{dailyAvgExpense.toLocaleString('bn-BD')}</span>
            {highestExpenseDay && (
              <span className="text-[10px] bg-rose-100/80 px-1.5 py-0.5 rounded font-bold">
                সর্বোচ্চ: {highestExpenseDay.day} তারিখ
              </span>
            )}
          </div>
        </div>

        {/* Net Profit / Savings */}
        <div className={`p-4 rounded-2xl border shadow-2xs ${
          netBalance >= 0 
            ? 'bg-gradient-to-br from-indigo-50/80 to-blue-50/50 border-indigo-200 text-indigo-900' 
            : 'bg-gradient-to-br from-amber-50/80 to-red-50/50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-indigo-600" />
              <span>নিট উদ্বৃত্ত / লাভ</span>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              netBalance >= 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {netBalance >= 0 ? 'লাভজনক' : 'ঘাটতি'}
            </span>
          </div>
          <div className={`text-xl sm:text-2xl font-black ${
            netBalance >= 0 ? 'text-indigo-700' : 'text-rose-700'
          }`}>
            {netBalance >= 0 ? '+' : '-'}৳{Math.abs(netBalance).toLocaleString('bn-BD')}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            আয় থেকে খরচ বাদ দিয়ে অবশিষ্ট
          </div>
        </div>

        {/* Profit Margin / Ratio */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-700">আয়-ব্যয় অনুপাত</span>
            <span className="text-[11px] font-bold text-slate-500">চলতি মাস</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {profitMargin}% <span className="text-xs font-normal text-slate-500">লাভ মার্জিন</span>
          </div>
          {/* Progress bar visual */}
          <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden flex">
            <div 
              className="bg-emerald-500 h-full transition-all duration-500" 
              style={{ width: `${totalIncome + totalExpense > 0 ? Math.round((totalIncome / (totalIncome + totalExpense)) * 100) : 50}%` }}
              title={`আয়: ${totalIncome + totalExpense > 0 ? Math.round((totalIncome / (totalIncome + totalExpense)) * 100) : 0}%`}
            />
            <div 
              className="bg-rose-400 h-full transition-all duration-500" 
              style={{ width: `${totalIncome + totalExpense > 0 ? Math.round((totalExpense / (totalIncome + totalExpense)) * 100) : 50}%` }}
              title={`খরচ: ${totalIncome + totalExpense > 0 ? Math.round((totalExpense / (totalIncome + totalExpense)) * 100) : 0}%`}
            />
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'chart' && (
        <div className="space-y-3">
          {/* Chart Container */}
          <div className="w-full h-80 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart
                  data={daysData}
                  margin={{ top: 15, right: 15, left: -15, bottom: 20 }}
                  onClick={(state: any) => {
                    if (state && state.activePayload && state.activePayload.length && onSelectDate) {
                      const clickedDate = state.activePayload[0]?.payload?.rawDate;
                      if (clickedDate) onSelectDate(clickedDate);
                    }
                  }}
                >
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="shortLabel"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickFormatter={(v: string) => `${Number(v).toLocaleString('bn-BD')}`}
                    height={30}
                    label={{ value: `${currentMonthName} মাসের তারিখ`, position: 'insideBottom', offset: -10, fontSize: 11, fill: '#94a3b8' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => {
                      if (v === 0) return '০';
                      if (v >= 100000) return `${(v / 100000).toFixed(1)}L`;
                      if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
                      return `${v}`;
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => {
                      if (value === 'income') return <span className="text-xs font-bold text-slate-700">মোট আয় (৳{totalIncome.toLocaleString('bn-BD')})</span>;
                      if (value === 'expense') return <span className="text-xs font-bold text-slate-700">মোট খরচ (৳{totalExpense.toLocaleString('bn-BD')})</span>;
                      return value;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    name="income"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#incomeGradient)"
                    activeDot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                    className="cursor-pointer"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    name="expense"
                    stroke="#f43f5e"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#expenseGradient)"
                    activeDot={{ r: 6, fill: '#e11d48', stroke: '#ffffff', strokeWidth: 2 }}
                    className="cursor-pointer"
                  />
                </AreaChart>
              ) : (
                <BarChart
                  data={daysData}
                  margin={{ top: 15, right: 15, left: -15, bottom: 20 }}
                  onClick={(state: any) => {
                    if (state && state.activePayload && state.activePayload.length && onSelectDate) {
                      const clickedDate = state.activePayload[0]?.payload?.rawDate;
                      if (clickedDate) onSelectDate(clickedDate);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="shortLabel"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickFormatter={(v: string) => `${Number(v).toLocaleString('bn-BD')}`}
                    height={30}
                    label={{ value: `${currentMonthName} মাসের তারিখ`, position: 'insideBottom', offset: -10, fontSize: 11, fill: '#94a3b8' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => {
                      if (v === 0) return '০';
                      if (v >= 100000) return `${(v / 100000).toFixed(1)}L`;
                      if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
                      return `${v}`;
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => {
                      if (value === 'income') return <span className="text-xs font-bold text-slate-700">মোট আয় (৳{totalIncome.toLocaleString('bn-BD')})</span>;
                      if (value === 'expense') return <span className="text-xs font-bold text-slate-700">মোট খরচ (৳{totalExpense.toLocaleString('bn-BD')})</span>;
                      return value;
                    }}
                  />
                  <Bar
                    dataKey="income"
                    name="income"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={18}
                    className="cursor-pointer hover:opacity-80"
                  />
                  <Bar
                    dataKey="expense"
                    name="expense"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={18}
                    className="cursor-pointer hover:opacity-80"
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Quick Chart Hint Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-2xs" />
                <span className="font-semibold text-slate-700">আয় (নগদ জমা / বিক্রি)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shadow-2xs" />
                <span className="font-semibold text-slate-700">খরচ (দোকানের ব্যয়)</span>
              </div>
            </div>
            <span className="text-[11px] text-slate-400">
              যেকোনো তারিখের পয়েন্টে ক্লিক করলে ফিল্টার স্বয়ংক্রিয়ভাবে ঐ তারিখে যাবে
            </span>
          </div>
        </div>
      )}

      {/* Weekly Breakdown Tab Content */}
      {activeTab === 'weekly' && (
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {weeklyBreakdown.map((week, idx) => {
              const weekNet = week.income - week.expense;
              const isWeekProfitable = weekNet >= 0;
              const weekTotal = week.income + week.expense;
              const incPercent = weekTotal > 0 ? Math.round((week.income / weekTotal) * 100) : 50;

              return (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <span className="text-xs font-bold text-slate-800">{week.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isWeekProfitable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {isWeekProfitable ? 'উদ্বৃত্ত' : 'ঘাটতি'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        আয়:
                      </span>
                      <span className="font-bold text-emerald-700">৳{week.income.toLocaleString('bn-BD')}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        খরচ:
                      </span>
                      <span className="font-bold text-rose-700">৳{week.expense.toLocaleString('bn-BD')}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold">
                      <span className="text-slate-700">নিট লাভ:</span>
                      <span className={isWeekProfitable ? 'text-indigo-700' : 'text-rose-700'}>
                        {isWeekProfitable ? '+' : '-'}৳{Math.abs(weekNet).toLocaleString('bn-BD')}
                      </span>
                    </div>
                  </div>

                  {/* Ratio bar */}
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${incPercent}%` }} />
                    <div className="bg-rose-400 h-full" style={{ width: `${100 - incPercent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expense Categories Breakdown Tab Content */}
      {activeTab === 'categories' && (
        <div className="space-y-3 pt-1">
          {topCategories.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">চলতি মাসে কোনো খরচের রেকর্ড নেই</p>
              <p className="text-[11px] text-slate-400 mt-0.5">নতুন খরচ যোগ করলে এখানে ক্যাটাগরিভিত্তিক বিভাজন দেখা যাবে</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {topCategories.map((cat, idx) => {
                const percentage = totalExpense > 0 ? Math.round((cat.amount / totalExpense) * 100) : 0;
                return (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                        <span>{cat.name}</span>
                      </span>
                      <span className="text-xs font-black text-rose-700">
                        ৳{cat.amount.toLocaleString('bn-BD')}
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>মোট খরচের অংশ:</span>
                      <span className="font-bold text-slate-700">{percentage}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
