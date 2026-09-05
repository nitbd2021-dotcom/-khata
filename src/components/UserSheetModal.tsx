import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  X, 
  ExternalLink, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Wifi, 
  WifiOff, 
  Copy,
  Link,
  PlusCircle,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Check,
  Zap,
  Code,
  Users
} from 'lucide-react';
import { Customer, Transaction, User } from '../types';
import { GoogleSheetsService, MirrorSheetData } from '../services/googleSheetsService';

interface UserSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  customers: Customer[];
  transactions: Transaction[];
  isOnline: boolean;
  onTriggerSync: () => Promise<void>;
  isSyncing: boolean;
  lastSyncTime: string | null;
  onUpdateUser?: (updatedUser: User) => void;
}

export const UserSheetModal: React.FC<UserSheetModalProps> = ({
  isOpen,
  onClose,
  user,
  customers,
  transactions,
  isOnline,
  onTriggerSync,
  isSyncing,
  lastSyncTime,
  onUpdateUser,
}) => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'customers' | 'summary' | 'setup'>('transactions');
  const [searchTerm, setSearchTerm] = useState('');
  const [customUrlInput, setCustomUrlInput] = useState(user.googleSheetUrl || '');
  const [webhookInput, setWebhookInput] = useState(user.googleAppsScriptUrl || '');
  const [saveStatus, setSaveStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [smartPasteGuideOpen, setSmartPasteGuideOpen] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  if (!isOpen) return null;

  const mirrorData: MirrorSheetData = GoogleSheetsService.getMirrorSheetData(
    user,
    customers,
    transactions
  );

  const pendingCount = mirrorData.pendingCount;
  const isRealSheet = GoogleSheetsService.isRealGoogleSheetId(user.googleSheetId);
  const { url: directSheetUrl } = GoogleSheetsService.getValidSheetUrl(user);

  // Filter transactions
  const filteredTx = mirrorData.tabs.transactions.rows.filter(r => 
    r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.phone.includes(searchTerm) ||
    r.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveCustomSheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrlInput.trim()) {
      setSaveStatus({ message: 'দয়া করে একটি সঠিক গুগল শিট লিঙ্ক দিন', isError: true });
      return;
    }

    const res = GoogleSheetsService.saveUserSheetUrl(user, customUrlInput.trim());
    if (res.success) {
      // Also automatically copy data to clipboard for immediate paste
      GoogleSheetsService.copySheetTsvToClipboard(transactions);
      setSaveStatus({ 
        message: 'আপনার গুগল শিটের লিঙ্ক সংরক্ষিত হয়েছে এবং সব ডাটা কপি করা হয়েছে! শিটে গিয়ে A1 ঘরে পেস্ট (Ctrl+V) করুন।', 
        isError: false 
      });
      if (onUpdateUser) {
        onUpdateUser({
          ...user,
          googleSheetId: res.sheetId,
          googleSheetUrl: res.sheetUrl,
        });
      }
      setTimeout(() => setSaveStatus(null), 6000);
    } else {
      setSaveStatus({ message: res.error || 'ভুল লিঙ্ক! সঠিক ফরম্যাট দিন।', isError: true });
    }
  };

  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    const res = GoogleSheetsService.saveAppsScriptWebhookUrl(user, webhookInput);
    if (res.success) {
      setSaveStatus({ message: 'স্বয়ংক্রিয় ব্যাকগ্রাউন্ড সিঙ্ক সক্রিয় হয়েছে!', isError: false });
      if (onUpdateUser) {
        onUpdateUser({
          ...user,
          googleAppsScriptUrl: webhookInput.trim(),
        });
      }
      setTimeout(() => setSaveStatus(null), 4000);
    } else {
      setSaveStatus({ message: res.error || 'ভুল Webhook লিঙ্ক', isError: true });
    }
  };

  const handleSmartPasteAndOpen = async () => {
    const ok = await GoogleSheetsService.copySheetTsvToClipboard(transactions);
    if (ok) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 4000);
    }

    if (isRealSheet && user.googleSheetUrl) {
      window.open(user.googleSheetUrl, '_blank');
    } else {
      window.open('https://sheets.new', '_blank');
    }
    setSmartPasteGuideOpen(true);
  };

  const handleOpenGoogleSheet = () => {
    if (isRealSheet && user.googleSheetUrl) {
      window.open(user.googleSheetUrl, '_blank');
    } else {
      window.open('https://sheets.new', '_blank');
      setActiveTab('setup');
      setSaveStatus({
        message: 'নতুন গুগল শিট তৈরি হয়েছে! সেটির ব্রাউজার লিঙ্কটি কপি করে নিচের বক্সে পেস্ট করে সেভ করুন।',
        isError: false,
      });
    }
  };

  const handleCopyTsv = async () => {
    const ok = await GoogleSheetsService.copySheetTsvToClipboard(transactions);
    if (ok) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    }
  };

  const handleCopyCustomers = async () => {
    const ok = await GoogleSheetsService.copyCustomersTsvToClipboard(customers);
    if (ok) {
      setSaveStatus({
        message: 'কাস্টমার তালিকা ক্লিপবোর্ডে কপি হয়েছে! গুগল শিটে গিয়ে পেস্ট (Ctrl+V) করুন।',
        isError: false
      });
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };

  const handleCopySnippet = async () => {
    const snippet = GoogleSheetsService.getAppsScriptSnippet();
    await navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white w-full max-w-5xl max-h-[94vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/80">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {user.shopName} - গুগল ড্রাইভ ও শিট
                </h3>
                {isRealSheet ? (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> আসল শিট যুক্ত
                  </span>
                ) : (
                  <button 
                    onClick={() => setActiveTab('setup')}
                    className="inline-flex items-center gap-1 text-[11px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-bold hover:bg-amber-200 transition cursor-pointer"
                  >
                    <AlertCircle className="w-3 h-3 text-amber-600" /> শিট লিংক কানেক্ট করুন
                  </button>
                )}

                {isOnline ? (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-sky-100 text-sky-800 border border-sky-300 px-2 py-0.5 rounded-full font-semibold">
                    <Wifi className="w-3 h-3 text-sky-600" /> অনলাইন
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                    <WifiOff className="w-3 h-3 text-slate-600" /> অফলাইন মোড
                  </span>
                )}
                {pendingCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                    <Clock className="w-3 h-3 text-amber-600" /> {pendingCount}টি অফলাইনে অপেক্ষমান
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>ইমেইল: <b className="text-slate-700">{user.email}</b></span>
                {isRealSheet && (
                  <span>শিট আইডি: <span className="font-mono text-emerald-800 font-semibold">{user.googleSheetId}</span></span>
                )}
                {lastSyncTime && (
                  <span>সর্বশেষ সিঙ্ক: <b className="text-emerald-700">{new Date(lastSyncTime).toLocaleTimeString('bn-BD')}</b></span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-2.5">
          {/* Sheet Tabs */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'transactions'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              লেনদেন_বিবরণ ({mirrorData.tabs.transactions.rows.length})
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'customers'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              কাস্টমার_তালিকা ({mirrorData.tabs.customers.rows.length})
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'summary'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              দৈনিক_সারসংক্ষেপ
            </button>
            <button
              onClick={() => setActiveTab('setup')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'setup'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <Link className="w-3.5 h-3.5" />
              <span>শিট লিঙ্ক সেটিংস</span>
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Primary 1-Click Smart Data Helper */}
            <button
              onClick={handleSmartPasteAndOpen}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-xs transition cursor-pointer active:scale-95"
              title="ক্লিপবোর্ডে কপি করে সরাসরি গুগল শিট ওপেন করবে"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>১-ক্লিকে শিটে তথ্য পাঠান</span>
            </button>

            <button
              onClick={handleCopyTsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition cursor-pointer"
              title="গুগল শিটের খালি ঘরে সরাসরি পেস্ট করতে সব ডাটা কপি করুন"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copySuccess ? 'কপি হয়েছে!' : 'ডাটা কপি'}</span>
            </button>

            <button
              onClick={handleCopyCustomers}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition cursor-pointer"
              title="কাস্টমারদের নামের তালিকা ও ব্যালেন্স কপি করুন"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">কাস্টমার কপি</span>
            </button>

            <button
              onClick={() => GoogleSheetsService.downloadLedgerCsv(user, transactions)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 text-xs font-semibold transition cursor-pointer"
              title="CSV স্প্রেডশিট ফাইল ডাউনলোড করুন"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV ডাউনলোড</span>
            </button>

            <button
              onClick={onTriggerSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition cursor-pointer disabled:opacity-50"
              title="গুগল শিটে এখনই সিঙ্ক করুন"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
              <span>{isSyncing ? 'সিঙ্ক হচ্ছে...' : 'এখনই সিঙ্ক'}</span>
            </button>

            {/* Direct Open Google Sheet Button */}
            <button
              onClick={handleOpenGoogleSheet}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-xs transition cursor-pointer active:scale-95"
              title={isRealSheet ? "সরাসরি আপনার আসল গুগল শিটে যান" : "১-ক্লিকে নতুন শিট খুলুন"}
            >
              <span>{isRealSheet ? 'শিট খুলুন' : 'নতুন শিট (sheets.new)'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Smart Paste Assistant Guide Banner */}
        {smartPasteGuideOpen && (
          <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 text-white p-4 sm:p-5 border-b border-emerald-600 shadow-inner">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2.5 flex-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center text-xs font-black shrink-0">
                    ✓
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-white">
                    আপনার হিসাবের সব তথ্য কপি করা হয়েছে এবং গুগল শিটটি খোলা হয়েছে!
                  </h4>
                </div>
                <p className="text-xs text-emerald-200">
                  নতুন গুগল শিটে আপনার সকল কলাম ও ডাটা এক সেকেন্ডে সুন্দরভাবে বসাতে নিচের ৩টি সহজ ধাপ লক্ষ্য করুন:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15">
                    <span className="text-[11px] font-bold text-amber-300 block mb-1">ধাপ ১: শিটের ঘর নির্বাচন</span>
                    <span className="text-xs text-white leading-relaxed">
                      নতুন খোলা শিটের একদম ওপরের বাম কোণের প্রথম ঘর <b>A1</b> এ ক্লিক করুন।
                    </span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15">
                    <span className="text-[11px] font-bold text-amber-300 block mb-1">ধাপ ২: পেস্ট করুন</span>
                    <span className="text-xs text-white leading-relaxed">
                      কিবোর্ডে <b>Ctrl + V</b> চাপুন (অথবা মোবাইলে মাউসের রাইট ক্লিক করে <b>Paste</b> চাপুন)।
                    </span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/15">
                    <span className="text-[11px] font-bold text-emerald-300 block mb-1">ধাপ ৩: ব্যাস সম্পন্ন!</span>
                    <span className="text-xs text-white leading-relaxed">
                      তারিখ, নাম, মোবাইল, লেনদেনের ধরন, টাকা ও ব্যালেন্স সব কলামে সুবিন্যস্ত হয়ে যাবে।
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <button
                  onClick={() => setSmartPasteGuideOpen(false)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
                  title="বন্ধ করুন"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSmartPasteGuideOpen(false)}
                  className="px-3.5 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  ✓ বুঝেছি, পেস্ট করেছি
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status notification toast */}
        {saveStatus && (
          <div className={`px-4 py-2.5 text-xs flex items-center justify-between border-b ${
            saveStatus.isError ? 'bg-red-50 text-red-800 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}>
            <span className="font-semibold">{saveStatus.message}</span>
            <button onClick={() => setSaveStatus(null)} className="text-slate-500 hover:text-slate-700">✕</button>
          </div>
        )}

        {/* Notification when sheet is not yet linked */}
        {!isRealSheet && activeTab !== 'setup' && (
          <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <b>সঠিক গুগল শিট ওপেন করতে:</b> আপনার গুগল ড্রাইভের আসল শিটের লিঙ্ক যুক্ত করুন অথবা ১-ক্লিকে নতুন শিট বানিয়ে লিঙ্কটি সেভ করুন।
              </span>
            </div>
            <button
              onClick={() => setActiveTab('setup')}
              className="px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 font-bold text-[11px] text-amber-950 transition cursor-pointer"
            >
              শিট লিঙ্ক যুক্ত করুন ➔
            </button>
          </div>
        )}

        {/* Table Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-white">
          {activeTab === 'transactions' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  placeholder="কাস্টমার বা বিবরণের নাম খুঁজুন..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full max-w-xs text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-xs text-slate-500 font-medium">
                  মোট: {filteredTx.length} টি লেনদেন
                </span>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto shadow-2xs">
                <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                      {mirrorData.tabs.transactions.headers.map((h, i) => (
                        <th key={i} className="p-2.5 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {filteredTx.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400">
                          কোন লেনদেন পাওয়া যায়নি
                        </td>
                      </tr>
                    ) : (
                      filteredTx.map(row => (
                        <tr key={row.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-2.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {row.date}
                          </td>
                          <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">
                            {row.customerName}
                          </td>
                          <td className="p-2.5 text-slate-600 font-mono">
                            {row.phone}
                          </td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 text-slate-700 font-semibold whitespace-nowrap">
                              {row.type}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded-md text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold whitespace-nowrap">
                              {row.paymentMethod}
                            </span>
                          </td>
                          <td className="p-2.5 font-bold text-slate-900 font-mono">
                            ৳{row.amount.toLocaleString('bn-BD')}
                          </td>
                          <td className="p-2.5 text-slate-600 max-w-[200px] truncate">
                            {row.description}
                          </td>
                          <td className="p-2.5 font-semibold text-slate-700 whitespace-nowrap">
                            {row.balance}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            {row.synced ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>শিটে সিঙ্কড</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>অফলাইন অপেক্ষমান</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="space-y-3">
              <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto shadow-2xs">
                <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                      {mirrorData.tabs.customers.headers.map((h, i) => (
                        <th key={i} className="p-2.5 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {mirrorData.tabs.customers.rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400">
                          কোন কাস্টমার ডাটা পাওয়া যায়নি
                        </td>
                      </tr>
                    ) : (
                      mirrorData.tabs.customers.rows.map((c, i) => (
                        <tr key={i} className="hover:bg-slate-50/80 transition">
                          <td className="p-2.5 font-bold text-slate-900">
                            {c.name}
                          </td>
                          <td className="p-2.5 text-slate-600 font-mono">
                            {c.phone}
                          </td>
                          <td className="p-2.5 font-bold text-red-600 font-mono">
                            ৳{c.receivable.toLocaleString('bn-BD')}
                          </td>
                          <td className="p-2.5 font-bold text-purple-600 font-mono">
                            ৳{c.payable.toLocaleString('bn-BD')}
                          </td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              c.netBalance > 0 
                                ? 'bg-red-50 text-red-700' 
                                : c.netBalance < 0 
                                ? 'bg-purple-50 text-purple-700' 
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {c.netBalance > 0 ? `পাওনা ৳${c.netBalance}` : c.netBalance < 0 ? `দেনা ৳${Math.abs(c.netBalance)}` : 'পরিশোধিত'}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-500 text-[11px]">
                            {c.lastTransaction}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="max-w-2xl mx-auto space-y-4 py-2">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 divide-y divide-slate-200">
                {mirrorData.tabs.summary.items.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">{item.label}</span>
                    <span className="font-bold text-slate-900 text-sm">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Setup / Custom Link Configuration Tab */}
          {activeTab === 'setup' && (
            <div className="max-w-2xl mx-auto space-y-5 py-2">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-5 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Link className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">গুগল শিট কানেকশন ও সঠিক লিঙ্ক সেটআপ</h4>
                    <p className="text-xs text-slate-600">
                      আপনার ব্যক্তিগত গুগল ড্রাইভের আসল শিটের লিঙ্ক যুক্ত করলে প্রতিবার ক্লিক করলেই আপনার সঠিক শিটটি ওপেন হবে।
                    </p>
                  </div>
                </div>

                {/* Current Status */}
                <div className="p-3.5 bg-white rounded-2xl border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">বর্তমান শিটের অবস্থা:</span>
                    {isRealSheet ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ✓ আসল গুগল শিট লিংক সক্রিয়
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        ⚠️ আসল লিঙ্ক এখনো যুক্ত করা হয়নি
                      </span>
                    )}
                  </div>
                  {isRealSheet && (
                    <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl">
                      <span className="font-mono text-slate-600 truncate max-w-sm">{user.googleSheetUrl}</span>
                      <a
                        href={user.googleSheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 shrink-0 ml-2"
                      >
                        <span>শিট খুলুন</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Step 1: 1-Click create */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                  <span className="text-xs font-bold text-slate-800 block">ধাপ ১: নতুন শিট তৈরি করতে চান?</span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    নিচের বাটনে ক্লিক করলে আপনার গুগল একাউন্টে সরাসরি একটি নতুন স্প্রেডশিট ফাইল তৈরি হয়ে যাবে। তারপর ব্রাউজারের এড্রেস বারের লিঙ্কটি কপি করে ধাপ ২-এ পেস্ট করুন।
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href="https://sheets.new"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>১-ক্লিকে নতুন শিট খুলুন (sheets.new)</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href="https://docs.google.com/spreadsheets/u/0/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                    >
                      <span>আপনার পূর্বের শিট তালিকা</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Step 2: Paste link */}
                <form onSubmit={handleSaveCustomSheet} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                  <label className="text-xs font-bold text-slate-800 block">
                    ধাপ ২: আপনার গুগল শিট লিঙ্ক পেস্ট করুন
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                      value={customUrlInput}
                      onChange={e => setCustomUrlInput(e.target.value)}
                      className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer whitespace-nowrap"
                    >
                      লিঙ্ক সংরক্ষণ করুন
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    উদাহরণ: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
                  </p>
                </form>

                {/* Step 3: Quick Data Transfer */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5">
                  <span className="text-xs font-bold text-slate-800 block">ধাপ ৩: শিটে ডাটা নেওয়ার সহজ উপায়</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                      <div>
                        <p className="font-bold text-slate-800 mb-1">১. সরাসরি পেস্ট করুন</p>
                        <p className="text-slate-600 text-[11px] mb-2">ডাটা কপি বাটনে চাপ দিয়ে শিটের A1 ঘরে পেস্ট (Ctrl+V) করলেই সকল কলাম ঠিকভাবে বসে যাবে।</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyTsv}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg transition"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copySuccess ? 'কপি সম্পন্ন!' : 'ডাটা কপি করুন'}</span>
                      </button>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
                      <div>
                        <p className="font-bold text-slate-800 mb-1">২. CSV ইমপোর্ট করুন</p>
                        <p className="text-slate-600 text-[11px] mb-2">ফাইল ডাউনলোড করে গুগল শিটের File &gt; Import &gt; Upload দিয়ে ১ সেকেন্ডে সম্পূর্ণ হিসাব খুলুন।</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => GoogleSheetsService.downloadLedgerCsv(user, transactions)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>CSV ফাইল ডাউনলোড</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Step 4: Webhook Auto-Sync (Optional) */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-600" />
                      ধাপ ৪: ১০০% অটো-সিঙ্ক (Google Apps Script Webhook - ঐচ্ছিক)
                    </span>
                    <button
                      type="button"
                      onClick={handleCopySnippet}
                      className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Code className="w-3.5 h-3.5" />
                      <span>{copiedSnippet ? 'স্ক্রিপ্ট কপি হয়েছে!' : 'স্ক্রিপ্ট কোড কপি'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    আপনি কি চান অ্যাপে যেকোনো হিসাব যুক্ত বা পরিবর্তন হওয়ামাত্র স্বয়ংক্রিয়ভাবে কোনো কপি-পেস্ট ছাড়াই সরাসরি আপনার গুগল শিটে জমা হবে?
                    আপনার গুগল শিটের <b>Extensions &gt; Apps Script</b> এ গিয়ে উপরের কোডটি পেস্ট করে <b>Deploy &gt; New deployment &gt; Web app (Anyone)</b> করে প্রাপ্ত লিঙ্কটি নিচে সংরক্ষণ করুন।
                  </p>

                  <form onSubmit={handleSaveWebhook} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="https://script.google.com/macros/s/.../exec"
                      value={webhookInput}
                      onChange={e => setWebhookInput(e.target.value)}
                      className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer whitespace-nowrap"
                    >
                      অটো-সিঙ্ক লিঙ্ক সেভ
                    </button>
                  </form>
                </div>

              </div>
            </div>
          )}

          {/* Offline/Online Info Notice */}
          <div className="mt-5 p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 leading-relaxed">
              <p className="font-bold mb-0.5">স্বয়ংক্রিয় ব্যাকআপ ও সিঙ্ক নিরাপত্তা:</p>
              <p className="text-slate-700">
                ইন্টারনেট না থাকলেও কোনো ভয় নেই—সকল হিসাব আপনার ডিভাইসে সুরক্ষিত থাকবে। ইন্টারনেট সংযুক্ত হওয়ামাত্রই তা গুগল শিটের সাথে নিজে থেকে আপডেট হয়ে যাবে।
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-[11px] text-slate-500">
            <a
              href="https://drive.google.com/drive/u/0/my-drive"
              target="_blank"
              rel="noreferrer"
              className="hover:text-emerald-700 underline flex items-center gap-1"
            >
              <span>আমার গুগল ড্রাইভ</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span>•</span>
            <a
              href="https://docs.google.com/spreadsheets/u/0/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-emerald-700 underline flex items-center gap-1"
            >
              <span>গুগল শিট তালিকা</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
