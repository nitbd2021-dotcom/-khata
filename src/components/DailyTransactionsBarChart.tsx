import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { BarChart3, TrendingUp, Wallet, CreditCard, Calendar } from 'lucide-react';
import { Transaction } from '../types';

interface DailyTransactionsBarChartProps {
  transactions: Transaction[];
  onSelectDate?: (dateYMD: string) => void;
}

export const DailyTransactionsBarChart: React.FC<DailyTransactionsBarChartProps> = ({
  transactions,
  onSelectDate,
}) => {
  const [viewMode, setViewMode] = useState<'both' | 'received' | 'credit'>('both');

  // Helper to convert Date object to YYYY-MM-DD
  const toLocalYMD = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Convert Bengali numerals for date display
  const toBanglaDigits = (num: number | string): string => {
    return Number(num).toLocaleString('bn-BD');
  };

  // Compute daily aggregated transactions over the last 30 days
  const { chartData, totalReceived30d, totalCredit30d, grandTotal30d, dailyAverage30d, peakDay } = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Map to accumulate data by YYYY-MM-DD
    const dailyMap: Record<string, { received: number; credit: number; total: number; count: number }> = {};

    transactions.forEach(tx => {
      if (!tx.date) return;
      const d = new Date(tx.date);
      if (isNaN(d.getTime())) return;
      const ymd = toLocalYMD(d);

      if (!dailyMap[ymd]) {
        dailyMap[ymd] = { received: 0, credit: 0, total: 0, count: 0 };
      }

      const amount = Number(tx.amount) || 0;
      if (tx.type === 'payment_received') {
        dailyMap[ymd].received += amount;
      } else if (tx.type === 'credit_given' || tx.type === 'loan_given' || tx.type === 'sale') {
        dailyMap[ymd].credit += amount;
      }
      dailyMap[ymd].total += amount;
      dailyMap[ymd].count += 1;
    });

    const bengaliMonths = [
      'জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ', 'অক্টো', 'নভে', 'ডিসে'
    ];

    const data = [];
    let totRec = 0;
    let totCred = 0;
    let maxDayAmount = -1;
    let maxDayLabel = '';

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const ymd = toLocalYMD(d);
      const dayNum = d.getDate();
      const monthShort = bengaliMonths[d.getMonth()];
      const dateLabel = `${dayNum} ${monthShort}`;

      const item = dailyMap[ymd] || { received: 0, credit: 0, total: 0, count: 0 };
      totRec += item.received;
      totCred += item.credit;

      if (item.total > maxDayAmount) {
        maxDayAmount = item.total;
        maxDayLabel = dateLabel;
      }

      data.push({
        rawDate: ymd,
        dateLabel,
        dayNum: `${dayNum}`,
        received: item.received,
        credit: item.credit,
        total: item.total,
        count: item.count,
      });
    }

    const grandTotal = totRec + totCred;
    const dailyAvg = Math.round(grandTotal / 30);

    return {
      chartData: data,
      totalReceived30d: totRec,
      totalCredit30d: totCred,
      grandTotal30d: grandTotal,
      dailyAverage30d: dailyAvg,
      peakDay: maxDayAmount > 0 ? { label: maxDayLabel, amount: maxDayAmount } : null,
    };
  }, [transactions]);

  // Custom Tooltip component for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl border border-slate-700/60 backdrop-blur-xs text-xs space-y-2 min-w-[190px] pointer-events-none">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>{data.dateLabel}</span>
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-medium">
              {data.count} টি লেনদেন
            </span>
          </div>

          <div className="space-y-1.5 font-medium">
            {(viewMode === 'both' || viewMode === 'received') && (
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                  নগদ জমা:
                </span>
                <span className="font-bold text-white">৳{data.received.toLocaleString('bn-BD')}</span>
              </div>
            )}

            {(viewMode === 'both' || viewMode === 'credit') && (
              <div className="flex items-center justify-between">
                <span className="text-rose-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                  বাকি দেওয়া:
                </span>
                <span className="font-bold text-white">৳{data.credit.toLocaleString('bn-BD')}</span>
              </div>
            )}

            {viewMode === 'both' && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-slate-300">
                <span>মোট লেনদেন:</span>
                <span className="font-bold text-indigo-300">৳{data.total.toLocaleString('bn-BD')}</span>
              </div>
            )}
          </div>

          {onSelectDate && (
            <p className="text-[10px] text-indigo-300 pt-1 border-t border-slate-800 text-center italic">
              ক্লিক করে এই দিনের রিপোর্ট দেখুন
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div id="daily-transactions-chart" className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>গত ৩০ দিনের দৈনিক লেনদেন চিত্র</span>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold border border-indigo-100">
                  Recharts
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                প্রতিদিনের নগদ জমা ও বাকির পরিমাণ (গত ৩০ দিন)
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Pills */}
        <div className="inline-flex bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-center border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('both')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'both'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            উভয় (জমা ও বাকি)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('received')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              viewMode === 'received'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>জমা</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('credit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              viewMode === 'credit'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-rose-700'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>বাকি</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span className="text-[11px] text-slate-500 font-medium block">৩০ দিনের মোট লেনদেন</span>
          <span className="text-sm font-black text-slate-900">৳{grandTotal30d.toLocaleString('bn-BD')}</span>
        </div>
        <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
          <span className="text-[11px] text-emerald-700 font-medium block">মোট নগদ জমা</span>
          <span className="text-sm font-black text-emerald-700">৳{totalReceived30d.toLocaleString('bn-BD')}</span>
        </div>
        <div className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-100">
          <span className="text-[11px] text-rose-700 font-medium block">মোট বাকি দেওয়া</span>
          <span className="text-sm font-black text-rose-700">৳{totalCredit30d.toLocaleString('bn-BD')}</span>
        </div>
        <div className="bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100">
          <span className="text-[11px] text-indigo-700 font-medium block">দৈনিক গড় লেনদেন</span>
          <span className="text-sm font-black text-indigo-700">৳{dailyAverage30d.toLocaleString('bn-BD')}</span>
        </div>
      </div>

      {/* Recharts Bar Chart Container */}
      <div className="w-full h-72 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
            onClick={(state: any) => {
              if (state && state.activePayload && state.activePayload.length && onSelectDate) {
                const clickedDate = state.activePayload[0]?.payload?.rawDate;
                if (clickedDate) onSelectDate(clickedDate);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              interval={2}
              angle={-25}
              textAnchor="end"
              height={35}
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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.8 }} />

            {(viewMode === 'both' || viewMode === 'received') && (
              <Bar
                dataKey="received"
                name="নগদ জমা"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                className="cursor-pointer transition hover:opacity-80"
              />
            )}

            {(viewMode === 'both' || viewMode === 'credit') && (
              <Bar
                dataKey="credit"
                name="বাকি দেওয়া"
                fill="#f43f5e"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                className="cursor-pointer transition hover:opacity-80"
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend and Peak Info Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block shadow-2xs" />
            <span className="font-semibold text-slate-700">নগদ জমা (Payment Received)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-500 inline-block shadow-2xs" />
            <span className="font-semibold text-slate-700">বাকি দেওয়া (Credit Given)</span>
          </div>
        </div>

        {peakDay && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 self-start sm:self-auto">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>সর্বোচ্চ লেনদেন: <strong>{peakDay.label}</strong> (৳{peakDay.amount.toLocaleString('bn-BD')})</span>
          </div>
        )}
      </div>
    </div>
  );
};
