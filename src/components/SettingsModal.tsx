import React, { useState } from 'react';
import { 
  X, 
  Cloud, 
  ExternalLink, 
  Save, 
  Smartphone, 
  Lock, 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  RefreshCw,
  Trash2,
  Sparkles,
  Copy,
  AlertTriangle,
  UserPlus,
  LogIn,
  Target,
  Receipt,
  Tag,
  Plus,
  AlertCircle,
  Info,
  Users
} from 'lucide-react';
import { User, Customer } from '../types';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { StorageService } from '../services/storageService';
import { PWAInstallButton } from './PWAInstallPrompt';
import { PRESET_CUSTOMER_TAGS } from '../constants/customerTags';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdateUser: (updated: User) => void;
  onLogout: () => void;
  onOpenAuthModal?: (mode: 'login' | 'register') => void;
  onCustomerUpdated?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onLogout,
  onOpenAuthModal,
  onCustomerUpdated,
}) => {
  const [shopName, setShopName] = useState(user.shopName);
  const [shopAddress, setShopAddress] = useState(user.shopAddress || '');
  const [pin, setPin] = useState(user.pin);
  const [dueThreshold, setDueThreshold] = useState<number>(user.dueThreshold ?? 2500);
  const [monthlyExpenseBudget, setMonthlyExpenseBudget] = useState<number>(user.monthlyExpenseBudget ?? 10000);
  const [sheetUrlInput, setSheetUrlInput] = useState(user.googleSheetUrl || '');
  const [clientId, setClientId] = useState(GoogleSheetsService.getCustomClientId());
  const [isSyncing, setIsSyncing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Customer Tags Management State
  const [customTags, setCustomTags] = useState<string[]>(() => StorageService.getCustomTags(user.id));
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [tagFeedback, setTagFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [tagToDeleteConfirm, setTagToDeleteConfirm] = useState<string | null>(null);
  const [userCustomers, setUserCustomers] = useState<Customer[]>(() => StorageService.getCustomers(user.id));
  const [showPresetsPreview, setShowPresetsPreview] = useState<boolean>(false);

  if (!isOpen) return null;

  const isRealSheet = GoogleSheetsService.isRealGoogleSheetId(user.googleSheetId);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    GoogleSheetsService.setCustomClientId(clientId);

    let newSheetId = user.googleSheetId;
    let newSheetUrl = user.googleSheetUrl;

    if (sheetUrlInput.trim()) {
      const extracted = GoogleSheetsService.extractSheetId(sheetUrlInput.trim());
      if (extracted) {
        newSheetId = extracted;
        newSheetUrl = `https://docs.google.com/spreadsheets/d/${extracted}/edit`;
      }
    }

    const updated: User = {
      ...user,
      shopName: shopName.trim() || user.shopName,
      shopAddress: shopAddress.trim(),
      pin: pin.trim() || user.pin,
      googleSheetId: newSheetId,
      googleSheetUrl: newSheetUrl,
      dueThreshold: Math.max(0, Number(dueThreshold) || 2500),
      monthlyExpenseBudget: Math.max(0, Number(monthlyExpenseBudget) || 0),
    };

    onUpdateUser(updated);
    setSuccessMsg('সেটিংস ও গুগল শিট লিঙ্ক সফলভাবে সংরক্ষিত হয়েছে!');
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    const customers = StorageService.getCustomers(user.id);
    const transactions = StorageService.getTransactions(user.id);

    const result = await GoogleSheetsService.syncUserDataToSheet(user, customers, transactions);
    setIsSyncing(false);
    setSuccessMsg(result.message);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleSmartPaste = async () => {
    const transactions = StorageService.getTransactions(user.id);
    await GoogleSheetsService.copySheetTsvToClipboard(transactions);
    if (isRealSheet && user.googleSheetUrl) {
      window.open(user.googleSheetUrl, '_blank');
    } else {
      window.open('https://sheets.new', '_blank');
    }
    setSuccessMsg('ডাটা কপি হয়েছে এবং শিট খোলা হয়েছে! শিটের প্রথম ঘর A1-এ পেস্ট (Ctrl+V) করুন।');
    setTimeout(() => setSuccessMsg(''), 6000);
  };

  const handleClearDevice = () => {
    StorageService.clearDeviceSession();
    setSuccessMsg('এই ডিভাইসের মেমোরি ক্লিয়ার করা হয়েছে।');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTagInput.trim();
    if (!clean) return;

    const result = StorageService.addCustomTag(user.id, clean);
    if (result.success) {
      setCustomTags(result.tags);
      setNewTagInput('');
      setTagFeedback({ type: 'success', message: result.message });
      if (onCustomerUpdated) {
        onCustomerUpdated();
      }
      setTimeout(() => setTagFeedback(null), 3500);
    } else {
      setTagFeedback({ type: 'error', message: result.message });
      setTimeout(() => setTagFeedback(null), 4000);
    }
  };

  const handleDeleteCustomTag = (tag: string) => {
    const result = StorageService.deleteCustomTag(user.id, tag);
    if (result.success) {
      setCustomTags(result.tags);
      setTagToDeleteConfirm(null);
      setUserCustomers(StorageService.getCustomers(user.id));
      setTagFeedback({ type: 'success', message: result.message });
      if (onCustomerUpdated) {
        onCustomerUpdated();
      }
      setTimeout(() => setTagFeedback(null), 4000);
    }
  };

  const getCustomerCountForTag = (tag: string) => {
    const lower = tag.trim().toLowerCase();
    return userCustomers.filter(c => 
      Array.isArray(c.tags) && c.tags.some(t => (t || '').trim().toLowerCase() === lower)
    ).length;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[96vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">দোকান ও সিস্টেম সেটিংস</h3>
            <p className="text-xs text-slate-500">গুগল ড্রাইভ, শিট সিঙ্ক এবং সিকিউরিটি</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-left">
          
          {successMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Google Drive & Sheet Integration Status */}
          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-emerald-600" />
                গুগল ড্রাইভ ও শিট স্ট্যাটাস
              </span>
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                isRealSheet 
                  ? 'bg-emerald-200 text-emerald-900' 
                  : 'bg-amber-200 text-amber-900'
              }`}>
                {isRealSheet ? 'আসল শিট কানেক্টেড' : 'শিট লিঙ্ক সেট করুন'}
              </span>
            </div>

            <p className="text-xs text-emerald-800">
              আপনার ইমেইল <strong className="font-bold">{user.email}</strong> এর গুগল ড্রাইভে সরাসরি হিসাব ব্যাকআপ থাকবে।
            </p>

            <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-bold">গুগল শিট লিঙ্ক</span>
                <div className="flex items-center gap-1.5">
                  <a
                    href="https://sheets.new"
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-bold flex items-center gap-1"
                  >
                    <span>নতুন শিট (sheets.new)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      if (isRealSheet && user.googleSheetUrl) {
                        window.open(user.googleSheetUrl, '_blank');
                      } else {
                        window.open('https://sheets.new', '_blank');
                      }
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold flex items-center gap-1"
                  >
                    <span>{isRealSheet ? 'শিট ওপেন' : 'শিট তৈরি'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  value={sheetUrlInput}
                  onChange={e => setSheetUrlInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  সরাসরি আপনার আসল শিটের ব্রাউজার লিঙ্ক পেস্ট করে নিচের &ldquo;পরিবর্তন সংরক্ষণ করুন&rdquo; চাপুন
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSmartPaste}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>১-ক্লিকে শিটে তথ্য পাঠান</span>
                </button>

                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'সিঙ্ক হচ্ছে...' : 'সিঙ্ক'}</span>
                </button>
              </div>

              <a
                href="https://drive.google.com/drive/u/0/my-drive"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-700 hover:text-emerald-900 font-bold underline flex items-center gap-1"
              >
                <span>গুগল ড্রাইভ</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Form for Shop Details & PIN */}
          <form onSubmit={handleSaveSettings} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">দোকানের নাম</label>
              <input
                type="text"
                value={shopName}
                onChange={e => setShopName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">দোকানের ঠিকানা</label>
              <input
                type="text"
                value={shopAddress}
                onChange={e => setShopAddress(e.target.value)}
                placeholder="যেমন: চকবাজার, ঢাকা"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                পাসওয়ার্ড বা গোপন পিন (Password / PIN)
              </label>
              <input
                type="text"
                value={pin}
                onChange={e => setPin(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Customer Low Balance / Outstanding Receivable Alert Threshold */}
            <div className="bg-amber-50/80 p-3.5 sm:p-4 rounded-2xl border border-amber-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>বকেয়া বাকি সতর্কতা সীমা (Receivable Threshold)</span>
                </label>
                <span className="text-[11px] font-black text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-lg border border-amber-300">
                  ৳{Number(dueThreshold || 0).toLocaleString('bn-BD')}
                </span>
              </div>

              <p className="text-[11px] text-amber-900/85 leading-relaxed">
                যেকোনো কাস্টমারের মোট বাকি পাওনা এই নির্ধারিত টাকার সীমা অতিক্রম করলে কাস্টমার তালিকায় তাকে লাল সতর্কবার্তা, বর্ডার হাইলাইট ও বিশেষ ব্যাজে চিহ্নিত করা হবে।
              </p>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">৳</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={dueThreshold}
                  onChange={e => setDueThreshold(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="যেমন: ২৫০০ বা ৫০০০..."
                  className="w-full bg-white border border-amber-300 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] text-amber-800 font-bold">কুইক সিলেক্ট:</span>
                {[1000, 2500, 5000, 10000, 20000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDueThreshold(amt)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      dueThreshold === amt
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-amber-900 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    ৳{amt.toLocaleString('bn-BD')}
                  </button>
                ))}
              </div>
            </div>

            {/* Monthly Expense Budget Limit Setting */}
            <div id="settings-expense-budget-section" className="bg-rose-50/80 p-3.5 sm:p-4 rounded-2xl border border-rose-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>মাসিক খরচের বাজেট (Monthly Expense Budget)</span>
                </label>
                <span className="text-[11px] font-black text-rose-800 bg-rose-200/80 px-2 py-0.5 rounded-lg border border-rose-300">
                  {monthlyExpenseBudget > 0 ? `৳${Number(monthlyExpenseBudget).toLocaleString('bn-BD')}` : 'নির্ধারিত নেই'}
                </span>
              </div>

              <p className="text-[11px] text-rose-900/85 leading-relaxed">
                দোকানের মাসিক মোট ব্যয়ের লক্ষ্যমাত্রা নির্ধারণ করুন। রিপোর্ট পেইজে আপনার বর্তমান খরচ এই বাজেটের কতটুকু পৌঁছেছে তা সরাসরি প্রগ্রেস বারে প্রদর্শিত হবে।
              </p>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">৳</span>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={monthlyExpenseBudget || ''}
                  onChange={e => setMonthlyExpenseBudget(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="যেমন: ১০০০০ বা ২০০০০..."
                  className="w-full bg-white border border-rose-300 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {/* Quick Preset Buttons for Monthly Budget */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] text-rose-800 font-bold">কুইক সিলেক্ট:</span>
                {[5000, 10000, 15000, 20000, 30000, 50000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setMonthlyExpenseBudget(amt)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      monthlyExpenseBudget === amt
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white text-rose-900 border border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    ৳{amt.toLocaleString('bn-BD')}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
            >
              পরিবর্তন সংরক্ষণ করুন
            </button>
          </form>

          {/* Customer Tags & Categories Management Section */}
          <div id="settings-customer-tags-section" className="pt-2 border-t border-slate-100">
            <div className="bg-indigo-50/50 border border-indigo-200/90 rounded-2xl p-3.5 sm:p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>কাস্টমার ট্যাগ ও ক্যাটাগরি ম্যানেজমেন্ট</span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                        {customTags.length}টি নিজস্ব ট্যাগ
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      কাস্টমারদের দ্রুত শ্রেণিবিভাগ করতে নিজস্ব ট্যাগ তৈরি ও পরিচালনা করুন
                    </p>
                  </div>
                </div>
              </div>

              {/* Inline Feedback Banner */}
              {tagFeedback && (
                <div className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold border transition ${
                  tagFeedback.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {tagFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{tagFeedback.message}</span>
                </div>
              )}

              {/* Add Custom Tag Form */}
              <form onSubmit={handleAddCustomTag} className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    id="settings-custom-tag-input"
                    placeholder="নতুন ট্যাগের নাম লিখুন (যেমন: ঠিকাদার, কর্পোরেট, বিশেষ_ছাড়)..."
                    value={newTagInput}
                    onChange={e => setNewTagInput(e.target.value)}
                    className="w-full bg-white border border-indigo-200 rounded-xl pl-8.5 pr-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  id="settings-add-tag-btn"
                  disabled={!newTagInput.trim()}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ট্যাগ যোগ করুন</span>
                </button>
              </form>

              {/* Custom Tags List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">
                    আপনার তৈরি করা নিজস্ব ট্যাগসমূহ:
                  </span>
                  <span className="text-[10px] text-slate-500">
                    ট্যাগ মুছলে কাস্টমার খতিয়ান থেকেও সরানো হবে
                  </span>
                </div>

                {customTags.length === 0 ? (
                  <div className="bg-white/80 border border-dashed border-indigo-200 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-500">
                      এখনও কোনো নিজস্ব ট্যাগ তৈরি করা হয়নি। উপরের বক্সে নাম লিখে এখনই যুক্ত করুন।
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {customTags.map(tag => {
                      const count = getCustomerCountForTag(tag);
                      const isConfirming = tagToDeleteConfirm === tag;

                      return (
                        <div
                          key={tag}
                          className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs hover:border-indigo-300 transition"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                            <span className="text-xs font-bold text-slate-800 truncate" title={tag}>
                              {tag}
                            </span>
                            <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md border border-slate-200 shrink-0">
                              {count > 0 ? `${count.toLocaleString('bn-BD')} জন` : 'ব্যবহৃত হয়নি'}
                            </span>
                          </div>

                          {/* Actions: Inline Confirmation */}
                          {isConfirming ? (
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <span className="text-[10px] text-rose-600 font-bold">মুছবেন?</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomTag(tag)}
                                className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer transition active:scale-95"
                              >
                                হ্যাঁ
                              </button>
                              <button
                                type="button"
                                onClick={() => setTagToDeleteConfirm(null)}
                                className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-bold cursor-pointer transition"
                              >
                                না
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setTagToDeleteConfirm(tag)}
                              title={`"${tag}" ট্যাগ মুছে ফেলুন`}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0 cursor-pointer ml-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Built-in Preset Tags Notice / Collapsible */}
              <div className="pt-2 border-t border-indigo-100">
                <button
                  type="button"
                  onClick={() => setShowPresetsPreview(prev => !prev)}
                  className="flex items-center justify-between w-full text-left text-[11px] font-bold text-indigo-900 hover:text-indigo-700 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-indigo-500" />
                    <span>সিস্টেমের ডিফল্ট ট্যাগসমূহ দেখুন ({PRESET_CUSTOMER_TAGS.length}টি)</span>
                  </span>
                  <span className="text-[10px] text-indigo-600 font-semibold underline">
                    {showPresetsPreview ? 'লুকান' : 'প্রদর্শন করুন'}
                  </span>
                </button>

                {showPresetsPreview && (
                  <div className="mt-2.5 pt-2 border-t border-indigo-100/60 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {PRESET_CUSTOMER_TAGS.map(preset => (
                      <div
                        key={preset.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-white/90 border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${preset.dotColor}`} />
                          <span className="font-bold text-slate-800 text-[11px]">{preset.bnLabel}</span>
                        </div>
                        <span className="text-[9px] font-mono uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                          ডিফল্ট
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Android & Chrome App Installation Section */}
          <div className="pt-2 border-t border-slate-100">
            <PWAInstallButton variant="full" />
          </div>

          {/* Device and Session Settings */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-slate-500" />
              <span>ডিভাইস মেমোরি সেটিংস</span>
            </h4>
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-600">এই ডিভাইসে অটো-লগইন সক্রিয় আছে</span>
              <button
                type="button"
                onClick={handleClearDevice}
                className="text-xs text-red-600 font-bold hover:underline"
              >
                ডিভাইস ভুলে যান
              </button>
            </div>
          </div>

          {/* New Account / Switch User Options */}
          {onOpenAuthModal && (
            <div className="pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                <span>একাউন্ট পরিবর্তন বা নতুন সাইন আপ</span>
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuthModal('register');
                  }}
                  className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-900 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-1 font-bold text-xs">
                    <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>নতুন সাইন আপ</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">নতুন দোকান বা খাতা খুলুন</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuthModal('login');
                  }}
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900 text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-1 font-bold text-xs">
                    <LogIn className="w-3.5 h-3.5 text-slate-600" />
                    <span>অন্য একাউন্টে লগইন</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">অন্য পিন বা আইডি দিয়ে প্রবেশ</p>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onLogout}
            className="text-xs font-bold text-red-600 hover:underline"
          >
            লগআউট করুন
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
};
