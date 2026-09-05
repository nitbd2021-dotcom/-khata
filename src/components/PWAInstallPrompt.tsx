import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  CheckCircle2, 
  X, 
  Sparkles, 
  ExternalLink, 
  HelpCircle,
  ShieldCheck,
  Zap,
  WifiOff,
  MoreVertical
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{
  variant?: 'compact' | 'full' | 'outline' | 'header';
  className?: string;
}> = ({ variant = 'compact', className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    if (variant === 'full') {
      return (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>খাতা+ সফলভাবে আপনার ডিভাইসে অ্যাপ হিসেবে ইনস্টল করা আছে।</span>
        </div>
      );
    }
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (!ok) {
        setShowGuide(true);
      }
    } else {
      setShowGuide(true);
    }
  };

  if (variant === 'header') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer shrink-0 animate-pulse hover:animate-none ${className}`}
          title="গুগল ক্রোম থেকে এন্ড্রয়েড অ্যাপের মতো ইনস্টল করুন"
        >
          <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          <span className="hidden xs:inline">অ্যাপ ইনস্টল</span>
          <Download className="w-3 h-3 text-emerald-200 hidden sm:inline" />
        </button>

        {showGuide && (
          <PWAInstallModal onClose={() => setShowGuide(false)} onInstallClick={handleClick} isInstallable={isInstallable} isIOS={isIOS} />
        )}
      </>
    );
  }

  if (variant === 'full') {
    return (
      <>
        <div className={`p-4 rounded-2xl bg-gradient-to-br from-emerald-900 to-teal-950 text-white shadow-lg space-y-3 ${className}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300 font-black text-base border border-white/10 shrink-0">
                খ+
              </div>
              <div>
                <h4 className="text-sm font-bold flex items-center gap-1.5">
                  <span>এন্ড্রয়েড অ্যাপের মতো ইনস্টল করুন</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                    PWA App
                  </span>
                </h4>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  গুগল ক্রোম ব্রাউজার থেকে সরাসরি আপনার মোবাইলের হোম স্ক্রিনে খাতা+ অ্যাপ যুক্ত করুন।
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-200/90 pt-1">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>নেট ছাড়াও দ্রুত খুলবে</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>ফুল-স্ক্রিন মোড</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClick}
            className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-[0.98] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isInstallable ? '১-ক্লিকে ইনস্টল করুন' : 'কিভাবে ইনস্টল করবেন দেখুন'}</span>
          </button>
        </div>

        {showGuide && (
          <PWAInstallModal onClose={() => setShowGuide(false)} onInstallClick={handleClick} isInstallable={isInstallable} isIOS={isIOS} />
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
          variant === 'outline'
            ? 'border border-emerald-600 text-emerald-700 hover:bg-emerald-50'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
        } ${className}`}
      >
        <Smartphone className="w-4 h-4" />
        <span>{isInstallable ? 'অ্যাপ ইনস্টল করুন' : 'ইনস্টল গাইড'}</span>
      </button>

      {showGuide && (
        <PWAInstallModal onClose={() => setShowGuide(false)} onInstallClick={handleClick} isInstallable={isInstallable} isIOS={isIOS} />
      )}
    </>
  );
};

export const PWAInstallModal: React.FC<{
  onClose: () => void;
  onInstallClick: () => void;
  isInstallable: boolean;
  isIOS: boolean;
}> = ({ onClose, onInstallClick, isInstallable, isIOS }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white text-emerald-700 font-black text-xl flex items-center justify-center shadow-md">
              খ+
            </div>
            <div>
              <h3 className="text-base font-bold">খাতা+ (Khata+) অ্যাপ ইনস্টল</h3>
              <p className="text-xs text-emerald-100 mt-0.5">
                গুগল ক্রোম থেকে এন্ড্রয়েড অ্যাপের মতো ব্যবহার করুন
              </p>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4">
          
          {/* Direct Install Button if browser supports beforeinstallprompt */}
          {isInstallable && (
            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>আপনার ব্রাউজার প্রস্তুত!</span>
              </div>
              <p className="text-xs text-emerald-800">
                নিচের বাটনে ক্লিক করলেই গুগল ক্রোম সরাসরি অ্যাপটি ইনস্টল করার নিশ্চিতকরণ দেখাবে।
              </p>
              <button
                type="button"
                onClick={onInstallClick}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>এখনই ইনস্টল করুন (Install Now)</span>
              </button>
            </div>
          )}

          {/* Chrome Manual Instructions */}
          {!isIOS ? (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-slate-600" />
                <span>গুগল ক্রোম (Chrome) থেকে ইনস্টল করার নিয়ম:</span>
              </h4>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-black text-[11px] flex items-center justify-center shrink-0">
                    ১
                  </span>
                  <div>
                    <span className="font-bold text-slate-900">ক্রোম মেনু অপশনে যান:</span>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      ব্রাউজারের উপরের ডান কোণায় থাকা <strong>৩টি ডট (⋮)</strong> মেনু আইকনে ট্যাপ করুন।
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-black text-[11px] flex items-center justify-center shrink-0">
                    ২
                  </span>
                  <div>
                    <span className="font-bold text-slate-900">ইনস্টল অপশনে ট্যাপ করুন:</span>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      মেনু তালিকা থেকে <strong>"Install app"</strong> বা <strong>"হোম স্ক্রিনে যোগ করুন (Add to Home screen)"</strong> অপশনে চাপ দিন।
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-black text-[11px] flex items-center justify-center shrink-0">
                    ৩
                  </span>
                  <div>
                    <span className="font-bold text-slate-900">ইনস্টল সম্পন্ন করুন:</span>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      পপআপ আসলে <strong>"Install"</strong> বাটনে ক্লিক করুন। কয়েক সেকেন্ডের মধ্যে এটি আপনার ফোনের অ্যাপ লিস্টে যুক্ত হবে।
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* iOS Safari Instructions */
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800">
                আইফোন / আইপ্যাড (iOS Safari) এ ইনস্টল করার নিয়ম:
              </h4>
              <div className="space-y-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  ১. সাফারি ব্রাউজারের নিচে থাকা <strong>Share (শেয়ার)</strong> বাটনে ট্যাপ করুন।
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  ২. কিছুটা নিচে স্ক্রোল করে <strong>"Add to Home Screen (হোম স্ক্রিনে যোগ করুন)"</strong> চাপুন।
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  ৩. উপরে ডানে <strong>"Add"</strong> বাটনে চাপলেই হোম স্ক্রিনে অ্যাপ যুক্ত হবে।
                </div>
              </div>
            </div>
          )}

          {/* Feature Highlights */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-slate-50 rounded-xl">
              <Zap className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <div className="text-[10px] font-bold text-slate-800 leading-tight">সুপার ফাস্ট</div>
              <div className="text-[9px] text-slate-500">তাত্ক্ষণিক লোডিং</div>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl">
              <Smartphone className="w-4 h-4 text-teal-600 mx-auto mb-1" />
              <div className="text-[10px] font-bold text-slate-800 leading-tight">অ্যাপ লুক</div>
              <div className="text-[9px] text-slate-500">কোনো এড্রেস বার নেই</div>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <div className="text-[10px] font-bold text-slate-800 leading-tight">অটো-সিঙ্ক</div>
              <div className="text-[9px] text-slate-500">গুগল শিট ব্যাকআপ</div>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            বুঝেছি, বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // If already installed as app or dismissed by user for this session
  if (isInstalled || isDismissed) {
    return null;
  }

  const handleInstall = async () => {
    if (isInstallable) {
      const ok = await install();
      if (!ok) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white px-3 sm:px-4 py-2 sm:py-2.5 shadow-md border-b border-emerald-700/50 flex items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
            খ+
          </div>
          <div className="min-w-0">
            <span className="font-bold text-white block sm:inline truncate">
              ক্রোম থেকে খাতা+ অ্যাপ ইনস্টল করুন:
            </span>{' '}
            <span className="text-emerald-200/90 text-[11px] hidden sm:inline">
              প্লে-স্টোরের প্রয়োজন ছাড়াই মোবাইলে আসল এন্ড্রয়েড অ্যাপের মতো ব্যবহার করুন
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleInstall}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ইনস্টল করুন</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 text-white/60 hover:text-white rounded-md hover:bg-white/10 transition cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showModal && (
        <PWAInstallModal
          onClose={() => setShowModal(false)}
          onInstallClick={handleInstall}
          isInstallable={isInstallable}
          isIOS={false}
        />
      )}
    </>
  );
};
