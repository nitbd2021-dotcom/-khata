import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Check, 
  UserPlus, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Delete, 
  Calendar,
  AlertCircle,
  Smartphone,
  Mic,
  MicOff,
  MapPin,
  Calculator,
  Boxes,
  CheckCircle2,
  Package,
  Plus
} from 'lucide-react';
import { Customer, PaymentMethod, TransactionType, User, TransactionItemDetail } from '../types';
import { formatBanglaTxType } from '../services/googleSheetsService';
import { generateId, StorageService } from '../services/storageService';
import { 
  BanglaSpeechRecognizer, 
  parseCustomerVoiceInput, 
  parseSpokenPhoneNumber 
} from '../services/voiceService';
import { 
  isNativeContactPickerSupported, 
  pickSingleContactFromPhone 
} from '../services/phoneContactsService';
import { FloatingCalculator } from './FloatingCalculator';
import { PhoneContactImportModal } from './PhoneContactImportModal';
import { ProductPickerModal } from './ProductPickerModal';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  customers: Customer[];
  initialType?: TransactionType;
  initialCustomerId?: string;
  onSave: (
    customerId: string,
    type: TransactionType,
    amount: number,
    description: string,
    date?: string,
    paymentMethod?: PaymentMethod | string,
    items?: TransactionItemDetail[]
  ) => void;
  onAddCustomer: (newCustomer: Customer) => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  user,
  customers,
  initialType = 'payment_received',
  initialCustomerId,
  onSave,
  onAddCustomer,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || '');
  const [amountStr, setAmountStr] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Selected Inventory Products
  const [selectedProducts, setSelectedProducts] = useState<TransactionItemDetail[]>([]);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);

  // New Customer creation state
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPhoneContactModalOpen, setIsPhoneContactModalOpen] = useState(false);
  const [phoneSuccessMsg, setPhoneSuccessMsg] = useState('');

  // Handle Pick Phone Contact
  const handlePickPhoneContact = async () => {
    if (isNativeContactPickerSupported()) {
      try {
        const contact = await pickSingleContactFromPhone();
        if (contact) {
          if (contact.name) setNewCustName(contact.name);
          if (contact.phone) setNewCustPhone(contact.phone);
          if (contact.address) setNewCustAddress(contact.address);
          setPhoneSuccessMsg(`ফোনবুক থেকে "${contact.name || contact.phone}" সফলভাবে লোড হয়েছে!`);
          setTimeout(() => setPhoneSuccessMsg(''), 4000);
        }
      } catch (err: any) {
        console.warn('Phone contact picker error:', err);
        setIsPhoneContactModalOpen(true);
      }
    } else {
      setIsPhoneContactModalOpen(true);
    }
  };

  // Built-in Floating Calculator State
  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(false);

  // Voice Recognition states
  type VoiceTarget = 'description' | 'customerName' | 'customerPhone' | 'customerAddress' | 'customerCombined' | null;
  const [activeVoiceTarget, setActiveVoiceTarget] = useState<VoiceTarget>(null);
  const [voiceInterim, setVoiceInterim] = useState('');
  const recognizerRef = useRef<BanglaSpeechRecognizer | null>(null);

  const stopVoiceRecognition = () => {
    if (recognizerRef.current) {
      recognizerRef.current.stop();
      recognizerRef.current = null;
    }
    setActiveVoiceTarget(null);
    setVoiceInterim('');
  };

  const startVoiceRecognition = (target: 'description' | 'customerName' | 'customerPhone' | 'customerAddress' | 'customerCombined') => {
    if (activeVoiceTarget === target) {
      stopVoiceRecognition();
      return;
    }

    if (recognizerRef.current) {
      recognizerRef.current.stop();
    }

    const recognizer = new BanglaSpeechRecognizer();
    if (!recognizer.isSupported) {
      setErrorMsg('আপনার ব্রাউজারে ভয়েস রিকগনিশন সাপোর্ট করে না। অনুগ্রহ করে Google Chrome বা আধুনিক ব্রাউজার ব্যবহার করুন।');
      return;
    }

    recognizerRef.current = recognizer;
    setActiveVoiceTarget(target);
    setVoiceInterim('');
    setErrorMsg('');

    const handleSpeechResult = (text: string, isFinal: boolean) => {
      setVoiceInterim(text);
      if (!text) return;

      if (target === 'description') {
        setDescription(text);
      } else if (target === 'customerName') {
        const cleaned = text.replace(/^(কাস্টমারের নাম|নাম|নতুন কাস্টমার)/i, '').trim();
        setNewCustName(cleaned || text);
      } else if (target === 'customerPhone') {
        const phone = parseSpokenPhoneNumber(text);
        if (phone) {
          setNewCustPhone(phone);
        }
      } else if (target === 'customerAddress') {
        const cleaned = text.replace(/^(কাস্টমারের ঠিকানা|ঠিকানা|বাসা|দোকান)/i, '').trim();
        setNewCustAddress(cleaned || text);
      } else if (target === 'customerCombined') {
        const parsed = parseCustomerVoiceInput(text);
        if (parsed.name) setNewCustName(parsed.name);
        if (parsed.phone) setNewCustPhone(parsed.phone);
        if (parsed.address) setNewCustAddress(parsed.address);
      }

      if (isFinal) {
        setTimeout(() => {
          stopVoiceRecognition();
        }, 800);
      }
    };

    recognizer.start(
      (transcript, isFinal) => {
        handleSpeechResult(transcript, isFinal);
      },
      (err) => {
        console.warn('Speech recognition error:', err);
        stopVoiceRecognition();
      },
      (finalTranscript) => {
        if (finalTranscript) {
          handleSpeechResult(finalTranscript, true);
        }
        stopVoiceRecognition();
      }
    );
  };

  // Stop voice recognition when modal closes or unmounts
  useEffect(() => {
    if (!isOpen) {
      stopVoiceRecognition();
    }
    return () => {
      stopVoiceRecognition();
    };
  }, [isOpen]);

  useEffect(() => {
    if (initialType) setType(initialType);
    if (initialCustomerId === 'NEW_CUSTOMER') {
      setIsCreatingCustomer(true);
      setSelectedCustomerId('');
    } else if (initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
      setIsCreatingCustomer(false);
    } else if (customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [initialType, initialCustomerId, customers]);

  if (!isOpen) return null;

  const handleKeypadPress = (val: string) => {
    if (val === 'backspace') {
      setAmountStr(prev => prev.slice(0, -1));
    } else if (val === '.') {
      if (!amountStr.includes('.')) {
        setAmountStr(prev => (prev === '' ? '0.' : prev + '.'));
      }
    } else {
      if (amountStr === '0') {
        setAmountStr(val);
      } else {
        setAmountStr(prev => prev + val);
      }
    }
  };

  const handleQuickAdd = (addVal: number) => {
    const current = parseFloat(amountStr) || 0;
    setAmountStr((current + addVal).toString());
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const amount = parseFloat(amountStr) || 0;

  // Calculate predicted new balance
  let projectedBalance = selectedCustomer ? selectedCustomer.netBalance : 0;
  if (selectedCustomer && amount > 0) {
    if (type === 'credit_given' || type === 'loan_given') {
      projectedBalance = selectedCustomer.netBalance + amount;
    } else if (type === 'payment_received') {
      projectedBalance = selectedCustomer.netBalance - amount;
    } else if (type === 'credit_taken' || type === 'loan_taken') {
      projectedBalance = selectedCustomer.netBalance - amount;
    } else if (type === 'payment_given') {
      projectedBalance = selectedCustomer.netBalance + amount;
    }
  }

  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      setErrorMsg('কাস্টমারের নাম লিখুন');
      return;
    }

    const newCust: Customer = {
      id: generateId(),
      code: StorageService.generateNextCustomerCode(customers),
      userId: user.id,
      name: newCustName.trim(),
      phone: newCustPhone.trim() || '০১৭...',
      address: newCustAddress.trim(),
      totalReceivable: 0,
      totalPayable: 0,
      netBalance: 0,
      lastTransactionAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    onAddCustomer(newCust);
    setSelectedCustomerId(newCust.id);
    setIsCreatingCustomer(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
    setErrorMsg('');
  };

    const handleConfirmProducts = (items: TransactionItemDetail[]) => {
    setSelectedProducts(items);
    if (items.length > 0) {
      const sum = items.reduce((s, i) => s + i.totalPrice, 0);
      setAmountStr(String(sum));

      const summaryText = items.map(i => `${i.itemName} (${i.quantity} ${i.unit} x ৳${i.unitPrice})`).join(', ');
      if (!description.trim() || description.includes('x ৳')) {
        setDescription(summaryText);
      }
    }
  };

  const handleRemoveProductItem = (itemId: string) => {
    const updated = selectedProducts.filter(p => p.itemId !== itemId);
    setSelectedProducts(updated);
    if (updated.length > 0) {
      const sum = updated.reduce((s, i) => s + i.totalPrice, 0);
      setAmountStr(String(sum));
      const summaryText = updated.map(i => `${i.itemName} (${i.quantity} ${i.unit} x ৳${i.unitPrice})`).join(', ');
      setDescription(summaryText);
    } else {
      setAmountStr('');
      setDescription('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setErrorMsg('অনুগ্রহ করে একজন কাস্টমার নির্বাচন করুন');
      return;
    }
    if (amount <= 0) {
      setErrorMsg('টাকার সঠিক পরিমাণ লিখুন');
      return;
    }

    onSave(
      selectedCustomerId,
      type,
      amount,
      description,
      new Date(date).toISOString(),
      paymentMethod,
      selectedProducts.length > 0 ? selectedProducts : undefined
    );

    // Reset & close
    setAmountStr('');
    setPaymentMethod('cash');
    setDescription('');
    setSelectedProducts([]);
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[96vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              হিসাব লিখুন
            </h3>
            <p className="text-xs text-slate-500">
              {formatBanglaTxType(type)} • গুগল শিটে অটো সিঙ্ক হবে
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Transaction Type Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              লেনদেনের ধরন নির্বাচন করুন
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('payment_received')}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border cursor-pointer ${
                  type === 'payment_received'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>টাকা পেলাম</span>
              </button>

              <button
                type="button"
                onClick={() => setType('credit_given')}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border cursor-pointer ${
                  type === 'credit_given'
                    ? 'bg-red-600 text-white border-red-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>বাকি দিলাম</span>
              </button>

              <button
                type="button"
                onClick={() => setType('credit_taken')}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border cursor-pointer ${
                  type === 'credit_taken'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>বাকি নিলাম</span>
              </button>

              <button
                type="button"
                onClick={() => setType('loan_given')}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border cursor-pointer ${
                  type === 'loan_given'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>ধার দিলাম</span>
              </button>

              <button
                type="button"
                onClick={() => setType('loan_taken')}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border cursor-pointer ${
                  type === 'loan_taken'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>ধার পেলাম</span>
              </button>

              <button
                type="button"
                onClick={() => setType('payment_given')}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border cursor-pointer ${
                  type === 'payment_given'
                    ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>টাকা দিলাম</span>
              </button>
            </div>
          </div>

          {/* Customer Selection or Create Customer */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                কাস্টমার
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingCustomer(!isCreatingCustomer)}
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isCreatingCustomer ? 'তালিকায় ফিরে যান' : '+ নতুন কাস্টমার'}</span>
              </button>
            </div>

            {isCreatingCustomer ? (
              <div className="p-3.5 bg-gradient-to-b from-emerald-50/80 to-slate-50/90 rounded-2xl border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs">
                  <span className="font-semibold">নির্ধারিত ইউনিক আইডি:</span>
                  <span className="font-mono font-black text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200 shadow-2xs">
                    {StorageService.generateNextCustomerCode(customers)}
                  </span>
                </div>

                {/* 1. Phone Contacts Import Option (DSR Phonebook integration) */}
                <div className="bg-gradient-to-r from-indigo-50 to-white p-2.5 rounded-xl border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">ফোনে থাকা নাম্বার থেকে কাস্টমার</span>
                      <span className="text-[10px] text-slate-500 block">DSR-এর ফোনের সেভ কন্ট্যাক্টস বা কল লগ</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handlePickPhoneContact}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs active:scale-95"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-indigo-200" />
                    <span>ফোনবুক থেকে নিন</span>
                  </button>
                </div>

                {phoneSuccessMsg && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-1.5 animate-fadeIn">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{phoneSuccessMsg}</span>
                  </div>
                )}

                {/* Combined Smart Voice Button */}
                <div className="bg-white p-2.5 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">ভয়েসে কাস্টমার এন্ট্রি</span>
                      <span className="text-[10px] text-slate-500 block">নাম ও মোবাইল নম্বর মুখে বলুন</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => startVoiceRecognition('customerCombined')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                      activeVoiceTarget === 'customerCombined'
                        ? 'bg-red-500 text-white animate-pulse shadow-xs ring-2 ring-red-400/40'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>
                      {activeVoiceTarget === 'customerCombined' ? 'শুনছি... (থামান)' : 'একসাথে নাম ও ফোন বলুন'}
                    </span>
                  </button>
                </div>

                {/* Combined Voice Feedback Bar */}
                {activeVoiceTarget === 'customerCombined' && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
                      <div>
                        <span className="font-bold block">শুনছি: নাম ও ফোন বলুন</span>
                        <span className="text-[11px] text-slate-700 font-semibold italic">
                          {voiceInterim ? `"${voiceInterim}"` : 'যেমন: "করিম স্টোর শূন্য এক আট এক..."'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={stopVoiceRecognition}
                      className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-red-700"
                    >
                      থামান
                    </button>
                  </div>
                )}

                {/* Customer Name Input with Voice Button */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span>কাস্টমারের নাম</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => startVoiceRecognition('customerName')}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold transition cursor-pointer ${
                        activeVoiceTarget === 'customerName'
                          ? 'bg-red-500 text-white animate-pulse shadow-2xs'
                          : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-300'
                      }`}
                      title="ভয়েসে কাস্টমারের নাম বলুন"
                    >
                      <Mic className="w-3 h-3" />
                      <span>{activeVoiceTarget === 'customerName' ? 'শুনছি... (থামান)' : 'ভয়েসে নাম বলুন'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="কাস্টমারের নাম (যেমন: রহিম মিয়া)"
                      value={newCustName}
                      onChange={e => setNewCustName(e.target.value)}
                      className={`w-full bg-white border rounded-xl pl-3 pr-9 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition ${
                        activeVoiceTarget === 'customerName'
                          ? 'border-red-400 ring-2 ring-red-400/30 bg-red-50/10'
                          : 'border-slate-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => startVoiceRecognition('customerName')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600"
                      title="ভয়েসে নাম বলুন"
                    >
                      <Mic className={`w-4 h-4 ${activeVoiceTarget === 'customerName' ? 'text-red-500 animate-pulse' : ''}`} />
                    </button>
                  </div>
                  {activeVoiceTarget === 'customerName' && (
                    <div className="mt-1 text-[11px] font-semibold text-red-600 flex items-center gap-1 bg-red-50 p-1.5 rounded-lg border border-red-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                      <span>{voiceInterim ? `শুনছি: "${voiceInterim}"` : 'কথা বলুন... কাস্টমারের নাম বলুন'}</span>
                    </div>
                  )}
                </div>

                {/* Customer Phone Input with Voice Button */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span>মোবাইল নম্বর</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => startVoiceRecognition('customerPhone')}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold transition cursor-pointer ${
                        activeVoiceTarget === 'customerPhone'
                          ? 'bg-red-500 text-white animate-pulse shadow-2xs'
                          : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-300'
                      }`}
                      title="ভয়েসে মোবাইল নম্বর বলুন"
                    >
                      <Mic className="w-3 h-3" />
                      <span>{activeVoiceTarget === 'customerPhone' ? 'শুনছি... (থামান)' : 'ভয়েসে নম্বর বলুন'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="মোবাইল নম্বর (যেমন: 01812345678)"
                      value={newCustPhone}
                      onChange={e => setNewCustPhone(e.target.value)}
                      className={`w-full bg-white border rounded-xl pl-3 pr-9 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition ${
                        activeVoiceTarget === 'customerPhone'
                          ? 'border-red-400 ring-2 ring-red-400/30 bg-red-50/10'
                          : 'border-slate-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => startVoiceRecognition('customerPhone')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600"
                      title="ভয়েসে মোবাইল নম্বর বলুন"
                    >
                      <Mic className={`w-4 h-4 ${activeVoiceTarget === 'customerPhone' ? 'text-red-500 animate-pulse' : ''}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                    <span>মুখে 'শূন্য এক আট...' বা নম্বরে বলতে পারেন</span>
                    {activeVoiceTarget === 'customerPhone' && (
                      <span className="text-red-600 font-bold flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                        {voiceInterim ? `শুনছি: ${voiceInterim}` : 'নম্বর বলুন...'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Customer Address Input with Voice Button */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>ঠিকানা</span>
                      <span className="text-slate-400 text-[10px] font-normal">(ঐচ্ছিক)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => startVoiceRecognition('customerAddress')}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold transition cursor-pointer ${
                        activeVoiceTarget === 'customerAddress'
                          ? 'bg-red-500 text-white animate-pulse shadow-2xs'
                          : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-300'
                      }`}
                      title="ভয়েসে ঠিকানা বলুন"
                    >
                      <Mic className="w-3 h-3" />
                      <span>{activeVoiceTarget === 'customerAddress' ? 'শুনছি... (থামান)' : 'ভয়েসে ঠিকানা বলুন'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="ঠিকানা (যেমন: চকবাজার, দোকান নং ৫ বা বাসা/এলাকা)"
                      value={newCustAddress}
                      onChange={e => setNewCustAddress(e.target.value)}
                      className={`w-full bg-white border rounded-xl pl-3 pr-9 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition ${
                        activeVoiceTarget === 'customerAddress'
                          ? 'border-red-400 ring-2 ring-red-400/30 bg-red-50/10'
                          : 'border-slate-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => startVoiceRecognition('customerAddress')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600"
                      title="ভয়েসে ঠিকানা বলুন"
                    >
                      <Mic className={`w-4 h-4 ${activeVoiceTarget === 'customerAddress' ? 'text-red-500 animate-pulse' : ''}`} />
                    </button>
                  </div>
                  {activeVoiceTarget === 'customerAddress' && (
                    <div className="mt-1 text-[11px] font-semibold text-red-600 flex items-center gap-1 bg-red-50 p-1.5 rounded-lg border border-red-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                      <span>{voiceInterim ? `শুনছি: "${voiceInterim}"` : 'কথা বলুন... কাস্টমারের ঠিকানা বলুন'}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-100">
                  <button
                    type="button"
                    onClick={() => setIsCreatingCustomer(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateCustomerSubmit}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>কাস্টমার সেভ করুন</span>
                  </button>
                </div>
              </div>
            ) : (
              <select
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">-- কাস্টমার নির্বাচন করুন --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code ? `[${c.code}] ` : ''}{c.name} {c.phone ? `(${c.phone})` : ''} - বর্তমান ব্যালেন্স: ৳{c.netBalance}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Product Inventory Stock Selector (For Credit Sales & Products) */}
          {(type === 'credit_given' || type === 'sale' || type === 'loan_given') && (
            <div className="bg-emerald-50/50 border border-emerald-200/90 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-emerald-700" />
                  <span className="text-xs font-bold text-slate-800">
                    স্টক থেকে পণ্য নির্বাচন
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                    অটো স্টক কর্তন
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsProductPickerOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{selectedProducts.length > 0 ? 'পণ্য পরিবর্তন (+)' : 'স্টক থেকে পণ্য যোগ'}</span>
                </button>
              </div>

              {selectedProducts.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-semibold text-slate-500 flex justify-between px-1">
                    <span>নির্বাচিত পণ্যসমূহ ({selectedProducts.length} টি)</span>
                    <span className="text-emerald-700 font-bold">মোট: ৳{selectedProducts.reduce((s, p) => s + p.totalPrice, 0).toLocaleString('bn-BD')}</span>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden text-xs">
                    {selectedProducts.map((p, idx) => (
                      <div key={p.itemId + idx} className="p-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-slate-800 block truncate">{p.itemName}</span>
                          <span className="text-[11px] text-slate-500">
                            {p.quantity} {p.unit} x ৳{p.unitPrice}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-emerald-700 whitespace-nowrap">
                            = ৳{p.totalPrice.toLocaleString('bn-BD')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveProductItem(p.itemId)}
                            className="w-5 h-5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center transition cursor-pointer"
                            title="বাদ দিন"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] text-emerald-700 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>লেনদেন সেভ করলে উক্ত পণ্যগুলো আপনার ইনভেন্টরি স্টক থেকে বাদ যাবে।</span>
                  </p>
                </div>
              ) : (
                <div 
                  onClick={() => setIsProductPickerOpen(true)}
                  className="p-2.5 rounded-xl border border-dashed border-emerald-300 bg-white hover:bg-emerald-50/50 flex items-center justify-between text-xs text-slate-600 cursor-pointer transition"
                >
                  <span className="text-[11px] text-slate-500">
                    বাকি বিক্রির মালামাল স্টক থেকে স্বয়ংক্রিয়ভাবে কমাতে পণ্য বাছুন...
                  </span>
                  <span className="text-emerald-700 font-bold whitespace-nowrap ml-2 text-xs">
                    + পণ্য বাছুন
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Large Amount Display */}
          <div className="bg-slate-900 rounded-2xl p-4 text-center text-white shadow-inner relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400 font-medium">
                টাকার পরিমাণ (৳)
              </span>
              <button
                type="button"
                onClick={() => setIsCalculatorOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 text-xs font-bold transition cursor-pointer active:scale-95"
                title="ক্যালকুলেটর দিয়ে হিসাব করুন"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>ক্যালকুলেটর</span>
              </button>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-emerald-400">
              ৳ {amountStr ? parseFloat(amountStr).toLocaleString('bn-BD') : '০'}
            </div>

            {/* Projected Balance Notice */}
            {selectedCustomer && (
              <div className="mt-2 text-xs text-slate-300 flex items-center justify-center gap-2">
                <span>পূর্বের বকেয়া: ৳{selectedCustomer.netBalance}</span>
                <span>➔</span>
                <span className="font-bold text-white">
                  পরবর্তী ব্যালেন্স: ৳{projectedBalance}
                </span>
              </div>
            )}
          </div>

          {/* Warning Banner if Customer Credit Limit will be exceeded */}
          {selectedCustomer && (type === 'credit_given' || type === 'loan_given') && (() => {
            const hasCustLimit = typeof selectedCustomer.creditLimit === 'number' && selectedCustomer.creditLimit > 0;
            const lim = hasCustLimit ? selectedCustomer.creditLimit! : (user.dueThreshold ?? 2500);
            if (projectedBalance > lim) {
              const diff = projectedBalance - lim;
              return (
                <div className="p-3 bg-red-50 border border-red-300 rounded-2xl flex items-center justify-between gap-2 text-red-900 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-red-500 text-white font-bold shrink-0">⚠️</span>
                    <div>
                      <span className="font-black block text-red-800">বাকির সর্বোচ্চ সীমা অতিক্রান্ত হবে!</span>
                      <span className="text-[11px] text-red-700">
                        নির্ধারিত সীমা: ৳{lim.toLocaleString('bn-BD')} {hasCustLimit ? '(মডারেটর নির্ধারিত)' : ''}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-red-600 text-white font-black text-xs shrink-0 whitespace-nowrap">
                    +৳{diff.toLocaleString('bn-BD')} অতিরিক্ত
                  </span>
                </div>
              );
            }
            return null;
          })()}

          {/* Quick Amount Suggestion Buttons */}
          <div className="flex items-center gap-1.5 justify-center overflow-x-auto">
            {[100, 500, 1000, 2000, 5000].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => handleQuickAdd(val)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                +৳{val}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAmountStr('')}
              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              রিসেট
            </button>
          </div>

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map(key => (
              <button
                key={key}
                type="button"
                onClick={() => handleKeypadPress(key)}
                className="h-11 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 text-lg font-bold transition flex items-center justify-center border border-slate-200/80 shadow-2xs cursor-pointer"
              >
                {key === 'backspace' ? <Delete className="w-5 h-5 text-slate-500" /> : key}
              </button>
            ))}
          </div>

          {/* Description and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="tx-description" className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                  বিবরণ (ঐচ্ছিক)
                </label>
                <button
                  type="button"
                  onClick={() => startVoiceRecognition('description')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeVoiceTarget === 'description'
                      ? 'bg-red-500 text-white animate-pulse shadow-xs ring-2 ring-red-400/40'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                  title="ভয়েসে বিবরণ বলুন"
                >
                  {activeVoiceTarget === 'description' ? (
                    <>
                      <MicOff className="w-3.5 h-3.5" />
                      <span>শুনছি... (থামান)</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-emerald-600" />
                      <span>ভয়েসে বিবরণ</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <input
                  id="tx-description"
                  type="text"
                  placeholder="যেমন: চাল, ডাল, নগদ পরিশোধ"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className={`w-full bg-slate-50 border rounded-xl pl-3 pr-9 py-2 text-sm text-slate-800 transition focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                    activeVoiceTarget === 'description'
                      ? 'border-red-400 ring-2 ring-red-400/30 bg-red-50/10'
                      : 'border-slate-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => startVoiceRecognition('description')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 cursor-pointer"
                  title="ভয়েসে বিবরণ বলুন"
                >
                  <Mic className={`w-4 h-4 ${activeVoiceTarget === 'description' ? 'text-red-500 animate-pulse' : ''}`} />
                </button>
              </div>

              {activeVoiceTarget === 'description' && (
                <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-200 animate-fadeIn">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                    <span className="truncate">
                      {voiceInterim ? `"${voiceInterim}"` : 'কথা বলুন... আপনার কণ্ঠস্বর লেখা হবে'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={stopVoiceRecognition}
                    className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-bold ml-2 shrink-0"
                  >
                    থামান
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                তারিখ
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer Submit */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            বাতিল
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={amount <= 0 || !selectedCustomerId}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-md transition active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>হিসাব সংরক্ষণ করুন</span>
          </button>
        </div>

      </div>

      {/* Built-in Floating Calculator */}
      <FloatingCalculator
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onApplyAmount={(calculatedVal) => {
          setAmountStr(calculatedVal.toString());
        }}
        initialValue={parseFloat(amountStr) || 0}
      />

      {/* Phone Contact Import Modal */}
      {isPhoneContactModalOpen && (
        <PhoneContactImportModal
          isOpen={isPhoneContactModalOpen}
          onClose={() => setIsPhoneContactModalOpen(false)}
          user={user}
          customers={customers}
          onCustomerCreated={(newCust) => {
            onAddCustomer(newCust);
            setSelectedCustomerId(newCust.id);
            setIsCreatingCustomer(false);
            setIsPhoneContactModalOpen(false);
          }}
        />
      )}

      {/* Product Inventory Picker Modal */}
      {isProductPickerOpen && (
        <ProductPickerModal
          isOpen={isProductPickerOpen}
          onClose={() => setIsProductPickerOpen(false)}
          user={user}
          initialSelectedItems={selectedProducts}
          onConfirm={handleConfirmProducts}
        />
      )}
    </div>
  );
};
