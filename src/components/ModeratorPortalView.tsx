import React, { useState } from 'react';
import { 
  Users, 
  Store, 
  FileSpreadsheet, 
  ArrowRight, 
  ExternalLink, 
  Search, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  UserCheck, 
  Wallet, 
  Receipt, 
  Clock, 
  Phone, 
  Mail, 
  X, 
  Eye, 
  ChevronRight,
  ShieldCheck,
  Building2,
  Filter,
  CheckCircle2,
  BadgeAlert,
  Plus,
  Trash2,
  UserPlus,
  CreditCard,
  Edit2,
  Check,
  AlertTriangle
} from 'lucide-react';
import { Customer, Transaction, User } from '../types';
import { StorageService } from '../services/storageService';
import { formatBanglaTxType, GoogleSheetsService } from '../services/googleSheetsService';

interface ModeratorPortalViewProps {
  currentUser: User;
  targetModeratorId?: string;
  onSwitchUser?: (userId: string) => void;
  onSwitchToUserShop?: (userId: string) => void;
  onExitModerator?: () => void;
  onExitPortal?: () => void;
}

export const ModeratorPortalView: React.FC<ModeratorPortalViewProps> = ({
  currentUser,
  targetModeratorId,
  onSwitchUser,
  onSwitchToUserShop,
  onExitModerator,
  onExitPortal,
}) => {
  const handleExit = onExitPortal || onExitModerator || (() => {});
  const handleSwitch = onSwitchToUserShop || onSwitchUser;

  // If Super Admin is viewing, they can select which moderator to view or view all
  const isAdmin = StorageService.isAdminUser(currentUser);
  const allModerators = StorageService.getModerators();
  
  const [selectedModeratorId, setSelectedModeratorId] = useState<string>(() => {
    if (targetModeratorId) return targetModeratorId;
    if (currentUser.isModerator) return currentUser.id;
    return allModerators[0]?.id || currentUser.id;
  });

  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [inputShopEmail, setInputShopEmail] = useState<string>('');
  const [showAddShopModal, setShowAddShopModal] = useState<boolean>(false);
  const [portalFeedback, setPortalFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [activeTab, setActiveTab] = useState<'combined' | 'individual'>('combined');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedUserDetail, setSelectedUserDetail] = useState<{
    user: User;
    customers: Customer[];
    transactions: Transaction[];
  } | null>(null);

  // Drilldown modal sub-tab
  const [drilldownTab, setDrilldownTab] = useState<'customers' | 'transactions'>('customers');
  const [drilldownSearch, setDrilldownSearch] = useState<string>('');

  // Editing state for DSR credit limit
  const [editingDsrLimitId, setEditingDsrLimitId] = useState<string | null>(null);
  const [editingDsrLimitValue, setEditingDsrLimitValue] = useState<string>('');

  // Editing state for Customer credit limit (within drilldown modal)
  const [editingCustLimitId, setEditingCustLimitId] = useState<string | null>(null);
  const [editingCustLimitValue, setEditingCustLimitValue] = useState<string>('');

  // Re-fetch summary when refreshKey or selectedModeratorId changes
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _tick = refreshKey;
  const summary = StorageService.getModeratorSummary(selectedModeratorId);
  const currentModerator = allModerators.find(m => m.id === selectedModeratorId) || currentUser;

  const userRecords = summary?.userRecords || [];

  const handleAddShopByEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputShopEmail.trim()) return;
    const res = StorageService.addShopToModeratorByEmail(selectedModeratorId, inputShopEmail.trim());
    if (res.success) {
      setPortalFeedback({ type: 'success', text: res.message });
      setInputShopEmail('');
      setShowAddShopModal(false);
      setRefreshKey(k => k + 1);
    } else {
      setPortalFeedback({ type: 'error', text: res.message });
    }
  };

  const handleRemoveShopFromModerator = (shopUserId: string, shopName: string) => {
    if (window.confirm(`আপনি কি "${shopName}" ডিএসআর-কে এই মডারেটরের তালিকা থেকে সরিয়ে দিতে চান?`)) {
      StorageService.removeShopFromModerator(shopUserId);
      setPortalFeedback({ type: 'success', text: `"${shopName}" ডিএসআর-কে সফলভাবে তালিকা থেকে আলাদা করা হয়েছে।` });
      setRefreshKey(k => k + 1);
      if (selectedUserDetail?.user.id === shopUserId) {
        setSelectedUserDetail(null);
      }
    }
  };

  const handleSaveDsrCreditLimit = (dsrUserId: string, dsrShopName: string) => {
    const limitNum = Math.max(0, Number(editingDsrLimitValue) || 0);
    const ok = StorageService.updateDsrCreditLimit(dsrUserId, limitNum);
    if (ok) {
      setPortalFeedback({
        type: 'success',
        text: `"${dsrShopName}"-এর বাকির সর্বোচ্চ সীমা ৳${limitNum.toLocaleString('bn-BD')} সফলভাবে নির্ধারণ করা হয়েছে।`
      });
      setEditingDsrLimitId(null);
      setRefreshKey(k => k + 1);
      if (selectedUserDetail?.user.id === dsrUserId) {
        setSelectedUserDetail(prev => prev ? {
          ...prev,
          user: { ...prev.user, dsrCreditLimit: limitNum }
        } : null);
      }
    }
  };

  const handleSaveCustomerCreditLimit = (customerId: string, customerName: string) => {
    const limitNum = Math.max(0, Number(editingCustLimitValue) || 0);
    const ok = StorageService.updateCustomerCreditLimit(customerId, limitNum);
    if (ok) {
      setPortalFeedback({
        type: 'success',
        text: `কাস্টমার "${customerName}"-এর বাকির লিমিট ৳${limitNum.toLocaleString('bn-BD')} সফলভাবে আপডেট হয়েছে।`
      });
      setEditingCustLimitId(null);
      setRefreshKey(k => k + 1);
      if (selectedUserDetail) {
        setSelectedUserDetail(prev => prev ? {
          ...prev,
          customers: prev.customers.map(c => c.id === customerId ? { ...c, creditLimit: limitNum } : c)
        } : null);
      }
    }
  };

  const filteredUserRecords = userRecords.filter(r => 
    r.user.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.user.phone && r.user.phone.includes(searchTerm))
  );

  // Collect all transactions combined for the live feed, sorted by date desc
  const allCombinedTransactions: { tx: Transaction; shopName: string; ownerName: string }[] = [];
  userRecords.forEach(r => {
    r.transactions.forEach(tx => {
      allCombinedTransactions.push({
        tx,
        shopName: r.user.shopName,
        ownerName: r.user.name,
      });
    });
  });
  allCombinedTransactions.sort((a, b) => new Date(b.tx.date).getTime() - new Date(a.tx.date).getTime());

  // Export Combined CSV
  const handleExportCombinedCsv = () => {
    if (!summary) return;
    const rows = [
      ['ডিএসআর-এর নাম / খাতা', 'ডিএসআর নাম', 'ইমেইল', 'মোবাইল', 'কাস্টমার সংখ্যা', 'মোট বাকি পাওনা (৳)', 'মোট দেনা (৳)', 'নেট ব্যালেন্স (৳)', 'লেনদেন সংখ্যা'],
      ...userRecords.map(r => [
        `"${r.user.shopName}"`,
        `"${r.user.name}"`,
        r.user.email,
        r.user.phone || '',
        r.customerCount,
        r.totalReceivable,
        r.totalPayable,
        r.netBalance,
        r.transactionCount
      ])
    ];
    const csvContent = '\uFEFF' + rows.map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `moderator_report_${currentModerator.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Moderator Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-lg border border-teal-800/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6 text-teal-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  মডারেটর কন্ট্রোল পোর্টাল
                </h2>
                <span className="bg-teal-400/20 text-teal-300 border border-teal-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> মডারেটর রোল
                </span>
                {isAdmin && (
                  <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                    সুপার এডমিন ওভারভিউ
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-teal-200/90 mt-1">
                মডারেটর: <span className="font-bold text-white">{currentModerator.name}</span> • {currentModerator.shopName}
              </p>
              <p className="text-[11px] text-teal-300/70 mt-0.5">
                অধীনস্থ ডিএসআর (DSR)-দের মোট বাকি ও হিসাব পর্যবেক্ষণ হাব
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
            {isAdmin && allModerators.length > 1 && (
              <select
                value={selectedModeratorId}
                onChange={e => setSelectedModeratorId(e.target.value)}
                className="bg-slate-800 text-teal-200 border border-teal-700/60 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                {allModerators.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.shopName})
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => setShowAddShopModal(true)}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs transition cursor-pointer shadow-xs active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ ডিএসআর যুক্ত করুন</span>
            </button>

            <button
              onClick={handleExportCombinedCsv}
              className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs transition cursor-pointer shadow-xs active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>রিপোর্ট ডাউনলোড (CSV)</span>
            </button>

            <button
              onClick={handleExit}
              className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-800 text-teal-200 hover:text-white px-3.5 py-2 rounded-xl text-xs font-semibold border border-teal-700/50 transition cursor-pointer"
            >
              খাতায় ফিরুন
            </button>
          </div>

        </div>

        {/* View Toggle Tabs */}
        <div className="mt-6 pt-4 border-t border-teal-800/60 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex p-1 bg-slate-950/40 rounded-2xl border border-teal-800/50">
            <button
              onClick={() => setActiveTab('combined')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'combined'
                  ? 'bg-teal-500 text-slate-950 shadow-xs'
                  : 'text-teal-200 hover:text-white'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>একসাথে সকল তথ্য (সকল ডিএসআর-এর বাকি ও সারসংক্ষেপ)</span>
            </button>

            <button
              onClick={() => setActiveTab('individual')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'individual'
                  ? 'bg-teal-500 text-slate-950 shadow-xs'
                  : 'text-teal-200 hover:text-white'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>ডিএসআর ভিত্তিক আলাদা হিসাব ({userRecords.length} জন)</span>
            </button>
          </div>

          <div className="text-xs text-teal-300 font-medium">
            অধীনস্থ মোট ডিএসআর: <span className="font-bold text-white">{summary?.totalAssignedUsers || 0}</span> জন
          </div>
        </div>
      </div>

      {/* Portal Feedback Notification Banner */}
      {portalFeedback && (
        <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in duration-200 ${
          portalFeedback.type === 'success'
            ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
            : 'bg-red-50 border border-red-300 text-red-900'
        }`}>
          <div className="flex items-center gap-2">
            {portalFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <BadgeAlert className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{portalFeedback.text}</span>
          </div>
          <button
            onClick={() => setPortalFeedback(null)}
            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Add DSR by Email Card (requested by user) */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-teal-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
              মডারেটরের অধীনে ডিএসআর (DSR) যুক্ত করুন
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              ডিএসআর-এর ইমেইল আইডি লিখে সাবমিট করলেই তার খাতা সরাসরি আপনার এই মডারেটর তালিকায় অন্তর্ভুক্ত হবে।
            </p>
          </div>
        </div>

        <form onSubmit={handleAddShopByEmail} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <div className="relative min-w-[260px] flex-1">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              placeholder="ডিএসআর-এর ইমেইল আইডি বসান (যেমন: nitbd2021@gmail.com)..."
              value={inputShopEmail}
              onChange={e => setInputShopEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs transition active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ ডিএসআর যুক্ত করুন</span>
          </button>
        </form>
      </div>

      {/* Aggregate Financial Metrics Header Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Receivables (মোট বাকি/পাওনা) - HIGHLIGHT */}
        <div className="bg-white p-4.5 rounded-3xl border-2 border-red-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-red-50 rounded-bl-full pointer-events-none -z-0"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">অধীনস্থ মোট বাকি (পাওনা)</span>
              <TrendingUp className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-red-600 mt-2">
              ৳{(summary?.totalReceivable || 0).toLocaleString('bn-BD')}
            </div>
            <span className="inline-block mt-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
              সকল ডিএসআর-এর মোট বকেয়া
            </span>
          </div>
        </div>

        {/* Total Payables (মোট দেনা) */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">অধীনস্থ মোট দেনা</span>
            <TrendingDown className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-2">
            ৳{(summary?.totalPayable || 0).toLocaleString('bn-BD')}
          </div>
          <span className="inline-block mt-1 text-[11px] font-medium text-slate-500">
            ডিএসআর-দের মোট দেয় দেনা
          </span>
        </div>

        {/* Total Customers */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">মোট কাস্টমার খাতা</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-800 mt-2">
            {(summary?.totalCustomers || 0).toLocaleString('bn-BD')} জন
          </div>
          <span className="inline-block mt-1 text-[11px] font-medium text-emerald-700">
            {userRecords.length} জন ডিএসআর-এর সম্মিলিত খদ্দের
          </span>
        </div>

        {/* Total Transactions & Today's Activity */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">মোট লেনদেন এন্ট্রি</span>
            <Receipt className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-700 mt-2">
            {(summary?.totalTransactions || 0).toLocaleString('bn-BD')} টি
          </div>
          <span className="inline-block mt-1 text-[11px] font-medium text-slate-500">
            আজকের আদায়: ৳{(summary?.todayReceived || 0).toLocaleString('bn-BD')}
          </span>
        </div>

      </div>

      {/* TAB 1: COMBINED VIEW (সারসংক্ষেপ ও একসাথে মোট বাকি) */}
      {activeTab === 'combined' && (
        <div className="space-y-6">
          
          {/* User Dues Comparative Ranking Bar */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Wallet className="w-4.5 h-4.5 text-teal-600" />
                  ডিএসআর ভিত্তিক মোট বাকি অনুপাত (Comparative Dues)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  কোন ডিএসআর-এর কাছে মোট কত টাকা বাজার বাকি রয়েছে তার পরিসংখ্যান
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                মোট ডিএসআর: {userRecords.length} জন
              </span>
            </div>

            {userRecords.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                এই মডারেটরের অধীনে এখনো কোনো ডিএসআর অন্তর্ভুক্ত করা হয়নি। ইমেইল দিয়ে ডিএসআর যুক্ত করুন অথবা এডমিন প্যানেল থেকে এসাইন করুন।
              </div>
            ) : (
              <div className="space-y-3.5">
                {[...userRecords]
                  .sort((a, b) => b.totalReceivable - a.totalReceivable)
                  .map(rec => {
                    const totalDues = summary?.totalReceivable || 1;
                    const percent = totalDues > 0 ? Math.round((rec.totalReceivable / totalDues) * 100) : 0;

                    return (
                      <div key={rec.user.id} className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 transition">
                        <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-900 text-sm">{rec.user.shopName}</span>
                            <span className="text-[11px] font-medium text-slate-500">({rec.user.name})</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-red-600 font-black text-sm">
                              ৳{rec.totalReceivable.toLocaleString('bn-BD')}
                            </span>
                            <span className="text-slate-400 text-[11px] font-mono">
                              {percent}%
                            </span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-red-500 to-amber-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(percent, 2)}%` }}
                          ></div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                          <span>কাস্টমার: {rec.customerCount} জন • দেনা: ৳{rec.totalPayable.toLocaleString('bn-BD')}</span>
                          <button
                            onClick={() => setSelectedUserDetail({
                              user: rec.user,
                              customers: rec.customers,
                              transactions: rec.transactions,
                            })}
                            className="text-teal-700 hover:text-teal-900 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                          >
                            বিস্তারিত হিসাব <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Combined Live Transactions Feed */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  অধীনস্থ সকল ডিএসআর-এর সর্বশেষ লেনদেন স্ট্রিম
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                সাম্প্রতিক ২০টি এন্ট্রি
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
              {allCombinedTransactions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs sm:text-sm">
                  কোনো লেনদেন এখনো পাওয়া যায়নি।
                </div>
              ) : (
                allCombinedTransactions.slice(0, 20).map(({ tx, shopName, ownerName }) => {
                  const isCredit = tx.type === 'credit_given' || tx.type === 'loan_given';
                  const isReceived = tx.type === 'payment_received' || tx.type === 'sale';

                  return (
                    <div key={tx.id} className="p-3.5 sm:p-4 hover:bg-slate-50 transition flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs ${
                          isReceived ? 'bg-emerald-100 text-emerald-700' : isCredit ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {isReceived ? 'জমা' : isCredit ? 'বাকি' : 'দেনা'}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">{tx.customerName}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                              ডিএসআর: {shopName}
                            </span>
                            <span className="text-[10px] bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.5 rounded font-medium">
                              {formatBanglaTxType(tx.type)}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {tx.description || 'লেনদেন'} • {new Date(tx.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-xs sm:text-sm font-black block ${
                          isReceived ? 'text-emerald-600' : isCredit ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          {isReceived ? '+' : '-'} ৳{tx.amount.toLocaleString('bn-BD')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ব্যালেন্স: ৳{tx.balanceAfter.toLocaleString('bn-BD')}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: INDIVIDUAL USERS VIEW (ডিএসআর হিসেবে আলাদা আলাদা ভাবে) */}
      {activeTab === 'individual' && (
        <div className="space-y-4">
          
          {/* Search bar & Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="ডিএসআর-এর নাম, এলাকা বা ফোন দিয়ে খুঁজুন..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="text-xs text-slate-500 font-medium self-end sm:self-auto">
              প্রদর্শিত হচ্ছে: <span className="font-bold text-slate-800">{filteredUserRecords.length}</span> / {userRecords.length} জন ডিএসআর
            </div>
          </div>

          {/* Individual DSR Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUserRecords.map(rec => (
              <div 
                key={rec.user.id}
                className="bg-white rounded-3xl border border-slate-200 hover:border-teal-300 shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden"
              >
                {/* DSR Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full inline-block mb-1.5">
                        {rec.user.shopCategory || 'ডিএসআর ফিল্ড খাতা'}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 leading-snug">
                        {rec.user.shopName}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1 font-medium">
                        ডিএসআর: <span className="text-slate-800 font-bold">{rec.user.name}</span>
                      </p>
                    </div>

                    <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-500 space-y-1">
                    <p className="flex items-center gap-1 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{rec.user.email}</span>
                    </p>
                    {rec.user.phone && (
                      <p className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{rec.user.phone}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* DSR Balance Metrics */}
                <div className="p-4 bg-slate-50/60 grid grid-cols-2 gap-2 text-center border-b border-slate-100">
                  <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-400 block">মোট পাওনা বাকি</span>
                    <span className="text-sm sm:text-base font-black text-red-600 block mt-0.5">
                      ৳{rec.totalReceivable.toLocaleString('bn-BD')}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-400 block">মোট দেনা</span>
                    <span className="text-sm sm:text-base font-black text-blue-600 block mt-0.5">
                      ৳{rec.totalPayable.toLocaleString('bn-BD')}
                    </span>
                  </div>
                </div>

                {/* DSR Credit Limit Management (Configured by Moderator) */}
                <div className="p-3.5 bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CreditCard className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span className="text-[11px] font-bold text-slate-700 truncate">ডিএসআর বাকির লিমিট:</span>
                    </div>

                    {editingDsrLimitId === rec.user.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-500">৳</span>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={editingDsrLimitValue}
                          onChange={e => setEditingDsrLimitValue(e.target.value)}
                          placeholder="লিমিট..."
                          className="w-24 px-2 py-0.5 text-xs font-bold bg-white border border-teal-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveDsrCreditLimit(rec.user.id, rec.user.shopName)}
                          className="p-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition cursor-pointer"
                          title="সংরক্ষণ করুন"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingDsrLimitId(null)}
                          className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition cursor-pointer"
                          title="বাতিল"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                          rec.user.dsrCreditLimit && rec.user.dsrCreditLimit > 0
                            ? rec.totalReceivable > rec.user.dsrCreditLimit
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : 'bg-teal-100 text-teal-900 border border-teal-200'
                            : 'bg-slate-200/80 text-slate-600'
                        }`}>
                          {rec.user.dsrCreditLimit && rec.user.dsrCreditLimit > 0
                            ? `৳${rec.user.dsrCreditLimit.toLocaleString('bn-BD')}`
                            : 'নির্ধারিত নেই'}
                        </span>
                        <button
                          onClick={() => {
                            setEditingDsrLimitId(rec.user.id);
                            setEditingDsrLimitValue(String(rec.user.dsrCreditLimit || ''));
                          }}
                          className="p-1 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition cursor-pointer"
                          title="ডিএসআর বাকির লিমিট পরিবর্তন করুন"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Limit exceeded warning if applicable */}
                  {Boolean(rec.user.dsrCreditLimit && rec.user.dsrCreditLimit > 0 && rec.totalReceivable > rec.user.dsrCreditLimit) && (
                    <div className="mt-2 p-2 rounded-xl bg-red-100/80 border border-red-300 text-red-900 flex items-center justify-between text-[11px] font-bold">
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-pulse shrink-0" />
                        <span>সীমা অতিক্রান্ত!</span>
                      </div>
                      <span className="text-red-700 font-extrabold">
                        +৳{(rec.totalReceivable - (rec.user.dsrCreditLimit || 0)).toLocaleString('bn-BD')} অতিরিক্ত
                      </span>
                    </div>
                  )}
                </div>

                {/* Additional Stats & Action Buttons */}
                <div className="p-4 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500">
                    <span>খদ্দের: <b>{rec.customerCount}</b> জন</span> • <span>লেনদেন: <b>{rec.transactionCount}</b> টি</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {handleSwitch && (
                      <button
                        onClick={() => handleSwitch(rec.user.id)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition cursor-pointer"
                        title="এই ডিএসআর-এর খাতায় সরাসরি প্রবেশ করুন"
                      >
                        প্রবেশ
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedUserDetail({
                        user: rec.user,
                        customers: rec.customers,
                        transactions: rec.transactions,
                      })}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                    >
                      <span>বিস্তারিত খাতা</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleRemoveShopFromModerator(rec.user.id, rec.user.shopName)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                      title="এই ডিএসআর-কে আপনার মডারেটর তালিকা থেকে বাদ দিন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>

          {filteredUserRecords.length === 0 && (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-700">কোনো ডিএসআর পাওয়া যায়নি</h4>
              <p className="text-xs text-slate-500 mt-1">
                আপনার খোঁজের সাথে মেলে এমন কোনো ডিএসআর এই মডারেটরের অধীনে নেই।
              </p>
              <button
                onClick={() => setShowAddShopModal(true)}
                className="mt-4 inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ ডিএসআর যুক্ত করুন</span>
              </button>
            </div>
          )}

        </div>
      )}

      {/* USER DETAIL DRILL-DOWN MODAL */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {selectedUserDetail.user.shopName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    মালিক: {selectedUserDetail.user.name} • {selectedUserDetail.user.email} • {selectedUserDetail.user.phone || 'ফোন নেই'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedUserDetail.user.googleSheetUrl && (
                  <a
                    href={selectedUserDetail.user.googleSheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl hover:bg-emerald-100"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>গুগল শিট</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}

                <button
                  onClick={() => setSelectedUserDetail(null)}
                  className="w-8 h-8 rounded-xl bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Balance Summary Ribbon */}
            <div className="p-4 bg-teal-50/40 border-b border-teal-100 grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
              <div className="bg-white p-2.5 rounded-xl border border-teal-100">
                <span className="text-[10px] font-bold text-slate-500">মোট পাওনা বাকি</span>
                <span className="text-base font-black text-red-600 block mt-0.5">
                  ৳{selectedUserDetail.customers.reduce((s, c) => s + (c.totalReceivable || 0), 0).toLocaleString('bn-BD')}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-teal-100">
                <span className="text-[10px] font-bold text-slate-500">মোট দেনা</span>
                <span className="text-base font-black text-blue-600 block mt-0.5">
                  ৳{selectedUserDetail.customers.reduce((s, c) => s + (c.totalPayable || 0), 0).toLocaleString('bn-BD')}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-teal-100">
                <span className="text-[10px] font-bold text-slate-500">ডিএসআর বাকির লিমিট</span>
                <span className="text-base font-black text-teal-700 block mt-0.5">
                  {selectedUserDetail.user.dsrCreditLimit && selectedUserDetail.user.dsrCreditLimit > 0
                    ? `৳${selectedUserDetail.user.dsrCreditLimit.toLocaleString('bn-BD')}`
                    : 'নির্ধারিত নেই'}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-teal-100">
                <span className="text-[10px] font-bold text-slate-500">কাস্টমার সংখ্যা</span>
                <span className="text-base font-black text-slate-800 block mt-0.5">
                  {selectedUserDetail.customers.length} জন
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-teal-100">
                <span className="text-[10px] font-bold text-slate-500">মোট লেনদেন</span>
                <span className="text-base font-black text-teal-700 block mt-0.5">
                  {selectedUserDetail.transactions.length} টি
                </span>
              </div>
            </div>

            {/* Sub-tab switcher */}
            <div className="px-5 pt-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex gap-4">
                <button
                  onClick={() => setDrilldownTab('customers')}
                  className={`pb-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
                    drilldownTab === 'customers'
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  কাস্টমারদের বাকি খাতা ({selectedUserDetail.customers.length})
                </button>
                <button
                  onClick={() => setDrilldownTab('transactions')}
                  className={`pb-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
                    drilldownTab === 'transactions'
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  লেনদেনের ইতিহাস ({selectedUserDetail.transactions.length})
                </button>
              </div>

              <div className="relative mb-2">
                <input
                  type="text"
                  placeholder="খুঁজুন..."
                  value={drilldownSearch}
                  onChange={e => setDrilldownSearch(e.target.value)}
                  className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-teal-500 w-32 sm:w-44"
                />
              </div>
            </div>

            {/* Modal Body: Customers Table or Transactions Table */}
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto">
              
              {drilldownTab === 'customers' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">কাস্টমারের নাম</th>
                        <th className="p-2.5">মোবাইল</th>
                        <th className="p-2.5 text-right">পাওনা বাকি (৳)</th>
                        <th className="p-2.5 text-right">দেনা (৳)</th>
                        <th className="p-2.5 text-right">নেট ব্যালেন্স (৳)</th>
                        <th className="p-2.5 text-center">বাকির লিমিট (৳)</th>
                        <th className="p-2.5">সর্বশেষ লেনদেন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedUserDetail.customers
                        .filter(c => c.name.toLowerCase().includes(drilldownSearch.toLowerCase()) || c.phone.includes(drilldownSearch))
                        .map(c => {
                          const hasLimit = typeof c.creditLimit === 'number' && c.creditLimit > 0;
                          const isCustExceeded = hasLimit && c.netBalance > (c.creditLimit || 0);

                          return (
                            <tr key={c.id} className={`hover:bg-slate-50 transition ${isCustExceeded ? 'bg-red-50/40' : ''}`}>
                              <td className="p-2.5 font-bold text-slate-900">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{c.name}</span>
                                  {isCustExceeded && (
                                    <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-extrabold text-[10px]">
                                      সীমা ছাড়িয়েছে
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2.5 text-slate-500">{c.phone || '-'}</td>
                              <td className="p-2.5 text-right font-black text-red-600">
                                ৳{c.totalReceivable.toLocaleString('bn-BD')}
                              </td>
                              <td className="p-2.5 text-right font-black text-blue-600">
                                ৳{c.totalPayable.toLocaleString('bn-BD')}
                              </td>
                              <td className={`p-2.5 text-right font-black ${c.netBalance > 0 ? 'text-red-600' : c.netBalance < 0 ? 'text-blue-600' : 'text-slate-500'}`}>
                                ৳{c.netBalance.toLocaleString('bn-BD')}
                              </td>

                              {/* Customer Credit Limit Editable by Moderator */}
                              <td className="p-2.5 text-center">
                                {editingCustLimitId === c.id ? (
                                  <div className="inline-flex items-center gap-1">
                                    <span className="text-[11px] font-bold text-slate-400">৳</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="500"
                                      value={editingCustLimitValue}
                                      onChange={e => setEditingCustLimitValue(e.target.value)}
                                      className="w-20 px-1.5 py-0.5 text-xs font-bold bg-white border border-teal-500 rounded focus:outline-none"
                                      placeholder="লিমিট..."
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleSaveCustomerCreditLimit(c.id, c.name)}
                                      className="p-1 bg-teal-600 hover:bg-teal-700 text-white rounded transition cursor-pointer"
                                      title="সেভ করুন"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => setEditingCustLimitId(null)}
                                      className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded transition cursor-pointer"
                                      title="বাতিল"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1">
                                    <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                      hasLimit
                                        ? isCustExceeded
                                          ? 'bg-red-100 text-red-800 border border-red-300'
                                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                        : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {hasLimit ? `৳${(c.creditLimit || 0).toLocaleString('bn-BD')}` : 'সীমা নেই'}
                                    </span>
                                    <button
                                      onClick={() => {
                                        setEditingCustLimitId(c.id);
                                        setEditingCustLimitValue(String(c.creditLimit || ''));
                                      }}
                                      className="p-1 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded transition cursor-pointer"
                                      title="এই কাস্টমারের বাকির লিমিট ঠিক করুন"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </td>

                              <td className="p-2.5 text-slate-400 text-[11px]">
                                {c.lastTransactionAt ? new Date(c.lastTransactionAt).toLocaleDateString('bn-BD') : '-'}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                  {selectedUserDetail.customers.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      কোনো কাস্টমার এখনো যোগ করা হয়নি।
                    </div>
                  )}
                </div>
              )}

              {drilldownTab === 'transactions' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">তারিখ</th>
                        <th className="p-2.5">কাস্টমার</th>
                        <th className="p-2.5">লেনদেনের ধরন</th>
                        <th className="p-2.5">বিবরণ</th>
                        <th className="p-2.5 text-right">টাকা (৳)</th>
                        <th className="p-2.5 text-right">ব্যালেন্স</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedUserDetail.transactions
                        .filter(t => t.customerName.toLowerCase().includes(drilldownSearch.toLowerCase()) || (t.description && t.description.toLowerCase().includes(drilldownSearch.toLowerCase())))
                        .map(t => (
                          <tr key={t.id} className="hover:bg-slate-50">
                            <td className="p-2.5 text-slate-500 text-[11px] whitespace-nowrap">
                              {new Date(t.date).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })}
                            </td>
                            <td className="p-2.5 font-bold text-slate-900">{t.customerName}</td>
                            <td className="p-2.5">
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                {formatBanglaTxType(t.type)}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-600 text-[11px]">{t.description || '-'}</td>
                            <td className="p-2.5 text-right font-black text-slate-900">
                              ৳{t.amount.toLocaleString('bn-BD')}
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-500 text-[11px]">
                              ৳{t.balanceAfter.toLocaleString('bn-BD')}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {selectedUserDetail.transactions.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      কোনো লেনদেন এখনো পাওয়া যায়নি।
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                মডারেটর হিসেবে আপনি এই তথ্য শুধুমাত্র পর্যবেক্ষণ করছেন।
              </span>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => handleRemoveShopFromModerator(selectedUserDetail.user.id, selectedUserDetail.user.shopName)}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>তালিকা থেকে সরান</span>
                </button>

                {handleSwitch && (
                  <button
                    onClick={() => handleSwitch(selectedUserDetail.user.id)}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    এই ডিএসআর-এর খাতায় প্রবেশ করুন
                  </button>
                )}
                <button
                  onClick={() => setSelectedUserDetail(null)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ADD DSR TO MODERATOR MODAL */}
      {showAddShopModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    ডিএসআর (DSR) যুক্ত করুন
                  </h3>
                  <p className="text-xs text-slate-500">
                    মডারেটর: {currentModerator.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddShopModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddShopByEmail} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ডিএসআর-এর ইমেইল আইডি <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="যেমন: dsr@gmail.com"
                    value={inputShopEmail}
                    onChange={e => setInputShopEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  💡 <b>নিয়মাবলী:</b>
                  <br />
                  • ডিএসআর-এর অ্যাকাউন্ট ইতিমধ্যে তৈরি থাকলে, সাথে সাথে তার খাতা এই মডারেটরের অধীনে যুক্ত হবে।
                  <br />
                  • নতুন ইমেইল হলে স্বয়ংক্রিয়ভাবে ডিএসআর হিসেবে তার জন্য অ্যাকাউন্ট প্রস্তুত হয়ে মডারেটরের সাথে লিংক হয়ে যাবে।
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddShopModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ ডিএসআর যুক্ত করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
