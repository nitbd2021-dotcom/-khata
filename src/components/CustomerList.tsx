import React, { useState, useMemo } from 'react';
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
  QrCode,
  FileText,
  Smartphone,
  X,
  Sparkles,
  Tag,
  Ban
} from 'lucide-react';
import { Customer } from '../types';
import { PRESET_CUSTOMER_TAGS } from '../constants/customerTags';
import { CustomerTagList } from './CustomerTagBadge';
import { CustomerTagModal } from './CustomerTagModal';
import { StorageService } from '../services/storageService';

// Convert Bangla numerals (০-৯) to English digits (0-9) for seamless phone searching
const banglaToEnglishDigits = (str: string): string => {
  const banglaMap: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  };
  return str.replace(/[০-৯]/g, d => banglaMap[d] || d);
};

interface CustomerListProps {
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onOpenAddCustomer: () => void;
  onQuickAddTx: (type: 'payment_received' | 'credit_given', customerId: string) => void;
  dueThreshold?: number;
  onOpenSettings?: () => void;
  onOpenQRScanner?: () => void;
  onViewQRCode?: (customer: Customer) => void;
  onViewStatement?: (customer: Customer) => void;
  onOpenPhoneContacts?: () => void;
  onCustomerUpdated?: () => void;
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
  onViewStatement,
  onOpenPhoneContacts,
  onCustomerUpdated,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'receivable' | 'payable' | 'cleared' | 'exceeded'>('all');
  const [sortBy, setSortBy] = useState<'balance_desc' | 'name' | 'recent'>('balance_desc');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [tagModalCustomer, setTagModalCustomer] = useState<Customer | null>(null);

  const threshold = Math.max(0, dueThreshold);
  const getCustomerLimit = (c: Customer) => (typeof c.creditLimit === 'number' && c.creditLimit > 0) ? c.creditLimit : threshold;
  const exceededCustomers = customers.filter(c => c.netBalance > 0 && c.netBalance > getCustomerLimit(c));
  const exceededCount = exceededCustomers.length;

  // Calculate tag counts and gather any user-created custom tags
  const { tagCounts, customTagsList } = useMemo(() => {
    const counts: Record<string, number> = {
      all: customers.length,
      regular: 0,
      wholesale: 0,
      blocked: 0,
      vip: 0,
      retail: 0,
    };
    const customSet = new Set<string>();

    customers.forEach(c => {
      if (c.tags && Array.isArray(c.tags)) {
        c.tags.forEach(t => {
          const norm = t.trim().toLowerCase();
          counts[norm] = (counts[norm] || 0) + 1;
          if (!PRESET_CUSTOMER_TAGS.some(p => p.id === norm)) {
            customSet.add(norm);
          }
        });
      }
    });

    return {
      tagCounts: counts,
      customTagsList: Array.from(customSet),
    };
  }, [customers]);

  // Real-time Search & Filter: filters as user types by name, phone, code, tag, or balance status
  const filtered = useMemo(() => {
    const rawSearch = search.trim().toLowerCase();
    const queryDigits = banglaToEnglishDigits(rawSearch);

    return customers.filter(c => {
      // 1. Tag-based filtering
      if (selectedTagFilter !== 'all') {
        if (!c.tags || !c.tags.map(t => t.toLowerCase()).includes(selectedTagFilter.toLowerCase())) {
          return false;
        }
      }

      // 2. Real-time Search query matching
      if (rawSearch) {
        const nameLower = c.name.toLowerCase();
        const phone = c.phone.trim();
        const phoneDigits = banglaToEnglishDigits(phone);
        const codeLower = (c.code || '').toLowerCase();
        const addressLower = (c.address || '').toLowerCase();
        const tagsJoined = (c.tags || []).join(' ').toLowerCase();

        const matchesName = nameLower.includes(rawSearch) || nameLower.includes(queryDigits);
        const matchesPhone = phone.includes(rawSearch) || phoneDigits.includes(queryDigits) || phone.includes(queryDigits);
        const matchesCode = codeLower.includes(rawSearch) || codeLower.includes(queryDigits);
        const matchesAddress = addressLower.includes(rawSearch);
        const matchesTag = tagsJoined.includes(rawSearch);

        if (!matchesName && !matchesPhone && !matchesCode && !matchesAddress && !matchesTag) {
          return false;
        }
      }

      // 3. Status filter
      if (filter === 'receivable') return c.netBalance > 0;
      if (filter === 'payable') return c.netBalance < 0;
      if (filter === 'cleared') return c.netBalance === 0;
      if (filter === 'exceeded') return c.netBalance > 0 && c.netBalance > threshold;
      return true;
    });
  }, [customers, search, filter, selectedTagFilter, threshold]);

