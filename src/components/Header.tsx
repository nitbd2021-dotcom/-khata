import React from 'react';
import { BookOpen, Shield, Cloud, LogOut, CheckCircle, ExternalLink, Sparkles, Smartphone, Users, ShieldAlert, Wifi, WifiOff, RefreshCw, FileSpreadsheet, ShieldCheck, QrCode, UserPlus } from 'lucide-react';
import { User } from '../types';
import { StorageService } from '../services/storageService';

interface HeaderProps {
  user: User;
  isAdminView: boolean;
  onToggleAdminView: () => void;
  isModeratorView?: boolean;
  onToggleModeratorView?: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onOpenAuthModal?: (mode: 'login' | 'register') => void;
  activeTab: 'dashboard' | 'customers' | 'reports';
  setActiveTab: (tab: 'dashboard' | 'customers' | 'reports') => void;
  onOpenVoiceKhata: () => void;
  onOpenQRScanner?: () => void;
  isRemembered: boolean;
  isOnline?: boolean;
  pendingCount?: number;
  isSyncing?: boolean;
  onOpenUserSheet?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  isAdminView,
  onToggleAdminView,
  isModeratorView = false,
  onToggleModeratorView,
  onOpenSettings,
  onLogout,
  onOpenAuthModal,
  activeTab,
  setActiveTab,
  onOpenVoiceKhata,
  onOpenQRScanner,
  isRemembered,
  isOnline = true,
  pendingCount = 0,
  isSyncing = false,
  onOpenUserSheet,
}) => {
  const isMod = StorageService.isModeratorUser(user);
  const isAdmin = StorageService.isAdminUser(user);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 md:h-20 gap-1.5 sm:gap-2">
          
          {/* Brand Logo & Shop Name */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-base sm:text-lg shadow-sm shadow-emerald-200 shrink-0">
              খ+
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
                  খাতা+
                </h1>
                <span className="hidden md:inline text-xs font-normal text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Google Drive & Sheets
                </span>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded-md font-bold shrink-0" title="সুপার এডমিন একাউন্ট">
                    <Shield className="w-3 h-3 text-amber-700" />
                    <span className="hidden xs:inline">সুপার এডমিন</span>
                  </span>
                )}
                {isMod && !isAdmin && (
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] bg-teal-100 text-teal-900 border border-teal-300 px-1.5 py-0.5 rounded-md font-bold shrink-0" title="মডারেটর একাউন্ট">
                    <ShieldCheck className="w-3 h-3 text-teal-700" />
                    <span className="hidden xs:inline">মডারেটর</span>
                  </span>
                )}
                {isRemembered && (
                  <span className="hidden lg:inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium" title="এই ডিভাইসে একাউন্ট সংরক্ষিত আছে">
                    <Smartphone className="w-3 h-3 text-emerald-600" /> ডিভাইস সেভড
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate max-w-[120px] xs:max-w-[170px] sm:max-w-xs font-medium">
                {user.shopName} {user.email ? <span className="text-slate-400 hidden sm:inline">• {user.email}</span> : ''}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          {(!isMod || isAdmin) && (
            <nav className="hidden md:flex items-center space-x-1 bg-slate-100/80 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'dashboard' && !isAdminView && !isModeratorView
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ড্যাশবোর্ড
              </button>
              <button
                onClick={() => setActiveTab('customers')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'customers' && !isAdminView && !isModeratorView
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                কাস্টমার তালিকা
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'reports' && !isAdminView && !isModeratorView
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                হিসাব ও রিপোর্ট
              </button>
            </nav>
          )}

          {/* Moderator Focused Header Center Badge */}
          {isMod && !isAdmin && (
            <div className="hidden md:flex items-center gap-2 bg-teal-50 border border-teal-200/80 px-4 py-1.5 rounded-2xl text-teal-900">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
              <div className="text-left">
                <span className="text-xs font-bold block leading-tight">মডারেটর কন্ট্রোল ও DSR মনিটরিং হাব</span>
                <span className="text-[10px] text-teal-700 font-medium">অধীনস্থ সকল ডিএসআর-এর হিসাব ও নিয়ন্ত্রণ</span>
              </div>
            </div>
          )}

          {/* Quick Actions & Status */}
          <div className="flex items-center space-x-2">
            
            {/* QR Scanner Trigger - Only on Home screen for regular shops/admins */}
            {(!isMod || isAdmin) && onOpenQRScanner && activeTab === 'dashboard' && (
              <button
                onClick={onOpenQRScanner}
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition active:scale-95 cursor-pointer"
                title="কাস্টমারের কিউআর কোড স্ক্যান করুন"
              >
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span className="hidden xs:inline">QR স্ক্যান</span>
              </button>
            )}

            {/* Voice Khata Trigger - Only for regular shops/admins */}
            {(!isMod || isAdmin) && (
              <button
                onClick={onOpenVoiceKhata}
                className="hidden sm:inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition active:scale-95 cursor-pointer"
                title="মুখে বলে হিসাব লিখুন"
              >
                <Sparkles className="w-4 h-4 text-emerald-200 animate-pulse" />
                <span>ভয়েস খাতা</span>
              </button>
            )}

            {/* Google Drive Sheet Live Button */}
            {(!isMod || isAdmin) && (
              onOpenUserSheet ? (
                <button
                  type="button"
                  onClick={onOpenUserSheet}
                  className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold border transition cursor-pointer shrink-0 ${
                    !isOnline
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                      : pendingCount > 0
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}
                  title="গুগল ড্রাইভ ও শিট সিঙ্ক ভিউয়ার"
                >
                  {isSyncing ? (
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                  ) : !isOnline ? (
                    <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  ) : (
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  
                  <span className="font-bold text-[11px] sm:text-xs">
                    {!isOnline ? (
                      `অফলাইন (${pendingCount})`
                    ) : isSyncing ? (
                      'সিঙ্ক...'
                    ) : pendingCount > 0 ? (
                      `শিট (${pendingCount})`
                    ) : (
                      <span className="hidden xs:inline">গুগল শিট</span>
                    )}
                  </span>
                </button>
              ) : user.googleSheetUrl ? (
                <a
                  href={user.googleSheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 sm:gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition shrink-0"
                  title="গুগল শিট ওপেন করুন"
                >
                  <Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                  <span className="hidden md:inline">ড্রাইভ শিট</span>
                  <ExternalLink className="w-3 h-3 text-emerald-500" />
                </a>
              ) : null
            )}

            {/* Moderator Portal Switcher (Visible ONLY when Super Admin is browsing) */}
            {isAdmin && onToggleModeratorView && (
              <button
                onClick={onToggleModeratorView}
                className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold border transition cursor-pointer shrink-0 ${
                  isModeratorView
                    ? 'bg-teal-700 text-white border-teal-800 shadow-xs'
                    : 'bg-teal-50 text-teal-900 border-teal-200 hover:bg-teal-100'
                }`}
                title="মডারেটর হিসেবে অধীনস্থ সকল ডিএসআর-এর মোট বাকি ও তথ্য দেখুন"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                <span className="hidden xs:inline">{isModeratorView ? 'ডিএসআর খাতা' : 'মডারেটর'}</span>
              </button>
            )}

            {/* Admin Sheet Switcher (Visible ONLY to verified Super Admin) */}
            {isAdmin && (
              <button
                onClick={onToggleAdminView}
                className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold border transition cursor-pointer shrink-0 ${
                  isAdminView
                    ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                    : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                }`}
                title="এডমিন কেন্দ্রীয় শিট ও সকল ব্যবহারকারীর পিন/হিসাব দেখুন"
              >
                <Shield className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden xs:inline">{isAdminView ? 'খাতায় ফিরুন' : 'এডমিন'}</span>
              </button>
            )}

            {/* Sign Up / Switch Account Button */}
            {onOpenAuthModal && (
              <button
                onClick={() => onOpenAuthModal('register')}
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer shrink-0"
                title="নতুন খাতা সাইন আপ করুন বা একাউন্ট পরিবর্তন করুন"
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                <span>নতুন সাইন আপ</span>
              </button>
            )}

            {/* Settings & Logout */}
            <button
              onClick={onOpenSettings}
              className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer shrink-0 min-w-[34px] min-h-[34px] flex items-center justify-center"
              title="সেটিংস ও ড্রাইভ সিঙ্ক কনফিগারেশন"
            >
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={onLogout}
              className="p-1.5 sm:p-2 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 transition cursor-pointer shrink-0 min-w-[34px] min-h-[34px] flex items-center justify-center"
              title="লগআউট"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
