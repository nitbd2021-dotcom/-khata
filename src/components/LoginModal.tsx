import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  Store, 
  Smartphone, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  KeyRound,
  LogIn,
  Sparkles,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck
} from 'lucide-react';
import { DeviceSession, User } from '../types';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { StorageService, ADMIN_EMAIL, ADMIN_PASSWORD } from '../services/storageService';

interface LoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onLoginSuccess,
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [shopName, setShopName] = useState('');
  const [shopCategory, setShopCategory] = useState('মুদি দোকান');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedSession, setSavedSession] = useState<DeviceSession | null>(null);

  useEffect(() => {
    const session = StorageService.getDeviceSession();
    if (session) {
      setSavedSession(session);
      setEmail(session.email);
      setPin(session.pin);
    }
  }, []);

  if (!isOpen) return null;

  const handleStandardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('সঠিক ইমেইল এড্রেস প্রদান করুন (যেমন: yourname@gmail.com)');
      return;
    }
    if (!pin.trim() || pin.length < 4) {
      setErrorMsg('কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড বা পিন লিখুন');
      return;
    }

    try {
      const { user, isNew } = StorageService.registerOrLogin(
        email,
        pin,
        shopName || (isRegister ? 'আমার দোকান' : undefined),
        shopCategory,
        undefined,
        undefined,
        rememberMe
      );

      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMsg(err.message || 'লগইন করতে সমস্যা হয়েছে');
    }
  };

  const handleQuickUnlock = () => {
    if (!savedSession) return;
    try {
      const { user } = StorageService.registerOrLogin(
        savedSession.email,
        savedSession.pin,
        savedSession.shopName,
        undefined,
        undefined,
        undefined,
        true
      );
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMsg(err.message || 'ডিভাইস লগইন ব্যর্থ হয়েছে');
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    try {
      // Trigger Google OAuth 2.0 GSI Token Client
      const authResult = await GoogleSheetsService.requestGoogleToken();
      const userEmail = authResult.email || (email || 'user_' + Math.random().toString(36).substring(2, 7) + '@gmail.com');

      const { user } = StorageService.registerOrLogin(
        userEmail,
        pin || '1234',
        shopName || 'খাতা+ ডিজিটাল স্টোর',
        shopCategory,
        authResult.name || 'গুগল ব্যবহারকারী',
        undefined,
        rememberMe
      );

      // Create or link spreadsheet in Google Drive
      const sheet = await GoogleSheetsService.createOrGetSpreadsheet(user, authResult.token);
      user.googleSheetId = sheet.sheetId;
      user.googleSheetUrl = sheet.sheetUrl;
      user.googleAccessToken = authResult.token;
      StorageService.saveUser(user);

      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMsg(err.message || 'গুগল লগইনে সমস্যা হয়েছে');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/70 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[96vh] flex flex-col">
        
        {/* Top Header */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white text-center relative">
          <div className="w-12 h-12 rounded-2xl bg-white text-emerald-800 font-extrabold text-2xl flex items-center justify-center mx-auto shadow-md mb-2">
            খ+
          </div>
          <h2 className="text-xl font-bold tracking-tight">খাতা+ ডিজিটাল লেজার</h2>
          <p className="text-xs text-emerald-100 mt-1">
            গুগল ড্রাইভ ও গুগল শিট ভিত্তিক আধুনিক হিসাব খাতা
          </p>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Remembered Device Quick Unlock Banner */}
          {savedSession && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                  এই ডিভাইসে সংরক্ষিত দোকান
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                  স্বীকৃত ডিভাইস
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900">{savedSession.shopName}</p>
              <p className="text-xs text-slate-500">{savedSession.email}</p>
              <button
                type="button"
                onClick={handleQuickUnlock}
                className="mt-3 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-98 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>১-ট্যাপেই দ্রুত খাতায় প্রবেশ করুন</span>
              </button>
            </div>
          )}

          {/* Official styled "Sign in with Google" button */}
          <div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-2xs transition active:scale-98 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>গুগল একাউন্ট (Gmail) দিয়ে প্রবেশ করুন</span>
            </button>
            <div className="flex items-center my-3">
              <div className="flex-1 border-t border-slate-200"></div>
              <span className="px-2 text-[11px] text-slate-400 font-medium">অথবা ইমেইল ও পিন দিয়ে</span>
              <div className="flex-1 border-t border-slate-200"></div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleStandardSubmit} className="space-y-3 text-left">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                জিমেইল বা ইমেইল এড্রেস
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  placeholder="যেমন: nitbd2021@gmail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                * এই ইমেইলে গুগল ড্রাইভের অটোমেটিক শিট ফাইল যুক্ত থাকবে
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 block">
                  পাসওয়ার্ড বা গোপন পিন (Password / PIN)
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-slate-500 hover:text-emerald-700 flex items-center gap-1 font-medium cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPassword ? 'লুকান' : 'দেখুন'}</span>
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="যেমন: raju12158A+ বা ১২৩৪"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                * এডমিন লগইনের জন্য পাসওয়ার্ড এবং দোকানদারের জন্য গোপন পিন লিখুন
              </p>
            </div>

            {isRegister && (
              <>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    দোকানের নাম
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="যেমন: মেসার্স ভাই ভাই স্টোর"
                      value={shopName}
                      onChange={e => setShopName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    ব্যবসার ক্যাটাগরি
                  </label>
                  <select
                    value={shopCategory}
                    onChange={e => setShopCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="মুদি দোকান">মুদি দোকান</option>
                    <option value="কাপড় ও পোশাক">কাপড় ও পোশাক</option>
                    <option value="ফার্মেসি ও ঔষধ">ফার্মেসি ও ঔষধ</option>
                    <option value="ইলেকট্রনিক্স ও মোবাইল">ইলেকট্রনিক্স ও মোবাইল</option>
                    <option value="হার্ডওয়্যার ও স্যানিটারি">হার্ডওয়্যার ও স্যানিটারি</option>
                    <option value="হোটেল ও রেস্টুরেন্ট">হোটেল ও রেস্টুরেন্ট</option>
                    <option value="অন্যান্য ব্যবসা">অন্যান্য ব্যবসা</option>
                  </select>
                </div>
              </>
            )}

            {/* Remember Device Toggle */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-slate-700">
                  এই ডিভাইস মনে রাখুন (Remember Device)
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition active:scale-98 flex items-center justify-center gap-1.5 mt-2 cursor-pointer"
            >
              <span>{isRegister ? 'নতুন একাউন্ট ও শিট তৈরি করুন' : 'খাতায় প্রবেশ করুন'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Shortcut Accounts for quick testing */}
          <div className="pt-3 border-t border-slate-100">
            <div className="text-[11px] text-slate-500 font-semibold mb-2 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-amber-600" />
              <span>লগইন একাউন্ট ডেমো শর্টকাট (৩ স্তরীয় ভূমিকা):</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setEmail('Jahidulraju87@gmail.com');
                  setPin('raju12158A+');
                  setIsRegister(false);
                  setErrorMsg('');
                }}
                className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-950 text-left transition cursor-pointer"
                title="সুপার এডমিন একাউন্টে সরাসরি প্রবেশ করতে ক্লিক করুন"
              >
                <div className="flex items-center gap-1 font-bold text-[10px] text-amber-900">
                  <Shield className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>এডমিন</span>
                </div>
                <p className="text-[9px] text-amber-800 font-medium truncate">Jahidulraju87</p>
                <p className="text-[8px] text-amber-600 mt-0.5 font-mono">raju12158A+</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('moderator@khata.com');
                  setPin('1234');
                  setIsRegister(false);
                  setErrorMsg('');
                }}
                className="p-2 rounded-xl bg-teal-50 hover:bg-teal-100/80 border border-teal-200 text-teal-950 text-left transition cursor-pointer"
                title="মডারেটর একাউন্টে প্রবেশ করে অধীনস্থ সকল ডিএসআর-এর মোট বাকি দেখুন"
              >
                <div className="flex items-center gap-1 font-bold text-[10px] text-teal-900">
                  <ShieldCheck className="w-3 h-3 text-teal-600 shrink-0" />
                  <span>মডারেটর</span>
                </div>
                <p className="text-[9px] text-teal-800 font-medium truncate">moderator@khata</p>
                <p className="text-[8px] text-teal-600 mt-0.5 font-mono">পিন: 1234</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('nitbd2021@gmail.com');
                  setPin('1234');
                  setIsRegister(false);
                  setErrorMsg('');
                }}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-900 text-left transition cursor-pointer"
                title="ডিএসআর (DSR) একাউন্টে প্রবেশ করতে ক্লিক করুন"
              >
                <div className="flex items-center gap-1 font-bold text-[10px] text-slate-800">
                  <Store className="w-3 h-3 text-slate-600 shrink-0" />
                  <span>ডিএসআর (DSR)</span>
                </div>
                <p className="text-[9px] text-slate-600 font-medium truncate">nitbd2021</p>
                <p className="text-[8px] text-slate-400 mt-0.5 font-mono">পিন: 1234</p>
              </button>
            </div>
          </div>

          {/* Toggle Register / Login */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setErrorMsg('');
              }}
              className="text-xs text-emerald-700 hover:underline font-bold cursor-pointer"
            >
              {isRegister
                ? 'আগে থেকেই একাউন্ট আছে? লগইন করুন'
                : 'নতুন ডিএসআর? নতুন একাউন্ট ও অটো শিট খুলুন'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
