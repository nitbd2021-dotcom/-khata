import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Phone, 
  MapPin, 
  FileText, 
  Send, 
  Printer, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Share2, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  QrCode,
  CreditCard,
  Edit2,
  Check,
  ShieldCheck,
  Receipt,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Bookmark,
  Save,
  Sparkles,
  Download
} from 'lucide-react';
import { Customer, Transaction, TransactionType, User } from '../types';
import { formatBanglaPaymentMethod, formatBanglaTxType } from '../services/googleSheetsService';
import { CustomerQRCodeModal } from './CustomerQRCodeModal';
import { CustomerStatementModal } from './CustomerStatementModal';
import { StorageService } from '../services/storageService';
import { BanglaSpeechRecognizer, speakBanglaText, stopSpeaking } from '../services/voiceService';

const QUICK_NOTE_PRESETS = [
  'শুক্রবারে পেমেন্ট দিতে স্বাচ্ছন্দ্য বোধ করেন',
  'দোকানের সামনে মালামাল ডেলিভারি দিতে হবে',
  'ফোনে আগে কল দিয়ে বাকি দিতে হবে',
  'বকেয়া পরিশোধের তাগাদা দেওয়া হয়েছে',
  'বিকাশ/নগদে অনলাইন পেমেন্ট দেন',
  'প্রতি মাসের ৫ তারিখে বেতন পান',
];

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  transactions: Transaction[];
  user: User;
  onQuickAddTx: (type: TransactionType, customerId: string) => void;
  isModerator?: boolean;
  onCustomerUpdated?: () => void;
  onViewReceipt?: (transaction: Transaction, customer: Customer) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  isOpen,
  onClose,
  customer,
  transactions,
  user,
  onQuickAddTx,
  isModerator = false,
  onCustomerUpdated,
  onViewReceipt,
}) => {
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [limitInput, setLimitInput] = useState<string>('');
  const [currentCreditLimit, setCurrentCreditLimit] = useState<number | undefined>(customer?.creditLimit);

  // Private Internal Notes state for DSR
  const [noteText, setNoteText] = useState<string>(customer?.note || '');
  const [isListeningNote, setIsListeningNote] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [noteSavedFeedback, setNoteSavedFeedback] = useState<boolean>(false);
  const [noteVoiceStatus, setNoteVoiceStatus] = useState<string>('');
  const noteRecognizerRef = useRef<BanglaSpeechRecognizer | null>(null);

  // Sync state if customer changes
  useEffect(() => {
    setCurrentCreditLimit(customer?.creditLimit);
    setLimitInput(customer?.creditLimit ? String(customer.creditLimit) : '');
    setIsEditingLimit(false);
    setNoteText(customer?.note || '');
    setNoteSavedFeedback(false);
    setNoteVoiceStatus('');
    setIsListeningNote(false);
    setIsPlayingAudio(false);
    stopSpeaking();
  }, [customer?.id, customer?.creditLimit, customer?.note]);

  // Clean up voice recognition and speech synthesis on unmount / close
  useEffect(() => {
    return () => {
      if (noteRecognizerRef.current) {
        noteRecognizerRef.current.stop();
      }
      stopSpeaking();
    };
  }, []);

  if (!isOpen || !customer) return null;

  const handleSaveNote = () => {
    if (!customer) return;
    const ok = StorageService.updateCustomerNote(customer.id, noteText);
    if (ok) {
      customer.note = noteText.trim();
      setNoteSavedFeedback(true);
      setTimeout(() => setNoteSavedFeedback(false), 3000);
      if (onCustomerUpdated) onCustomerUpdated();
    }
  };

  const handleToggleVoiceNote = () => {
    if (isListeningNote) {
      if (noteRecognizerRef.current) {
        noteRecognizerRef.current.stop();
      }
      setIsListeningNote(false);
      setNoteVoiceStatus('');
      return;
    }

    // Stop speaking if playing audio
    stopSpeaking();
    setIsPlayingAudio(false);

    try {
      const recognizer = new BanglaSpeechRecognizer();
      noteRecognizerRef.current = recognizer;
      setIsListeningNote(true);
      setNoteVoiceStatus('শুনছি... আপনার নোটটি বাংলায় স্পষ্ট করে বলুন');

      recognizer.start(
        (transcriptText: string, isFinal: boolean) => {
          if (transcriptText) {
            setNoteText(prev => {
              const base = prev.trim();
              if (!base) return transcriptText;
              return `${base}। ${transcriptText}`;
            });
            if (isFinal) {
              setNoteVoiceStatus('ভয়েস গ্রহণ সম্পন্ন হয়েছে!');
              setTimeout(() => setNoteVoiceStatus(''), 2500);
            }
          }
        },
        (error: any) => {
          console.warn('Voice note recognition error:', error);
          setIsListeningNote(false);
          setNoteVoiceStatus('মাইক্রোফোনে সমস্যা বা কোনো শব্দ পাওয়া যায়নি।');
          setTimeout(() => setNoteVoiceStatus(''), 3000);
        },
        () => {
          setIsListeningNote(false);
        }
      );
    } catch (err) {
      console.warn('Speech recognition init error:', err);
      setIsListeningNote(false);
      setNoteVoiceStatus('ব্রাউজারে ভয়েস রিকগনিশন সক্রিয় নেই।');
      setTimeout(() => setNoteVoiceStatus(''), 3000);
    }
  };

  const handleTogglePlayAudio = () => {
    if (isPlayingAudio) {
      stopSpeaking();
      setIsPlayingAudio(false);
      return;
    }

    const textToRead = noteText.trim();
    if (!textToRead) {
      setNoteVoiceStatus('পড়ে শুনানোর জন্য কোনো নোট লেখা নেই। আগে নোট লিখুন বা বলুন।');
      setTimeout(() => setNoteVoiceStatus(''), 3000);
      return;
    }

    // If voice recognition is listening, stop it first
    if (isListeningNote && noteRecognizerRef.current) {
      noteRecognizerRef.current.stop();
      setIsListeningNote(false);
    }

    const started = speakBanglaText(
      textToRead,
      () => setIsPlayingAudio(true),
      () => setIsPlayingAudio(false),
      () => {
        setIsPlayingAudio(false);
        setNoteVoiceStatus('অডিও প্লে করতে সমস্যা হয়েছে।');
        setTimeout(() => setNoteVoiceStatus(''), 3000);
      }
    );

    if (!started) {
      setIsPlayingAudio(false);
      setNoteVoiceStatus('আপনার ব্রাউজারে টেক্সট-টু-স্পিচ সুবিধা সক্রিয় নেই।');
      setTimeout(() => setNoteVoiceStatus(''), 3000);
    }
  };

  const handleAddPreset = (preset: string) => {
    setNoteText(prev => {
      const base = prev.trim();
      if (!base) return preset;
      if (base.includes(preset)) return base;
      return `${base}। ${preset}`;
    });
  };

  const handleSaveLimit = () => {
    const val = Math.max(0, Number(limitInput) || 0);
    const ok = StorageService.updateCustomerCreditLimit(customer.id, val);
    if (ok) {
      setCurrentCreditLimit(val);
      setIsEditingLimit(false);
      if (onCustomerUpdated) onCustomerUpdated();
    }
  };

  // Effective limit: customer's specific credit limit if set (>0), otherwise shop's general dueThreshold
  const hasSpecificLimit = typeof currentCreditLimit === 'number' && currentCreditLimit > 0;
  const effectiveLimit = hasSpecificLimit ? currentCreditLimit : (user.dueThreshold ?? 2500);
  const isLimitExceeded = customer.netBalance > effectiveLimit;
  const exceededDiff = isLimitExceeded ? customer.netBalance - effectiveLimit : 0;

  // Filter transactions for this specific customer
  const customerTxs = transactions
    .filter(t => t.customerId === customer.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // WhatsApp Reminder text
  const reminderMessage = `শ্রদ্ধেয় ${customer.name} ভাই, ${user.shopName} দোকানে আপনার বর্তমান বকেয়া পাওনা ৳${customer.netBalance > 0 ? customer.netBalance.toLocaleString('bn-BD') : '০'} টাকা। সুবিধাজনক সময়ে পরিশোধ করার অনুরোধ রইল। ধন্যবাদ।`;

  const handleWhatsAppReminder = () => {
    let cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('01')) {
      cleanPhone = '88' + cleanPhone;
    }
    const encoded = encodeURIComponent(reminderMessage);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] sm:max-h-[90vh] flex flex-col print:shadow-none print:border-none print:max-h-full">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 shrink-0 print:hidden">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-base sm:text-lg shrink-0">
              {customer.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {customer.code && (
                  <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-mono font-black text-[11px] border border-indigo-200 shadow-2xs">
                    {customer.code}
                  </span>
                )}
                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  {customer.name}
                </h3>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                {customer.phone || 'মোবাইল নম্বর নেই'} {customer.address ? `• ${customer.address}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition cursor-pointer shrink-0 ml-2"
            title="বন্ধ করুন"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Printable Shop Banner */}
        <div className="hidden print:block p-6 border-b text-center">
          <h2 className="text-2xl font-bold text-slate-900">{user.shopName}</h2>
          <p className="text-sm text-slate-600">{user.shopAddress} | {user.email}</p>
          <div className="mt-4 p-3 bg-slate-100 rounded-lg text-left">
            <p className="font-bold text-slate-900">কাস্টমারের নাম: {customer.name}</p>
            <p className="text-sm text-slate-700">মোবাইল: {customer.phone} | ঠিকানা: {customer.address}</p>
          </div>
        </div>

        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-3.5 sm:space-y-4 flex-1">
          
          {/* Threshold Alert Banner if Customer Exceeds Predefined Limit */}
          {isLimitExceeded && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex items-start sm:items-center justify-between gap-2.5 print:hidden">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-500 text-white flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-[11px] sm:text-xs font-black text-red-800">
                    বকেয়া বাকি সতর্কতা সীমা অতিক্রান্ত!
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-red-700 mt-0.5">
                    মোট বাকি ৳{customer.netBalance.toLocaleString('bn-BD')} নির্ধারিত সীমা ৳{effectiveLimit.toLocaleString('bn-BD')} ছাড়িয়েছে।
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-red-600 text-white font-bold text-[10px] sm:text-xs shrink-0 whitespace-nowrap">
                +৳{exceededDiff.toLocaleString('bn-BD')}
              </span>
            </div>
          )}

          {/* Customer Credit Limit Section (Configured by Moderator) */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl print:hidden flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-800">বাকির সর্বোচ্চ লিমিট</span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    ({hasSpecificLimit ? 'মডারেটর নির্ধারিত কাস্টমার লিমিট' : 'ডিফল্ট দোকান সীমা'})
                  </span>
                </div>
                <div className="text-sm font-black text-slate-900 mt-0.5">
                  ৳{effectiveLimit.toLocaleString('bn-BD')}
                  {hasSpecificLimit && (
                    <span className="ml-1.5 text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                      কাস্টমার স্পেসিফিক
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Moderator Control vs DSR Read-only Notice */}
            <div>
              {isModerator ? (
                isEditingLimit ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-500">৳</span>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={limitInput}
                      onChange={e => setLimitInput(e.target.value)}
                      placeholder="লিমিট..."
                      className="w-24 px-2 py-1 text-xs font-bold bg-white border border-teal-500 rounded-xl focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveLimit}
                      className="p-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition cursor-pointer"
                      title="সংরক্ষণ করুন"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsEditingLimit(false)}
                      className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl transition cursor-pointer"
                      title="বাতিল"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setLimitInput(currentCreditLimit ? String(currentCreditLimit) : '');
                      setIsEditingLimit(true);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-xl text-xs font-bold transition cursor-pointer"
                    title="মডারেটর হিসেবে লিমিট পরিবর্তন করুন"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>লিমিট নির্ধারণ</span>
                  </button>
                )
              ) : (
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-medium block">
                    শুধুমাত্র মডারেটর নিয়ন্ত্রণ করতে পারেন
                  </span>
                  <span className="text-[10px] text-teal-700 font-bold flex items-center justify-end gap-1 mt-0.5">
                    <ShieldCheck className="w-3 h-3" />
                    <span>মডারেটর সুরক্ষিত</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Balance Cards Summary */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-red-50/80 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-red-200">
              <span className="text-[10px] sm:text-xs font-bold text-red-700 uppercase tracking-wider block truncate">
                মোট বাকি
              </span>
              <span className="text-sm sm:text-lg font-black text-red-600 block mt-0.5">
                ৳{customer.totalReceivable.toLocaleString('bn-BD')}
              </span>
            </div>

            <div className="bg-emerald-50/80 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-emerald-200">
              <span className="text-[10px] sm:text-xs font-bold text-emerald-700 uppercase tracking-wider block truncate">
                মোট আদায়
              </span>
              <span className="text-sm sm:text-lg font-black text-emerald-600 block mt-0.5">
                ৳{(customer.totalReceivable - customer.netBalance).toLocaleString('bn-BD')}
              </span>
            </div>

            <div className="bg-slate-900 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl text-white border border-slate-800">
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block truncate">
                বর্তমান বাকি
              </span>
              <span className="text-sm sm:text-lg font-black text-emerald-400 block mt-0.5 truncate">
                ৳{customer.netBalance >= 0 ? customer.netBalance.toLocaleString('bn-BD') : `দেনা ${Math.abs(customer.netBalance).toLocaleString('bn-BD')}`}
              </span>
            </div>
          </div>

          {/* Quick Action Reminders and Transactions */}
          <div className="space-y-2 print:hidden">
            {/* Primary Entry Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onQuickAddTx('payment_received', customer.id)}
                className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs sm:text-sm shadow-xs transition active:scale-95 cursor-pointer"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>টাকা পেলাম</span>
              </button>

              <button
                onClick={() => onQuickAddTx('credit_given', customer.id)}
                className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs sm:text-sm shadow-xs transition active:scale-95 cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>বাকি দিলাম</span>
              </button>
            </div>

            {/* Utility Actions */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleWhatsAppReminder}
                className="flex items-center justify-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs transition cursor-pointer"
                title="হোয়াটসঅ্যাপে তাগাদা পাঠান"
              >
                <Send className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">তাগাদা পাঠান</span>
              </button>

              <button
                onClick={() => setIsStatementModalOpen(true)}
                className="flex items-center justify-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs transition cursor-pointer shadow-2xs"
                title="প্রফেশনাল লেজার স্টেটমেন্ট তৈরি ও PDF ডাউনলোড"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">লেজার PDF</span>
              </button>

              <button
                onClick={() => setIsQrModalOpen(true)}
                className="flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs transition cursor-pointer"
                title="কাস্টমারের কিউআর কোড দেখুন ও ডাউনলোড করুন"
              >
                <QrCode className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">QR কোড</span>
              </button>
            </div>
          </div>

          {/* Customer Private Internal Note Section (DSR Notes with Voice & Audio) */}
          <div className="bg-amber-50/60 border border-amber-200/90 rounded-2xl p-3 sm:p-4 print:hidden space-y-2.5 shadow-2xs">
            {/* Header with Title and Voice / Speaker Controls */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Bookmark className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      কাস্টমার ব্যক্তিগত নোট (Internal Notes)
                    </h4>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                      গোপনীয়
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    যেমন: শুক্রবারে পেমেন্ট দিতে চান, দোকানে ডেলিভারির সময় ইত্যাদি
                  </p>
                </div>
              </div>

              {/* Action Buttons: Voice Input & Read Aloud Audio */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Voice Input Button */}
                <button
                  type="button"
                  onClick={handleToggleVoiceNote}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ${
                    isListeningNote
                      ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400'
                      : 'bg-white hover:bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                  title={isListeningNote ? 'ভয়েস গ্রহণ থামাতে ক্লিক করুন' : 'মুখে বলে নোট লিখতে ক্লিক করুন'}
                >
                  {isListeningNote ? (
                    <>
                      <MicOff className="w-3.5 h-3.5" />
                      <span>শুনছি...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-amber-700" />
                      <span>ভয়েসে বলুন</span>
                    </>
                  )}
                </button>

                {/* Read Aloud (TTS) Button */}
                <button
                  type="button"
                  onClick={handleTogglePlayAudio}
                  disabled={!noteText.trim() && !isPlayingAudio}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ${
                    isPlayingAudio
                      ? 'bg-indigo-600 text-white animate-pulse ring-2 ring-indigo-400'
                      : !noteText.trim()
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      : 'bg-white hover:bg-indigo-50 text-indigo-900 border border-indigo-200'
                  }`}
                  title={
                    isPlayingAudio
                      ? 'পড়া থামাতে ক্লিক করুন'
                      : !noteText.trim()
                      ? 'পড়ে শুনানোর জন্য আগে নোট লিখুন'
                      : 'নোটটি বাংলায় পড়ে শুনুন'
                  }
                >
                  {isPlayingAudio ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>থামান</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>পড়ে শুনান</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Live voice status notification if active */}
            {noteVoiceStatus && (
              <div className="text-[11px] font-medium text-amber-900 bg-amber-100/80 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 border border-amber-200">
                <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                <span>{noteVoiceStatus}</span>
              </div>
            )}

            {/* Note Textarea */}
            <div className="relative">
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="কাস্টমার সম্পর্কে কোনো বিশেষ নির্দেশনা বা ব্যক্তিগত মন্তব্য লিখে রাখুন (যেমন: প্রতি শুক্রবার জুমা নামাজের পর টাকা দেন, সকালে ফোন দিতে হবে)..."
                rows={3}
                className="w-full px-3 py-2 text-xs sm:text-sm text-slate-800 bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-none transition shadow-2xs"
              />
            </div>

            {/* Quick Presets */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 block">
                সহজে যুক্ত করার অপশন:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_NOTE_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddPreset(preset)}
                    className="px-2 py-0.5 rounded-lg bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-medium transition cursor-pointer active:scale-95 shadow-2xs"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer with Save Button and Confirmation */}
            <div className="flex items-center justify-between pt-1 border-t border-amber-200/50">
              <div className="text-[10px] text-slate-400">
                {noteText.trim() ? `${noteText.trim().length} অক্ষর` : 'কোনো নোট নেই'}
              </div>

              <div className="flex items-center gap-2">
                {noteSavedFeedback && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 animate-fadeIn">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>সংরক্ষিত হয়েছে!</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleSaveNote}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>নোট সংরক্ষণ করুন</span>
                </button>
              </div>
            </div>
          </div>

          {/* Ledger Section */}
          <div>
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>লেনদেনের পূর্ণ খতিয়ান ও হিসাব</span>
              </h4>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsStatementModalOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer shadow-2xs"
                  title="স্টেটমেন্ট ফিল্টার ও PDF ডাউনলোড করুন"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>স্টেটমেন্ট PDF</span>
                </button>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  মোট: {customerTxs.length}টি
                </span>
              </div>
            </div>

            {customerTxs.length === 0 ? (
              <div className="border border-slate-200 rounded-2xl p-6 text-center text-slate-400 bg-slate-50/50 text-xs">
                এই কাস্টমারের এখনও কোনো লেনদেন নেই
              </div>
            ) : (
              <>
                {/* Mobile View: High-Density Responsive Card List (Never cut off!) */}
                <div className="space-y-2 sm:hidden">
                  {customerTxs.map(t => {
                    const isReceived = t.type === 'payment_received';
                    return (
                      <div 
                        key={t.id}
                        className={`p-3 rounded-xl border transition ${
                          isReceived ? 'bg-emerald-50/40 border-emerald-200/80' : 'bg-rose-50/40 border-rose-200/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-bold text-slate-500">
                                {new Date(t.date).toLocaleDateString('bn-BD')}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                                isReceived ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {formatBanglaTxType(t.type)}
                              </span>
                              {t.paymentMethod && (
                                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                  {formatBanglaPaymentMethod(t.paymentMethod)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-bold text-slate-900 mt-1">
                              {t.description}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-sm font-black block ${
                              isReceived ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                              {isReceived ? '-' : '+'} ৳{t.amount.toLocaleString('bn-BD')}
                            </span>
                          </div>
                        </div>

                        {/* Balance After Footer & Receipt Action */}
                        <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-medium">চলমান ব্যালেন্স:</span>
                            <span className="font-bold text-slate-800">
                              ৳{t.balanceAfter.toLocaleString('bn-BD')}
                            </span>
                          </div>

                          {onViewReceipt && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewReceipt(t, customer);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-[10px] transition cursor-pointer shadow-2xs"
                              title="রসিদ দেখুন ও WhatsApp-এ পাঠান"
                            >
                              <Receipt className="w-3 h-3 text-teal-600" />
                              <span>রসিদ</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tablet / Desktop View: Clean Scrollable Table */}
                <div className="hidden sm:block border border-slate-200 rounded-2xl overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[460px]">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3 whitespace-nowrap">তারিখ</th>
                        <th className="p-3">বিবরণ ও ধরন</th>
                        <th className="p-3 text-right whitespace-nowrap">টাকা (৳)</th>
                        <th className="p-3 text-right whitespace-nowrap">চলমান ব্যালেন্স</th>
                        <th className="p-3 text-center whitespace-nowrap">রসিদ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customerTxs.map(t => {
                        const isReceived = t.type === 'payment_received';
                        return (
                          <tr key={t.id} className="hover:bg-slate-50/70">
                            <td className="p-3 text-slate-500 whitespace-nowrap">
                              {new Date(t.date).toLocaleDateString('bn-BD')}
                            </td>
                            <td className="p-3">
                              <span className="font-semibold text-slate-800 block">
                                {t.description}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  isReceived ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {formatBanglaTxType(t.type)}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                  {formatBanglaPaymentMethod(t.paymentMethod)}
                                </span>
                              </div>
                            </td>
                            <td className={`p-3 text-right font-black whitespace-nowrap ${isReceived ? 'text-emerald-600' : 'text-red-600'}`}>
                              {isReceived ? '-' : '+'} ৳{t.amount.toLocaleString('bn-BD')}
                            </td>
                            <td className="p-3 text-right font-bold text-slate-700 whitespace-nowrap">
                              ৳{t.balanceAfter.toLocaleString('bn-BD')}
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              {onViewReceipt && (
                                <button
                                  onClick={() => onViewReceipt(t, customer)}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-[11px] font-bold transition cursor-pointer shadow-2xs"
                                  title="রসিদ দেখুন ও WhatsApp-এ পাঠান"
                                >
                                  <Receipt className="w-3 h-3 text-teal-600" />
                                  <span>রসিদ</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

        </div>

      </div>

      {/* Customer QR Code Generator & Card Modal */}
      {isQrModalOpen && (
        <CustomerQRCodeModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          customer={customer}
          shopUser={user}
        />
      )}

      {/* Professional Customer PDF Statement Modal */}
      {isStatementModalOpen && (
        <CustomerStatementModal
          isOpen={isStatementModalOpen}
          onClose={() => setIsStatementModalOpen(false)}
          customer={customer}
          transactions={transactions}
          user={user}
        />
      )}
    </div>
  );
};
