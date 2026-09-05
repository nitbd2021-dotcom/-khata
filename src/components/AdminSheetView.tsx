import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  FileSpreadsheet, 
  Eye, 
  EyeOff, 
  Download, 
  Search, 
  Lock, 
  Unlock, 
  ExternalLink, 
  UserCheck, 
  ArrowRight,
  Database,
  RefreshCw,
  LogIn,
  KeyRound,
  Mail,
  UserPlus,
  ShieldCheck,
  Building2,
  X,
  Check
} from 'lucide-react';
import { AdminUserRecord, User } from '../types';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { StorageService, ADMIN_EMAIL, ADMIN_PASSWORD } from '../services/storageService';

interface AdminSheetViewProps {
  currentUser?: User | null;
  onSwitchUser: (userId: string) => void;
  onExitAdmin: () => void;
  onOpenLoginModal?: () => void;
  onOpenModeratorPortal?: (moderatorId?: string) => void;
}

export const AdminSheetView: React.FC<AdminSheetViewProps> = ({
  currentUser,
  onSwitchUser,
  onExitAdmin,
  onOpenLoginModal,
  onOpenModeratorPortal,
}) => {
  const isSuperAdmin = StorageService.isAdminUser(currentUser);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(isSuperAdmin);
  const [adminPinInput, setAdminPinInput] = useState<string>('');
  const [showPasswordInput, setShowPasswordInput] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string>('');
  const [showPins, setShowPins] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Dynamic Records & Moderators state
  const [records, setRecords] = useState<AdminUserRecord[]>(() => StorageService.getAdminSheetRecords());
  const [moderators, setModerators] = useState<User[]>(() => StorageService.getModerators());

  // Create Moderator Modal state
  const [showCreateModeratorModal, setShowCreateModeratorModal] = useState<boolean>(false);
  const [newModName, setNewModName] = useState<string>('');
  const [newModEmail, setNewModEmail] = useState<string>('');
  const [newModPin, setNewModPin] = useState<string>('1234');
  const [newModPhone, setNewModPhone] = useState<string>('');
  const [newModShopName, setNewModShopName] = useState<string>('');

  // Quick Add Moderator by Email
  const [quickModEmail, setQuickModEmail] = useState<string>('');
  const [adminFeedback, setAdminFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const refreshRecords = () => {
    setRecords(StorageService.getAdminSheetRecords());
    setModerators(StorageService.getModerators());
  };

  useEffect(() => {
    if (isSuperAdmin) {
      setIsAdminAuthenticated(true);
    }
  }, [isSuperAdmin]);

  const handleAssignModerator = (userId: string, moderatorId: string) => {
    StorageService.assignUserToModerator(userId, moderatorId === 'none' ? null : moderatorId);
    refreshRecords();
  };

  const handleToggleModeratorRole = (userId: string, currentIsMod: boolean) => {
    StorageService.setModeratorRole(userId, !currentIsMod);
    refreshRecords();
  };

  const handleQuickAddModeratorByEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickModEmail.trim()) return;
    const res = StorageService.addModeratorByEmail(quickModEmail.trim());
    if (res.success) {
      setAdminFeedback({ type: 'success', text: res.message });
      setQuickModEmail('');
      refreshRecords();
    } else {
      setAdminFeedback({ type: 'error', text: res.message });
    }
  };

  const handleCreateModeratorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModEmail.trim()) return;
    const res = StorageService.addModeratorByEmail(newModEmail.trim(), newModName, newModPin);
    if (res.success) {
      setAdminFeedback({ type: 'success', text: res.message });
      setShowCreateModeratorModal(false);
      setNewModName('');
      setNewModEmail('');
      setNewModPin('1234');
      setNewModPhone('');
      setNewModShopName('');
      refreshRecords();
    } else {
      alert(res.message);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (StorageService.checkAdminPin(adminPinInput)) {
      setIsAdminAuthenticated(true);
      setPinError('');
    } else {
      setPinError('ভুল এডমিন পাসওয়ার্ড! এডমিন পাসওয়ার্ড (raju12158A+) দিন অথবা Jahidulraju87@gmail.com দিয়ে লগইন করুন।');
    }
  };

  const handleExportCsv = () => {
    GoogleSheetsService.downloadAdminCsv(records);
  };

  const filteredRecords = records.filter(
    r =>
      r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.shopCategory.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalShops = records.length;
  const totalReceivables = records.reduce((s, r) => s + r.totalReceivable, 0);
  const totalPayables = records.reduce((s, r) => s + r.totalPayable, 0);
  const totalTxs = records.reduce((s, r) => s + r.transactionCount, 0);

  if (!isAdminAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-3xl border border-slate-200 shadow-xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">কেন্দ্রীয় এডমিন এক্সেস ভেরিফিকেশন</h2>
        
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 my-4 text-left">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 mb-1">
            <Mail className="w-3.5 h-3.5 text-amber-700" />
            <span>নির্ধারিত এডমিন একাউন্ট:</span>
          </div>
          <p className="text-xs font-bold text-slate-800 font-mono">Jahidulraju87@gmail.com</p>
          <p className="text-[11px] text-slate-500 mt-1">
            এই কেন্দ্রীয় এডমিন শিট শুধুমাত্র নির্দিষ্ট এডমিন ইমেইল ও পাসওয়ার্ড দ্বারা সুরক্ষিত।
          </p>
        </div>

        <form onSubmit={handlePinSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <input
                type={showPasswordInput ? 'text' : 'password'}
                placeholder="এডমিন পাসওয়ার্ড দিন"
                value={adminPinInput}
                onChange={e => setAdminPinInput(e.target.value)}
                className="w-full text-center text-base sm:text-lg font-semibold py-3 bg-slate-50 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:outline-none pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPasswordInput(!showPasswordInput)}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPasswordInput ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
              >
                {showPasswordInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {pinError && (
            <p className="text-xs text-red-600 font-semibold">{pinError}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onExitAdmin}
              className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              ফিরে যান
            </button>
            <button
              type="submit"
              className="w-1/2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm cursor-pointer"
            >
              পাসওয়ার্ড দিয়ে আনলক
            </button>
          </div>
        </form>

        {onOpenLoginModal && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                onExitAdmin();
                onOpenLoginModal();
              }}
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-emerald-600" />
              <span>এডমিন একাউন্টে সরাসরি লগইন করুন</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-12">
      
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold">
                <Shield className="w-3.5 h-3.5" />
                <span>কেন্দ্রীয় এডমিন গুগল শিট কন্ট্রোল প্যানেল</span>
              </div>
              <div className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[11px] font-medium">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>অনুমোদিত এডমিন: Jahidulraju87@gmail.com</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              সকল ব্যবহারকারীর ইমেইল, পিন ও পূর্ণ হিসাব বিবরণী
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              প্রত্যেক ব্যবহারকারীর ড্রাইভ শিট ও পিন নম্বরের রিয়েল-টাইম মাস্টার ডাটাবেজ
            </p>
          </div>

          {/* Top Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {onOpenModeratorPortal && (
              <button
                onClick={() => onOpenModeratorPortal()}
                className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-xs transition active:scale-95 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>মডারেটর পোর্টাল</span>
              </button>
            )}
            <button
              onClick={() => setShowCreateModeratorModal(true)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-xs transition active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ নতুন মডারেটর</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>শিট ডাউনলোড (CSV)</span>
            </button>
            <button
              onClick={onExitAdmin}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              দোকান খাতায় ফিরুন
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-400 block">মোট দোকান একাউন্ট</span>
          <span className="text-xl sm:text-2xl font-black text-slate-800 mt-1 block">
            {totalShops} টি
          </span>
          <span className="text-[11px] text-emerald-600 font-medium">নিবন্ধিত ব্যবসায়ী</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-400 block">মোট বাজার বকেয়া পাওনা</span>
          <span className="text-xl sm:text-2xl font-black text-red-600 mt-1 block">
            ৳{totalReceivables.toLocaleString('bn-BD')}
          </span>
          <span className="text-[11px] text-slate-400">সকল দোকানের সামগ্রিক পাওনা</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-400 block">মোট সামগ্রিক দেনা</span>
          <span className="text-xl sm:text-2xl font-black text-blue-600 mt-1 block">
            ৳{totalPayables.toLocaleString('bn-BD')}
          </span>
          <span className="text-[11px] text-slate-400">সকল দোকানের সামগ্রিক দেনা</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-400 block">মডারেটর নেটওয়ার্ক</span>
          <span className="text-xl sm:text-2xl font-black text-teal-600 mt-1 block">
            {moderators.length} জন
          </span>
          <span className="text-[11px] text-teal-700 font-medium">সক্রিয় জোন মডারেটর</span>
        </div>
      </div>

      {/* Admin Feedback Notification Banner */}
      {adminFeedback && (
        <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in duration-200 ${
          adminFeedback.type === 'success'
            ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
            : 'bg-red-50 border border-red-300 text-red-900'
        }`}>
          <div className="flex items-center gap-2">
            {adminFeedback.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <Shield className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{adminFeedback.text}</span>
          </div>
          <button
            onClick={() => setAdminFeedback(null)}
            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Moderator Network Overview Bar */}
      <div className="bg-teal-900/10 border border-teal-300/40 p-4 sm:p-5 rounded-3xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                মডারেটর নিয়ন্ত্রণ ও ডিএসআর (DSR) অ্যাসাইনমেন্ট
              </h4>
              <p className="text-[11px] text-slate-600 mt-0.5">
                এডমিন যেকোনো মডারেটরের ইমেইল আইডি বসিয়ে সরাসরি মডারেটর এড করতে পারবেন এবং ডিএসআর অ্যাসাইন করতে পারবেন।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {onOpenModeratorPortal && (
              <button
                onClick={() => onOpenModeratorPortal()}
                className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <span>মডারেটর ভিউ দেখুন</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setShowCreateModeratorModal(true)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ বিস্তারিত ফর্ম</span>
            </button>
          </div>
        </div>

        {/* Quick Add Moderator by Email ID (requested by user) */}
        <form 
          onSubmit={handleQuickAddModeratorByEmail}
          className="pt-3 border-t border-teal-200/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
        >
          <div className="flex-1 relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              placeholder="মডারেটরের ইমেইল আইডি বসান (যেমন: jahid@gmail.com)..."
              value={quickModEmail}
              onChange={e => setQuickModEmail(e.target.value)}
              className="w-full bg-white border border-teal-300 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
            />
          </div>
          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-xs transition active:scale-95 cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ মডারেটর এড করুন</span>
          </button>
        </form>
      </div>

      {/* Filter and Table Tools */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          
          <div className="flex items-center gap-3">
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="ইমেইল বা দোকানের নাম দিয়ে খুঁজুন..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              onClick={() => setShowPins(!showPins)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              {showPins ? <EyeOff className="w-3.5 h-3.5 text-slate-500" /> : <Eye className="w-3.5 h-3.5 text-amber-600" />}
              <span>{showPins ? 'পিন লুকিয়ে রাখুন' : 'পিন প্রদর্শন করুন'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              এডমিন শিট স্ট্যাটাস:
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              অটো ড্রাইভে সিঙ্কড
            </span>
          </div>

        </div>

        {/* Master Admin Spreadsheet Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3 text-center w-12">#</th>
                <th className="p-3">ব্যবহারকারীর ইমেইল (User Email)</th>
                <th className="p-3">পিন (PIN)</th>
                <th className="p-3">ডিএসআর / দোকানের নাম ও ক্যাটাগরি</th>
                <th className="p-3">মডারেটর ও ভূমিকা (Moderator)</th>
                <th className="p-3 text-center">কাস্টমার</th>
                <th className="p-3 text-center">লেনদেন</th>
                <th className="p-3 text-right">মোট পাওনা (৳)</th>
                <th className="p-3 text-right">মোট দেনা (৳)</th>
                <th className="p-3">গুগল শিট</th>
                <th className="p-3 text-center">একশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans">
              {filteredRecords.map((rec, idx) => (
                <tr key={rec.userId} className="hover:bg-amber-50/40 transition">
                  <td className="p-3 text-center font-bold text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-slate-900 block">{rec.email}</span>
                    <span className="text-[10px] text-slate-400">আইডি: {rec.userId}</span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {showPins ? (
                      <span className="font-mono font-black text-amber-700 bg-amber-100/70 px-2.5 py-1 rounded-lg border border-amber-300">
                        {rec.pin}
                      </span>
                    ) : (
                      <span className="font-mono text-slate-400 tracking-widest">
                        ••••
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-slate-800 block">{rec.shopName}</span>
                    <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md inline-block mt-0.5">
                      {rec.shopCategory}
                    </span>
                  </td>

                  {/* Moderator Assignment & Role Column */}
                  <td className="p-3">
                    {rec.isAdmin ? (
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                        👑 কেন্দ্রীয় এডমিন
                      </span>
                    ) : rec.isModerator ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 bg-teal-100 text-teal-900 border border-teal-300 px-2 py-0.5 rounded-md text-[10px] font-bold">
                            <ShieldCheck className="w-3 h-3 text-teal-700" /> মডারেটর
                          </span>
                          <span className="text-[10px] text-teal-700 font-bold">
                            ({rec.assignedUsersCount || 0} ডিএসআর)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 pt-0.5">
                          {onOpenModeratorPortal && (
                            <button
                              onClick={() => onOpenModeratorPortal(rec.userId)}
                              className="text-[10px] font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                            >
                              পোর্টাল দেখুন
                            </button>
                          )}
                          <span className="text-slate-300">•</span>
                          <button
                            onClick={() => handleToggleModeratorRole(rec.userId, true)}
                            className="text-[10px] font-medium text-slate-500 hover:text-red-600 underline cursor-pointer"
                            title="মডারেটর থেকে সাধারণ ব্যবহাকারীতে পরিবর্তন করুন"
                          >
                            ইউজার করুন
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <select
                          value={rec.moderatorId || 'none'}
                          onChange={(e) => handleAssignModerator(rec.userId, e.target.value)}
                          className="w-full max-w-[170px] bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                        >
                          <option value="none">-- কোনো মডারেটর নেই --</option>
                          {moderators.map(m => (
                            <option key={m.id} value={m.id}>
                              মডারেটর: {m.name}
                            </option>
                          ))}
                        </select>
                        <div>
                          <button
                            onClick={() => handleToggleModeratorRole(rec.userId, false)}
                            className="text-[10px] font-bold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer"
                          >
                            + মডারেটর বানান
                          </button>
                        </div>
                      </div>
                    )}
                  </td>

                  <td className="p-3 text-center font-bold text-slate-700">
                    {rec.customerCount} জন
                  </td>
                  <td className="p-3 text-center font-bold text-slate-700">
                    {rec.transactionCount} টি
                  </td>
                  <td className="p-3 text-right font-black text-red-600 whitespace-nowrap">
                    ৳{rec.totalReceivable.toLocaleString('bn-BD')}
                  </td>
                  <td className="p-3 text-right font-black text-blue-600 whitespace-nowrap">
                    ৳{rec.totalPayable.toLocaleString('bn-BD')}
                  </td>
                  <td className="p-3">
                    {rec.googleSheetUrl ? (
                      <a
                        href={rec.googleSheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 hover:underline font-semibold"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[100px]">শিট লিঙ্ক</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-400">লোকাল</span>
                    )}
                  </td>
                  <td className="p-3 text-center whitespace-nowrap">
                    <button
                      onClick={() => onSwitchUser(rec.userId)}
                      className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                      title="এই দোকানদারের খাতায় প্রবেশ করুন"
                    >
                      <span>লগইন</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>* এডমিন শিট স্বয়ংক্রিয়ভাবে ডাটাবেইজ হিসেবে আপডেট হয়।</span>
          <span className="font-semibold text-slate-700">মাস্টার পিন: 7860</span>
        </div>

      </div>

      {/* CREATE MODERATOR MODAL */}
      {showCreateModeratorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">নতুন মডারেটর তৈরি করুন</h3>
                  <p className="text-xs text-slate-500">মডারেটর তার অধীনস্থ সকল ডিএসআর-এর মোট বাকি দেখতে পারবে</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModeratorModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateModeratorSubmit} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">মডারেটরের নাম *</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: মো: আরিফুল ইসলাম"
                  value={newModName}
                  onChange={e => setNewModName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">মডারেটরের ইমেইল *</label>
                <input
                  type="email"
                  required
                  placeholder="যেমন: moderator@khata.com"
                  value={newModEmail}
                  onChange={e => setNewModEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">লগইন পিন (PIN) *</label>
                  <input
                    type="text"
                    required
                    placeholder="1234"
                    value={newModPin}
                    onChange={e => setNewModPin(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">মোবাইল নম্বর</label>
                  <input
                    type="tel"
                    placeholder="018XXXXXXXX"
                    value={newModPhone}
                    onChange={e => setNewModPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">জোন বা সমিতির নাম</label>
                <input
                  type="text"
                  placeholder="যেমন: উত্তরা জোন ব্যবসায়ী সমিতি"
                  value={newModShopName}
                  onChange={e => setNewModShopName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModeratorModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  মডারেটর তৈরি করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
