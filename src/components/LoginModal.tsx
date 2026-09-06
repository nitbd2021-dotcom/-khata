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
  UserPlus,
  User as UserIcon,
  Phone,
  X
} from 'lucide-react';
import { DeviceSession, User } from '../types';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { StorageService } from '../services/storageService';

interface LoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: User) => void;
  onClose?: () => void;
  initialMode?: 'login' | 'register';
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onLoginSuccess,
  onClose,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  
  // Login / Register Form Fields
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Registration specific fields
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [shopCategory, setShopCategory] = useState('মুদি দোকান');
  
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [savedSession, setSavedSession] = useState<DeviceSession | null>(null);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    const session = StorageService.getDeviceSession();
    if (session) {
      if (session.email && session.email.toLowerCase().includes('nitbd2021')) {
        StorageService.clearDeviceSession();
        setSavedSession(null);
        return;
      }
      setSavedSession(session);
      // Keep input empty on install / open as requested by user
    }
  }, [mode]);

  if (!isOpen) return null;

  // Handle User Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim()) {
      setErrorMsg('ইমেইল বা মোবাইল নম্বর লিখুন');
      return;
    }
    if (!pin.trim()) {
      setErrorMsg('পাসওয়ার্ড বা পিন লিখুন');
      return;
    }

    try {
      const user = StorageService.loginUser(email, pin, rememberMe);
      setSuccessMsg('লগইন সফল হয়েছে! খাতায় প্রবেশ করা হচ্ছে...');
      setTimeout(() => {
        onLoginSuccess(user);
      }, 400);
    } catch (err: any) {
      setErrorMsg(err.message || 'লগইন করতে সমস্যা হয়েছে। সঠিক তথ্য দিয়ে আবার চেষ্টা করুন।');
    }
  };

  // Handle User Registration / Sign Up
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim();
    const cleanShopName = shopName.trim();
    const cleanOwnerName = ownerName.trim();
    const cleanPin = pin.trim();
    const cleanConfirmPin = confirmPin.trim();

    if (!cleanShopName) {
      setErrorMsg('আপনার দোকান বা ব্যবসার নাম লিখুন');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('সঠিক ইমেইল বা জিমেইল লিখুন (যেমন: shop@gmail.com)');
      return;
    }
    if (cleanPin.length < 4) {
      setErrorMsg('পাসওয়ার্ড বা গোপন পিন কমপক্ষে ৪ অক্ষরের হতে হবে');
      return;
    }
    if (cleanPin !== cleanConfirmPin) {
      setErrorMsg('পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মেলেনি! দুটি জায়গায় একই পাসওয়ার্ড লিখুন।');
      return;
    }

    try {
      const newUser = StorageService.registerUser(
        {
          email: cleanEmail,
          pin: cleanPin,
          shopName: cleanShopName,
          shopCategory,
          name: cleanOwnerName || cleanShopName,
          phone: phone.trim(),
        },
        rememberMe
      );

      setSuccessMsg('অভিনন্দন! আপনার নতুন খাতা সফলভাবে তৈরি হয়েছে।');
      setTimeout(() => {
        onLoginSuccess(newUser);
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'সাইন আপ ব্যর্থ হয়েছে। অন্য ইমেইল ব্যবহার করুন বা লগইন করুন।');
    }
  };

  // 1-Tap Quick Unlock for recognized device
  const handleQuickUnlock = () => {
    if (!savedSession) return;
    try {
      const user = StorageService.loginUser(savedSession.email, savedSession.pin, true);
      setSuccessMsg('স্বীকৃত ডিভাইস থেকে প্রবেশ করা হয়েছে!');
      setTimeout(() => {
        onLoginSuccess(user);
      }, 300);
    } catch (err: any) {
      setErrorMsg(err.message || 'ডিভাইস লগইন ব্যর্থ হয়েছে');
    }
  };

  // Google Sign-In with auto sheet setup
  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const authResult = await GoogleSheetsService.requestGoogleToken();
      const userEmail = authResult.email || (email || 'user_' + Math.random().toString(36).substring(2, 7) + '@gmail.com');

      const { user } = StorageService.registerOrLogin(
        userEmail,
        pin || '1234',
        shopName || (authResult.name ? `${authResult.name}-এর খাতা` : 'খাতা+ ডিজিটাল স্টোর'),
        shopCategory,
        authResult.name || 'গুগল ব্যবহারকারী',
        phone || undefined,
        rememberMe
      );

      // Create or link spreadsheet in Google Drive
      const sheet = await GoogleSheetsService.createOrGetSpreadsheet(user, authResult.token);
      user.googleSheetId = sheet.sheetId;
      user.googleSheetUrl = sheet.sheetUrl;
      user.googleAccessToken = authResult.token;
      StorageService.saveUser(user);

      setSuccessMsg('গুগল একাউন্ট দিয়ে সফলভাবে যুক্ত হয়েছে!');
      setTimeout(() => {
        onLoginSuccess(user);
      }, 400);
    } catch (err: any) {
      setErrorMsg(err.message || 'গুগল লগইনে সমস্যা হয়েছে');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[95vh] flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close button if onClose is provided */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center transition cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Top Header */}
        <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 p-5 sm:p-6 text-white text-center relative">
          <div className="w-12 h-12 rounded-2xl bg-white text-emerald-800 font-black text-2xl flex items-center justify-center mx-auto shadow-md mb-2">
            খ+
          </div>
          <h2 className="text-xl font-bold tracking-tight">খাতা+ ডিজিটাল লেজার</h2>
          <p className="text-xs text-emerald-100 mt-0.5">
            দোকান ও ব্যবসার বাকি-নগদ হিসাব এবং গুগল ড্রাইভ ব্যাকআপ
          </p>
        </div>

        {/* Prominent Login / Sign Up Dual Switcher Tabs */}
        <div className="px-5 pt-3">
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/90 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-emerald-800 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-4 h-4 text-emerald-600" />
              <span>লগইন (Log In)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                mode === 'register'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>নতুন সাইন আপ (Sign Up)</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          
          {errorMsg && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 font-semibold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick Google Sign In (Available for both modes) */}
          <div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-2xs transition active:scale-98 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{mode === 'register' ? 'গুগল দিয়ে ১-ক্লিকে সাইন আপ' : 'গুগল একাউন্ট (Gmail) দিয়ে প্রবেশ'}</span>
            </button>
            <div className="flex items-center my-3">
              <div className="flex-1 border-t border-slate-200"></div>
              <span className="px-2 text-[11px] text-slate-400 font-medium">
                {mode === 'register' ? 'অথবা তথ্য দিয়ে একাউন্ট খুলুন' : 'অথবা ইমেইল ও পাসওয়ার্ড দিয়ে'}
              </span>
              <div className="flex-1 border-t border-slate-200"></div>
            </div>
          </div>

          {/* MODE: LOGIN FORM */}
          {mode === 'login' && (
            <div className="space-y-3.5">
              
              {/* Remembered Device Quick Unlock Banner */}
              {savedSession && !savedSession.email?.toLowerCase().includes('nitbd2021') && (
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 text-left">
                  <div className="flex items-center justify-between mb-1">
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
                    className="mt-2.5 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-98 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>১-ট্যাপেই দ্রুত খাতায় প্রবেশ করুন</span>
                  </button>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-3 text-left">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    জিমেইল / ইমেইল বা মোবাইল নম্বর <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="যেমন: shop@gmail.com বা 01712345678"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      পাসওয়ার্ড বা পিন (Password / PIN) <span className="text-red-500">*</span>
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
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="পাসওয়ার্ড বা গোপন পিন লিখুন"
                      value={pin}
                      onChange={e => setPin(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Remember Device */}
                <div className="flex items-center justify-between pt-0.5">
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
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                >
                  <LogIn className="w-4 h-4" />
                  <span>খাতায় প্রবেশ করুন</span>
                </button>
              </form>

              {/* Toggle to Register */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-xs text-emerald-700 hover:underline font-bold cursor-pointer inline-flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>নতুন ব্যবহারকারী? এখানে ক্লিক করে নতুন সাইন আপ করুন</span>
                </button>
              </div>

            </div>
          )}

          {/* MODE: REGISTER / SIGN UP FORM */}
          {mode === 'register' && (
            <div className="space-y-3.5">
              
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 text-left">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">যেকোনো ব্যবসায়ী সাইন আপ করতে পারবেন</h4>
                    <p className="text-[10px] text-slate-600">আপনার নিজস্ব দোকান বা ডিএসআর খাতা মুহূর্তেই চালু হবে</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3 text-left">
                
                {/* 1. Shop Name */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    দোকান বা ব্যবসার নাম <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="যেমন: মেসার্স হাসান এন্টারপ্রাইজ"
                      value={shopName}
                      onChange={e => setShopName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* 2. Owner Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      আপনার নাম (মালিক) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="যেমন: হাসান আলী"
                        value={ownerName}
                        onChange={e => setOwnerName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      মোবাইল নম্বর
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        placeholder="যেমন: 01712345678"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Email & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      জিমেইল / ইমেইল <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        placeholder="যেমন: hasan@gmail.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      ব্যবসার ধরণ / ক্যাটাগরি
                    </label>
                    <select
                      value={shopCategory}
                      onChange={e => setShopCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="মুদি দোকান">মুদি দোকান</option>
                      <option value="ফার্মেসি ও ঔষধ">ফার্মেসি ও ঔষধ</option>
                      <option value="কাপড় ও পোশাক">কাপড় ও পোশাক</option>
                      <option value="ইলেকট্রনিক্স ও মোবাইল">ইলেকট্রনিক্স ও মোবাইল</option>
                      <option value="হার্ডওয়্যার ও স্যানিটারি">হার্ডওয়্যার ও স্যানিটারি</option>
                      <option value="হোটেল ও রেস্টুরেন্ট">হোটেল ও রেস্টুরেন্ট</option>
                      <option value="ডিস্ট্রিবিউটর ও সাপ্লায়ার">ডিস্ট্রিবিউটর ও সাপ্লায়ার</option>
                      <option value="অন্যান্য ব্যবসা">অন্যান্য ব্যবসা</option>
                    </select>
                  </div>
                </div>

                {/* 4. PIN and Confirm PIN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        পাসওয়ার্ড বা পিন <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[10px] text-slate-500 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showPassword ? 'লুকান' : 'দেখুন'}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="কমপক্ষে ৪ সংখ্যা বা অক্ষর"
                        value={pin}
                        onChange={e => setPin(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        required
                        minLength={4}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      পাসওয়ার্ড নিশ্চিত করুন <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="একই পাসওয়ার্ড আবার লিখুন"
                        value={confirmPin}
                        onChange={e => setConfirmPin(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        required
                        minLength={4}
                      />
                    </div>
                  </div>
                </div>

                {/* Remember Device */}
                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      এই ডিভাইস মনে রাখুন (স্বয়ংক্রিয় লগইন)
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>সাইন আপ করুন ও নতুন খাতা খুলুন</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Switch to Login */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="text-xs text-emerald-700 hover:underline font-bold cursor-pointer inline-flex items-center gap-1"
                >
                  <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                  <span>আগে থেকেই একাউন্ট আছে? এখানে ক্লিক করে লগইন করুন</span>
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
