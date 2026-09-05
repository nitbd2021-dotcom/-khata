import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  UserPlus, 
  Phone, 
  MapPin, 
  ArrowRight, 
  TrendingUp, 
  Clock, 
  Plus,
  AlertTriangle,
  AlertCircle,
  SlidersHorizontal,
  QrCode
} from 'lucide-react';
import { Customer } from '../types';

interface CustomerListProps {
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onOpenAddCustomer: () => void;
  onQuickAddTx: (type: 'payment_received' | 'credit_given', customerId: string) => void;
  dueThreshold?: number;
  onOpenSettings?: () => void;
  onOpenQRScanner?: () => void;
  onViewQRCode?: (customer: Customer) => void;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  onSelectCustomer,
  onOpenAddCustomer,
  onQuickAddTx,
  dueThreshold = 2500,
  onOpenSettings,
  onOpenQRScanner,
  onViewQRCode,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'receivable' | 'payable' | 'cleared' | 'exceeded'>('all');
  const [sortBy, setSortBy] = useState<'balance_desc' | 'name' | 'recent'>('balance_desc');

  const threshold = Math.max(0, dueThreshold);
  const getCustomerLimit = (c: Customer) => (typeof c.creditLimit === 'number' && c.creditLimit > 0) ? c.creditLimit : threshold;
  const exceededCustomers = customers.filter(c => c.netBalance > 0 && c.netBalance > getCustomerLimit(c));
  const exceededCount = exceededCustomers.length;

