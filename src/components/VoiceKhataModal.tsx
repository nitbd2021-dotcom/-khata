import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  X, 
  Check, 
  Sparkles, 
  AlertCircle, 
  RefreshCw, 
  Edit3,
  ArrowRight,
  UserCheck,
  Coins,
  CheckCircle2,
  Volume2
} from 'lucide-react';
import { Customer, PaymentMethod, TransactionType, VoiceParseResult } from '../types';
import { BanglaSpeechRecognizer, parseVoiceCommand } from '../services/voiceService';
import { formatBanglaPaymentMethod, formatBanglaTxType } from '../services/googleSheetsService';

interface VoiceKhataModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onConfirmTransaction: (
    customerId: string,
    customerName: string,
    type: TransactionType,
    amount: number,
    description: string,
    paymentMethod?: PaymentMethod | string
  ) => void;
}

export const VoiceKhataModal: React.FC<VoiceKhataModalProps> = ({
  isOpen,
  onClose,
  customers,
  onConfirmTransaction,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedResult, setParsedResult] = useState<VoiceParseResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [customCustomer, setCustomCustomer] = useState<string>('');
  const [customCustomerName, setCustomCustomerName] = useState<string>('');
  const [customType, setCustomType] = useState<TransactionType>('credit_given');
  const [customPaymentMethod, setCustomPaymentMethod] = useState<PaymentMethod>('cash');
  const [errorMessage, setErrorMessage] = useState('');
  const [successSaved, setSuccessSaved] = useState(false);

  const recognizerRef = useRef<BanglaSpeechRecognizer | null>(null);
  const transcriptRef = useRef<string>('');

  useEffect(() => {
    if (isOpen) {
      recognizerRef.current = new BanglaSpeechRecognizer();
      setTranscript('');
      transcriptRef.current = '';
      setParsedResult(null);
      setIsEditing(false);
      setErrorMessage('');
      setSuccessSaved(false);
      setCustomAmount(0);
      setCustomPaymentMethod('cash');
      setCustomCustomer(customers[0]?.id || '');
      setCustomCustomerName(customers[0]?.name || 'নতুন কাস্টমার');
    } else {
      if (recognizerRef.current) {
        recognizerRef.current.stop();
      }
      setIsListening(false);
    }
  }, [isOpen, customers]);

  if (!isOpen) return null;

  const processVoiceText = (text: string) => {
    if (!text || !text.trim()) return;
    const result = parseVoiceCommand(text, customers);
    setParsedResult(result);
    setCustomAmount(result.amount);
    setCustomType(result.type);

    const lower = text.toLowerCase();
    if (lower.includes('বিকাশ') || lower.includes('bkash')) {
      setCustomPaymentMethod('bkash');
    } else if (lower.includes('ব্যাংক') || lower.includes('bank') || lower.includes('চেক')) {
      setCustomPaymentMethod('bank');
    } else if (lower.includes('নগদ') || lower.includes('cash')) {
      setCustomPaymentMethod('cash');
    }
    
    if (result.matchedCustomerId) {
      setCustomCustomer(result.matchedCustomerId);
      const c = customers.find(item => item.id === result.matchedCustomerId);
      setCustomCustomerName(c ? c.name : result.customerName);
    } else {
      setCustomCustomer('');
      setCustomCustomerName(result.customerName || (customers[0]?.name ?? 'কাস্টমার'));
    }
  };

  const startListening = () => {
    setErrorMessage('');
    setTranscript('');
    transcriptRef.current = '';
    setParsedResult(null);
    setIsListening(true);
    setSuccessSaved(false);

    if (!recognizerRef.current?.isSupported) {
      setIsListening(false);
      setErrorMessage('আপনার ব্রাউজারে সরাসরি মাইক্রোফোন সাপোর্ট নেই বা অনুমতি দেওয়া হয়নি। নিচের যেকোনো নমুনা বাটনে ক্লিক করে সহজেই টেস্ট করতে পারেন।');
      return;
    }

    recognizerRef.current.start(
      (text: string, isFinal: boolean) => {
        transcriptRef.current = text;
        setTranscript(text);
        // Live parsing as speech is recognized
        processVoiceText(text);
        if (isFinal) {
          setIsListening(false);
        }
      },
      (err: any) => {
        setIsListening(false);
        setErrorMessage('মাইক্রোফোনে কথা স্পষ্টভাবে বোঝা যায়নি। দয়া করে আবার চেষ্টা করুন বা নমুনা ক্লিক করুন।');
        console.warn('Voice recognition error:', err);
      },
      (lastTranscript: string) => {
        setIsListening(false);
        const finalRecorded = lastTranscript || transcriptRef.current;
        if (finalRecorded) {
          processVoiceText(finalRecorded);
        }
      }
    );
  };

  const stopListening = () => {
    if (recognizerRef.current) {
      recognizerRef.current.stop();
    }
    setIsListening(false);
    const recorded = transcriptRef.current || transcript;
    if (recorded) {
      processVoiceText(recorded);
    }
  };

  const handleSampleClick = (sampleText: string) => {
    transcriptRef.current = sampleText;
    setTranscript(sampleText);
    setErrorMessage('');
    processVoiceText(sampleText);
  };

  const handleConfirm = () => {
    const finalAmount = customAmount > 0 ? customAmount : (parsedResult?.amount || 0);
    const finalType = customType;
    let finalCustomerId = customCustomer;
    let finalCustomerName = customCustomerName;

    if (finalCustomerId) {
      const match = customers.find(c => c.id === finalCustomerId);
      if (match) {
        finalCustomerName = match.name;
      }
    }

    if (!finalCustomerName) {
      finalCustomerName = parsedResult?.customerName || (customers[0]?.name ?? 'সাধারণ কাস্টমার');
    }

    if (finalAmount <= 0) {
      setErrorMessage('দয়া করে টাকার পরিমাণ লিখুন (যেমন: ৫০০)');
      setIsEditing(true);
      return;
    }

    setSuccessSaved(true);
    onConfirmTransaction(
      finalCustomerId,
      finalCustomerName,
      finalType,
      finalAmount,
      `ভয়েস এন্ট্রি: "${transcript || parsedResult?.rawText || 'কথা বলে এন্ট্রি'}"`,
      customPaymentMethod
    );

    setTimeout(() => {
      onClose();
    }, 400);
  };

  const activeAmount = customAmount > 0 ? customAmount : (parsedResult?.amount || 0);
  const isReadyToSave = activeAmount > 0 && (Boolean(customCustomer) || Boolean(customCustomerName));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
              isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-600 text-white'
            }`}>
              {isListening ? <Mic className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">ভয়েস খাতা (বাংলা)</h3>
                {isListening ? (
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                    শুনছি...
                  </span>
                ) : parsedResult ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    রেডি
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500">কথা বলে সঙ্গে সঙ্গে লেনদেন রেকর্ড ও সেভ করুন</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-center">
          
          {/* Pulsing Mic Button & Waveform Area */}
          <div className="flex flex-col items-center justify-center py-2 bg-gradient-to-b from-slate-50 to-white rounded-2xl p-4 border border-slate-100">
            <div className="relative flex items-center justify-center">
              {isListening && (
                <>
                  <div className="absolute w-28 h-28 rounded-full bg-red-400/20 animate-ping"></div>
                  <div className="absolute w-24 h-24 rounded-full bg-red-400/30 animate-pulse"></div>
                </>
              )}

              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`relative z-10 w-20 h-20 sm:w-22 sm:h-22 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
                  isListening
                    ? 'bg-red-500 text-white shadow-red-300 ring-4 ring-red-200 scale-105'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105 shadow-emerald-200'
                }`}
                title={isListening ? 'রেকর্ডিং বন্ধ করতে চাপুন' : 'কথা বলা শুরু করতে চাপুন'}
              >
                {isListening ? (
                  <MicOff className="w-9 h-9" />
                ) : (
                  <Mic className="w-9 h-9" />
                )}
              </button>
            </div>

            {/* Audio wave indicator when listening */}
            {isListening ? (
              <div className="flex items-center gap-1 mt-3 h-5">
                <div className="w-1 bg-red-500 h-3 animate-bounce rounded-full"></div>
                <div className="w-1 bg-red-500 h-5 animate-pulse rounded-full"></div>
                <div className="w-1 bg-red-500 h-4 animate-bounce rounded-full delay-75"></div>
                <div className="w-1 bg-red-500 h-6 animate-pulse rounded-full"></div>
                <div className="w-1 bg-red-500 h-3 animate-bounce rounded-full delay-100"></div>
                <span className="text-xs font-bold text-red-600 ml-2">কথা বলুন... শেষ হলে এখানে চাপুন</span>
              </div>
            ) : (
              <div className="mt-3">
                <span className="text-xs sm:text-sm font-bold text-slate-800 block">
                  {transcript ? 'আবার বলতে মাইক্রোফোনে চাপুন' : 'মাইক্রোফোনে চাপ দিয়ে কথা বলুন'}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  যেমন: "রহিম ৫০০ টাকা বাকি নিল" বা "করিম ১০০০ টাকা পরিশোধ করল"
                </span>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 text-amber-900 text-xs border border-amber-200 text-left">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Real-time speech transcript */}
          {transcript && (
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-slate-500" />
                  আপনার মুখের কথা:
                </span>
                <button
                  type="button"
                  onClick={startListening}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>পুনরায় বলুন</span>
                </button>
              </div>
              <p className="text-sm sm:text-base font-semibold text-slate-800 italic">
                "{transcript}"
              </p>
            </div>
          )}

          {/* Core Transaction Confirmation & Direct Save Box */}
          {(parsedResult || transcript) && (
            <div className="bg-gradient-to-b from-emerald-50/90 to-teal-50/60 rounded-2xl p-4 sm:p-5 border-2 border-emerald-300 text-left space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-950">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>লেনদেনের তথ্য ও সেভ নিশ্চিতকরণ</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs font-bold text-emerald-800 bg-white/80 hover:bg-white px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isEditing ? 'প্রিভিউ' : 'এডিট/সংশোধন'}</span>
                </button>
              </div>

              {/* View / Edit Mode Form */}
              {!isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white rounded-xl p-3 border border-emerald-200 shadow-2xs text-left">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">কাস্টমার</span>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {(parsedResult?.customerCode || (customCustomer && customers.find(c => c.id === customCustomer)?.code)) && (
                        <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-mono font-black text-[10px] shrink-0 border border-indigo-200">
                          {parsedResult?.customerCode || customers.find(c => c.id === customCustomer)?.code}
                        </span>
                      )}
                      <span className="text-xs sm:text-sm font-black text-slate-900 truncate block">
                        {customCustomerName || parsedResult?.customerName || 'অজ্ঞাত কাস্টমার'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">লেনদেনের ধরন</span>
                    <span className={`text-xs sm:text-sm font-black block mt-0.5 ${
                      customType === 'payment_received' ? 'text-emerald-700' : 'text-red-600'
                    }`}>
                      {customType === 'payment_received' ? 'টাকা পেলাম (জমা)' : 'বাকি দিলাম'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">টাকার পরিমাণ</span>
                    <span className="text-sm sm:text-base font-black text-slate-900 block mt-0.5">
                      {activeAmount > 0 ? `৳${activeAmount.toLocaleString('bn-BD')}` : (
                        <span className="text-red-500 font-bold text-xs">লিখুন</span>
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 bg-white rounded-xl p-3.5 border border-emerald-200 shadow-2xs text-left">
                  {/* Customer field */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">কাস্টমার সিলেক্ট করুন বা নাম লিখুন</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        value={customCustomer}
                        onChange={e => {
                          setCustomCustomer(e.target.value);
                          const c = customers.find(item => item.id === e.target.value);
                          if (c) setCustomCustomerName(c.name);
                        }}
                        className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                      >
                        <option value="">-- তালিকা থেকে নির্বাচন করুন --</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.code ? `[${c.code}] ` : ''}{c.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={customCustomerName}
                        onChange={e => {
                          setCustomCustomerName(e.target.value);
                          setCustomCustomer('');
                        }}
                        placeholder="বা নতুন নাম লিখুন..."
                        className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Type buttons */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">লেনদেনের ধরন</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCustomType('credit_given')}
                        className={`py-2 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          customType === 'credit_given'
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                        }`}
                      >
                        বাকি দিলাম
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomType('payment_received')}
                        className={`py-2 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          customType === 'payment_received'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        টাকা পেলাম (জমা)
                      </button>
                    </div>
                  </div>

                  {/* Amount field */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">টাকার পরিমাণ (৳)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">৳</span>
                      <input
                        type="number"
                        min="1"
                        value={customAmount || ''}
                        onChange={e => setCustomAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder="টাকার পরিমাণ লিখুন..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* If amount is 0, give inline prompt */}
              {activeAmount <= 0 && (
                <div className="bg-amber-100/70 p-2.5 rounded-xl border border-amber-300 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-900">টাকার পরিমাণ পাওয়া যায়নি, দয়া করে লিখুন:</span>
                  <div className="relative w-28">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">৳</span>
                    <input
                      type="number"
                      min="1"
                      value={customAmount || ''}
                      onChange={e => setCustomAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="৫০০"
                      className="w-full bg-white border border-amber-400 rounded-lg pl-6 pr-2 py-1 text-xs font-black"
                    />
                  </div>
                </div>
              )}

              {/* PRIMARY PROMINENT SAVE ACTION RIGHT IN THE RESULT CARD */}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={activeAmount <= 0}
                className={`w-full py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer ${
                  activeAmount > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 ring-2 ring-emerald-400/40'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Check className="w-5 h-5" />
                <span>
                  {activeAmount > 0
                    ? `✓ নিশ্চিত ও সেভ করুন (৳${activeAmount.toLocaleString('bn-BD')})`
                    : 'টাকার পরিমাণ লিখে সেভ করুন'}
                </span>
              </button>
            </div>
          )}

          {/* Quick Voice Demo Buttons for Instant 1-Click Testing */}
          <div className="text-left bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              নমুনা কণ্ঠ (আইডি ও নাম টেস্ট করতে ১-ক্লিকে ট্রাই করুন):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {[
                'A1111 কে ৫০০ বাকি',
                'রাজু A1111 কে ৫০০ বাকি',
                'A1001 রহিম ১০০০ টাকা দিল',
                'রহিম ৫০০ টাকা বাকি নিল',
                'A1002 করিম ৮০০ টাকা পরিশোধ করল',
                'মো: সোহেল রানা ১২০০ টাকা বাকি নিল'
              ].map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSampleClick(sample)}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-emerald-50 hover:text-emerald-900 text-slate-700 text-xs font-medium transition cursor-pointer border border-slate-200 text-left truncate flex items-center justify-between"
                >
                  <span className="truncate">"{sample}"</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* ALWAYS-VISIBLE STICKY FOOTER ACTIONS */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50/95 backdrop-blur-xs flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            বাতিল
          </button>

          <div className="flex items-center gap-2">
            {transcript && (
              <button
                type="button"
                onClick={() => {
                  setTranscript('');
                  transcriptRef.current = '';
                  setParsedResult(null);
                  startListening();
                }}
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold rounded-xl border border-slate-200 transition cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">আবার বলুন</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleConfirm}
              disabled={activeAmount <= 0}
              className={`px-5 py-2.5 text-xs sm:text-sm font-black rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer ${
                activeAmount > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25 ring-2 ring-emerald-500/20'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {activeAmount > 0
                  ? `ঠিক আছে, সেভ করুন (৳${activeAmount.toLocaleString('bn-BD')})`
                  : 'ঠিক আছে, সেভ করুন'}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