  // Sort customers
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === 'balance_desc') return b.netBalance - a.netBalance;
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'bn');
      if (sortBy === 'recent') return new Date(b.lastTransactionAt).getTime() - new Date(a.lastTransactionAt).getTime();
      return 0;
    });
  }, [filtered, sortBy]);

  const handleSaveCustomerTags = (customerId: string, updatedTags: string[]) => {
    StorageService.updateCustomerTags(customerId, updatedTags);
    const target = customers.find(c => c.id === customerId);
    if (target) {
      target.tags = updatedTags;
    }
    if (onCustomerUpdated) {
      onCustomerUpdated();
    }
  };

  const totalReceivable = customers.reduce((sum, c) => sum + (c.netBalance > 0 ? c.netBalance : 0), 0);
  const totalPayable = customers.reduce((sum, c) => sum + (c.netBalance < 0 ? Math.abs(c.netBalance) : 0), 0);

  return (
    <div id="customer-list-container" className="space-y-4 pb-24 md:pb-12">
      
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

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenPhoneContacts && (
            <button
              id="customer-phone-contacts-btn"
              onClick={onOpenPhoneContacts}
              className="inline-flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold px-3 sm:px-3.5 py-2.5 rounded-xl text-xs sm:text-sm shadow-2xs transition active:scale-95 cursor-pointer"
              title="ডিএসআর-এর মোবাইলের সেভ থাকা নাম্বার থেকে কাস্টমার যোগ করুন"
            >
              <Smartphone className="w-4 h-4 text-indigo-600" />
              <span>ফোন কন্ট্যাক্টস</span>
            </button>
          )}

          <button
            id="customer-add-new-btn"
            onClick={onOpenAddCustomer}
            className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-sm transition active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ নতুন কাস্টমার</span>
          </button>
        </div>
      </div>

      {/* Real-time Search Bar at the Top of CustomerList */}
      <div 
        id="customer-realtime-search-bar" 
        className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/30 hover:border-emerald-500/60 focus-within:border-emerald-600 shadow-xs transition-all space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <label 
            htmlFor="customer-search-input" 
            className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer"
          >
            <Search className="w-4 h-4 text-emerald-600" />
            <span>রিয়েল-টাইম কাস্টমার সার্চ (নাম বা মোবাইল নাম্বার)</span>
          </label>

          {/* Real-time Search Status Badge */}
          <div className="flex items-center gap-2 text-xs">
            {search.trim() ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>ফলাফল: {sorted.length} জন কাস্টমার</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 font-medium">
                নাম বা ফোন নাম্বার টাইপ করা মাত্র ফিল্টার হবে
              </span>
            )}
          </div>
        </div>

        {/* Search Input Box */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="customer-search-input"
            type="text"
            placeholder="কাস্টমারের নাম বা ফোন নাম্বার লিখুন... (যেমন: রহিম, করিম, অথবা 017...)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition shadow-2xs font-medium"
            autoComplete="off"
          />
          {search && (
            <button
              id="customer-search-clear-button"
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              title="সার্চ মুছুন"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Chips & Sort Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full py-0.5">
            <button
              id="customer-filter-all"
              onClick={() => setFilter('all')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                filter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              সকল ({customers.length})
            </button>
            <button
              id="customer-filter-receivable"
              onClick={() => setFilter('receivable')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                filter === 'receivable'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              বাকি পাওনা
            </button>
            <button
              id="customer-filter-exceeded"
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
              id="customer-filter-payable"
              onClick={() => setFilter('payable')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                filter === 'payable'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              দেনা
            </button>
            <button
              id="customer-filter-cleared"
              onClick={() => setFilter('cleared')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                filter === 'cleared'
                  ? 'bg-emerald-600 text-white shadow-2xs'
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
              id="customer-sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="balance_desc">সর্বোচ্চ বকেয়া</option>
              <option value="name">নাম অনুযায়ী</option>
              <option value="recent">সাম্প্রতিক লেনদেন</option>
            </select>
          </div>
        </div>

        {/* Customer Category & Tag Filter Row */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Tag className="w-3.5 h-3.5 text-emerald-600" />
              <span>কাস্টমার ট্যাগ ফিল্টার:</span>
            </div>
            {selectedTagFilter !== 'all' && (
              <button
                type="button"
                id="customer-tag-clear-btn"
                onClick={() => setSelectedTagFilter('all')}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition"
              >
                <X className="w-3 h-3" />
                <span>ট্যাগ ফিল্টার মুছুন</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-wrap">
            <button
              type="button"
              id="customer-tag-filter-all"
              onClick={() => setSelectedTagFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 border ${
                selectedTagFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
            >
              সব ({customers.length})
            </button>

            {PRESET_CUSTOMER_TAGS.map(tagDef => {
              const count = tagCounts[tagDef.id] || 0;
              const isSelected = selectedTagFilter === tagDef.id;
              return (
                <button
                  key={tagDef.id}
                  type="button"
                  id={`customer-tag-filter-${tagDef.id}`}
                  onClick={() => setSelectedTagFilter(isSelected ? 'all' : tagDef.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                    isSelected
                      ? tagDef.activeFilterClass
                      : count > 0
                      ? `${tagDef.badgeClass} hover:opacity-90`
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                  }`}
                  title={tagDef.description}
                >
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : tagDef.dotColor}`} />
                  <span>{tagDef.bnLabel}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isSelected ? 'bg-black/25 text-white' : 'bg-black/5 text-slate-700 font-black'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}

            {customTagsList.map(customTag => {
              const count = tagCounts[customTag] || 0;
              const isSelected = selectedTagFilter === customTag;
              return (
                <button
                  key={customTag}
                  type="button"
                  id={`customer-tag-filter-custom-${customTag}`}
                  onClick={() => setSelectedTagFilter(isSelected ? 'all' : customTag)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <Tag className="w-3 h-3 text-slate-500" />
                  <span>{customTag}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-black/5 font-black">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
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

      {/* Customers List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {sorted.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-10 text-center border border-slate-200">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">
              {search.trim() ? 'কোনো কাস্টমার খুঁজে পাওয়া যায়নি' : 'কোনো কাস্টমার নেই'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {search.trim() ? (
                <span>
                  &ldquo;<strong className="text-slate-800 font-bold">{search}</strong>&rdquo; নাম বা ফোন নাম্বারের সাথে কোনো মিল পাওয়া যায়নি।
                </span>
              ) : filter === 'exceeded' ? (
                'বর্তমানে কোনো কাস্টমার বকেয়া বাকি সতর্কতা সীমা অতিক্রম করেননি'
              ) : (
                'নতুন কাস্টমার যুক্ত করতে উপরের "+ নতুন কাস্টমার" বাটনে ক্লিক করুন'
              )}
            </p>
            {search.trim() && (
              <button
                id="customer-empty-clear-search-btn"
                type="button"
                onClick={() => setSearch('')}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition cursor-pointer border border-emerald-200"
              >
                <X className="w-3.5 h-3.5" />
                <span>সার্চ মুছে সব কাস্টমার দেখুন</span>
              </button>
            )}
            {selectedTagFilter !== 'all' && (
              <button
                id="customer-empty-clear-tag-btn"
                type="button"
                onClick={() => setSelectedTagFilter('all')}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-300"
              >
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                <span>ট্যাগ ফিল্টার তুলে সব দেখুন</span>
              </button>
            )}
          </div>
        ) : (
          sorted.map(customer => {
            const isReceivable = customer.netBalance > 0;
            const isPayable = customer.netBalance < 0;
            const isCleared = customer.netBalance === 0;
            const isBlocked = (customer.tags || []).map(t => t.toLowerCase()).includes('blocked');
            const custLimit = getCustomerLimit(customer);
            const isExceeded = isReceivable && customer.netBalance > custLimit;
            const exceededDiff = isExceeded ? customer.netBalance - custLimit : 0;
            const percentOfLimit = custLimit > 0 ? Math.round((customer.netBalance / custLimit) * 100) : 100;

            return (
              <div
                key={customer.id}
                className={`rounded-2xl p-4 sm:p-5 transition flex flex-col justify-between relative overflow-hidden ${
                  isBlocked
                    ? 'bg-gradient-to-br from-red-50/50 via-white to-slate-50 border-2 border-red-300 shadow-2xs hover:border-red-400 ring-1 ring-red-300/40'
                    : isExceeded
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
                          isBlocked
                            ? 'bg-red-100 text-red-800 ring-2 ring-red-400/50'
                            : isExceeded
                            ? 'bg-red-100 text-red-800 ring-2 ring-red-400/50'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isBlocked ? <Ban className="w-5 h-5 text-red-600" /> : customer.name.charAt(0)}
                        </div>
                        {isExceeded && !isBlocked && (
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
                          <h4 className={`font-bold text-base leading-snug ${
                            search.trim() && (customer.name.toLowerCase().includes(search.trim().toLowerCase()) || customer.name.toLowerCase().includes(banglaToEnglishDigits(search.trim().toLowerCase())))
                              ? 'text-emerald-900 font-black'
                              : 'text-slate-900'
                          }`}>
                            {customer.name}
                          </h4>
                        </div>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className={
                              search.trim() && (
                                customer.phone.includes(search.trim()) || 
                                banglaToEnglishDigits(customer.phone).includes(banglaToEnglishDigits(search.trim())) ||
                                customer.phone.includes(banglaToEnglishDigits(search.trim()))
                              )
                                ? 'font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200'
                                : ''
                            }>
                              {customer.phone || 'ফোন নেই'}
                            </span>
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

                  {/* Customer Tags Display */}
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <CustomerTagList
                      tags={customer.tags}
                      onTagClick={(tagId) => setSelectedTagFilter(tagId)}
                      onAddTagClick={() => setTagModalCustomer(customer)}
                      size="sm"
                    />
                  </div>

                  {/* Blocked Warning Banner */}
                  {isBlocked && (
                    <div className="mt-2 px-2.5 py-1 rounded-xl bg-red-100/80 border border-red-300 flex items-center justify-between gap-1 text-red-900">
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <Ban className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>ব্লকড / স্থগিত কাস্টমার (বাকি প্রদান সতর্ক থাকুন)</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTagModalCustomer(customer);
                        }}
                        className="text-[10px] font-bold text-red-700 hover:text-red-950 underline shrink-0 cursor-pointer"
                      >
                        পরিবর্তন
                      </button>
                    </div>
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
                    {/* Tag Editor Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTagModalCustomer(customer);
                      }}
                      className="p-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-lg text-xs font-bold transition cursor-pointer border border-slate-200"
                      title="কাস্টমার ট্যাগ বা ক্যাটাগরি সম্পাদনা করুন"
                    >
                      <Tag className="w-3.5 h-3.5" />
                    </button>

                    {onViewStatement && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewStatement(customer);
                        }}
                        className="p-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 rounded-lg text-xs font-bold transition cursor-pointer border border-slate-200"
                        title="কাস্টমারের লেজার স্টেটমেন্ট ও PDF ডাউনলোড"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    )}
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

      {/* Customer Tag Management Modal */}
      {tagModalCustomer && (
        <CustomerTagModal
          isOpen={Boolean(tagModalCustomer)}
          customer={tagModalCustomer}
          onClose={() => setTagModalCustomer(null)}
          onSaveTags={handleSaveCustomerTags}
        />
      )}

    </div>
  );
};