  // Filter
  const filtered = customers.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.code && c.code.toLowerCase().includes(search.toLowerCase())) ||
      c.phone.includes(search) ||
      (c.address && c.address.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (filter === 'receivable') return c.netBalance > 0;
    if (filter === 'payable') return c.netBalance < 0;
    if (filter === 'cleared') return c.netBalance === 0;
    if (filter === 'exceeded') return c.netBalance > 0 && c.netBalance > threshold;
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'balance_desc') return b.netBalance - a.netBalance;
    if (sortBy === 'name') return a.name.localeCompare(b.name, 'bn');
    if (sortBy === 'recent') return new Date(b.lastTransactionAt).getTime() - new Date(a.lastTransactionAt).getTime();
    return 0;
  });

  const totalReceivable = customers.reduce((sum, c) => sum + (c.netBalance > 0 ? c.netBalance : 0), 0);
  const totalPayable = customers.reduce((sum, c) => sum + (c.netBalance < 0 ? Math.abs(c.netBalance) : 0), 0);

  return (
    <div className="space-y-5 pb-24 md:pb-12">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <span>কাস্টমার ও বাকি খাতা</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            মোট কাস্টমার: {customers.length} জন • মোট পাওনা: ৳{totalReceivable.toLocaleString('bn-BD')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddCustomer}
            className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-sm transition active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ নতুন কাস্টমার</span>
          </button>
        </div>
      </div>

      {/* Visual Threshold Alert Bar */}
      <div className="bg-gradient-to-r from-amber-50 via-red-50/40 to-amber-50/80 p-3 sm:p-4 rounded-2xl border border-amber-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            exceededCount > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500/20 text-amber-700'
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-900">
                বকেয়া বাকি সতর্কতা সীমা:
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-amber-200 text-amber-950 font-black text-xs border border-amber-300">
                ৳{threshold.toLocaleString('bn-BD')}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              {exceededCount > 0 ? (
                <span className="text-red-700 font-bold">
                  ⚠️ মোট {exceededCount} জন কাস্টমার নির্ধারিত ৳{threshold.toLocaleString('bn-BD')} টাকার সীমা অতিক্রম করেছেন।
                </span>
              ) : (
                <span className="text-emerald-700 font-semibold">
                  ✓ কোনো কাস্টমার বর্তমানে নির্ধারিত সতর্কতা সীমা (৳{threshold.toLocaleString('bn-BD')}) অতিক্রম করেননি।
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {exceededCount > 0 && (
            <button
              onClick={() => setFilter('exceeded')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs ${
                filter === 'exceeded'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-300'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>সীমা অতিক্রান্ত তালিকা ({exceededCount})</span>
            </button>
          )}

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs transition cursor-pointer flex items-center gap-1"
              title="বাকি সতর্কতা সীমা পরিবর্তন করুন"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>সীমা পরিবর্তন</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Box */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="কাস্টমারের নাম, ইউনিক আইডি (যেমন: A1111), বা ফোন দিয়ে খুঁজুন..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full py-0.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                filter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              সকল ({customers.length})
            </button>
            <button
              onClick={() => setFilter('receivable')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                filter === 'receivable'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              বাকি পাওনা
            </button>
            <button
              onClick={() => setFilter('exceeded')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
                filter === 'exceeded'
                  ? 'bg-red-600 text-white shadow-xs'
                  : exceededCount > 0
                  ? 'bg-red-100 text-red-800 border border-red-300 hover:bg-red-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <AlertTriangle className={`w-3 h-3 ${filter === 'exceeded' ? 'text-amber-200' : 'text-red-600'}`} />
              <span>সীমা অতিক্রান্ত ({exceededCount})</span>
            </button>
            <button
              onClick={() => setFilter('payable')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                filter === 'payable'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              দেনা
            </button>
            <button
              onClick={() => setFilter('cleared')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                filter === 'cleared'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              পরিশোধিত
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-slate-400 font-medium">সাজান:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700"
            >
              <option value="balance_desc">সর্বোচ্চ বকেয়া</option>
              <option value="name">নাম অনুযায়ী</option>
              <option value="recent">সাম্প্রতিক লেনদেন</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customers List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {sorted.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-200">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">কোন কাস্টমার পাওয়া যায়নি</h3>
            <p className="text-xs text-slate-400 mt-1">
              {filter === 'exceeded' 
                ? 'বর্তমানে কোনো কাস্টমার বকেয়া বাকি সতর্কতা সীমা অতিক্রম করেননি'
                : 'নতুন কাস্টমার যুক্ত করতে উপরের "+ নতুন কাস্টমার" বাটনে ক্লিক করুন'}
            </p>
          </div>
        ) : (
          sorted.map(customer => {
            const isReceivable = customer.netBalance > 0;
            const isPayable = customer.netBalance < 0;
            const isCleared = customer.netBalance === 0;
            const custLimit = getCustomerLimit(customer);
            const isExceeded = isReceivable && customer.netBalance > custLimit;
            const exceededDiff = isExceeded ? customer.netBalance - custLimit : 0;
            const percentOfLimit = custLimit > 0 ? Math.round((customer.netBalance / custLimit) * 100) : 100;

            return (
              <div
                key={customer.id}
                className={`rounded-2xl p-4 sm:p-5 transition flex flex-col justify-between relative overflow-hidden ${
                  isExceeded
                    ? 'bg-gradient-to-br from-red-50/70 via-white to-amber-50/30 border-2 border-red-400 shadow-xs hover:border-red-500 hover:shadow-md ring-2 ring-red-500/10'
                    : 'bg-white border border-slate-200 hover:border-emerald-300 shadow-2xs hover:shadow-sm'
                }`}
              >
                {/* Visual Alert Strip if Exceeded */}
                {isExceeded && (
                  <div className="mb-3 px-3 py-1.5 rounded-xl bg-red-600/10 border border-red-200 flex items-center justify-between gap-2 text-red-950">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-pulse shrink-0" />
                      <span className="text-red-800 font-extrabold">বাকি সীমা অতিক্রান্ত!</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-red-700 font-semibold">
                        সীমা: ৳{custLimit.toLocaleString('bn-BD')}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-red-600 text-white font-black text-[10px] shadow-xs">
                        +৳{exceededDiff.toLocaleString('bn-BD')} অতিরিক্ত
                      </span>
                    </div>
                  </div>
                )}

                <div 
                  className="cursor-pointer"
                  onClick={() => onSelectCustomer(customer)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base shrink-0 ${
                          isExceeded
                            ? 'bg-red-100 text-red-800 ring-2 ring-red-400/50'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {customer.name.charAt(0)}
                        </div>
                        {isExceeded && (
                          <div 
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-black shadow-xs"
                            title="বাকি সীমা ছাড়িয়েছে"
                          >
                            !
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {customer.code && (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-black text-xs tracking-wider shadow-2xs">
                              {customer.code}
                            </span>
                          )}
                          <h4 className="font-bold text-slate-900 text-base leading-snug">
                            {customer.name}
                          </h4>
                        </div>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{customer.phone || 'ফোন নেই'}</span>
                          </p>
                          {customer.address && (
                            <p className="text-[11px] text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[180px] sm:max-w-xs">{customer.address}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isExceeded
                            ? 'bg-red-600 text-white shadow-xs'
                            : isReceivable
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : isPayable
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isExceeded && <AlertTriangle className="w-3 h-3 text-amber-200 animate-pulse" />}
                        {isReceivable
                          ? `পাওনা ৳${customer.netBalance.toLocaleString('bn-BD')}`
                          : isPayable
                          ? `দেনা ৳${Math.abs(customer.netBalance).toLocaleString('bn-BD')}`
                          : 'হিসাব পরিশোধ'}
                      </span>
                      {isExceeded && (
                        <span className="text-[10px] text-red-700 font-extrabold block mt-0.5">
                          ⚠️ অতিরিক্ত বাকি ({percentOfLimit}%)
                        </span>
                      )}
                    </div>
                  </div>

                  {customer.address && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 mb-2">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{customer.address}</span>
                    </p>
                  )}

                  {/* Visual Progress / Ratio Meter */}
                  {isReceivable && (
                    <div className="mt-2.5 mb-2 p-2 rounded-xl bg-slate-50/80 border border-slate-100">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="font-bold flex items-center gap-1">
                          {isExceeded ? (
                            <span className="text-red-700 font-black flex items-center gap-0.5">
                              <AlertCircle className="w-3 h-3 text-red-600 shrink-0" />
                              <span>সীমা অতিক্রম ({percentOfLimit}%)</span>
                            </span>
                          ) : (
                            <span className="text-slate-600 font-medium">
                              বাকি সীমা ব্যবহার: {percentOfLimit}%
                            </span>
                          )}
                        </span>
                        <span className="text-slate-400 font-mono">
                          সীমা: ৳{threshold.toLocaleString('bn-BD')}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            isExceeded
                              ? 'bg-gradient-to-r from-amber-500 to-red-600 animate-pulse'
                              : customer.netBalance >= threshold * 0.8
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, percentOfLimit)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    <span>সর্বশেষ: {new Date(customer.lastTransactionAt).toLocaleDateString('bn-BD')}</span>
                  </div>
                </div>

                {/* Card Bottom Quick Actions */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 gap-2">
                  <button
                    onClick={() => onSelectCustomer(customer)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>পূর্ণ খাতা দেখুন</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    {onViewQRCode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewQRCode(customer);
                        }}
                        className="p-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 rounded-lg text-xs font-bold transition cursor-pointer border border-slate-200"
                        title="কাস্টমারের কিউআর কোড কার্ড দেখুন ও ডাউনলোড করুন"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onQuickAddTx('payment_received', customer.id)}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition cursor-pointer"
                      title="টাকা পেলাম"
                    >
                      + জমা
                    </button>
                    <button
                      onClick={() => onQuickAddTx('credit_given', customer.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        isExceeded
                          ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                          : 'bg-red-50 hover:bg-red-100 text-red-700'
                      }`}
                      title={isExceeded ? 'সতর্কতা: বাকি সীমা ছাড়িয়েছে! নতুন বাকি দিতে ক্লিক করুন।' : 'বাকি দিলাম'}
                    >
                      {isExceeded ? '⚠️ + বাকি' : '+ বাকি'}
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
