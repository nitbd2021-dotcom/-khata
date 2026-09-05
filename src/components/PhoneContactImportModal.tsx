import React, { useState, useEffect } from 'react';
import { 
  X, 
  Smartphone, 
  UserPlus, 
  Check, 
  AlertCircle, 
  Copy, 
  Upload, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Sparkles,
  Info,
  HelpCircle,
  FileText
} from 'lucide-react';
import { Customer, User } from '../types';
import { generateId, StorageService } from '../services/storageService';
import { 
  isNativeContactPickerSupported, 
  pickSingleContactFromPhone, 
  parseSmartContactText, 
  parseVCardString,
  normalizePhoneNumber,
  isValidBdPhoneNumber
} from '../services/phoneContactsService';

interface PhoneContactImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  customers: Customer[];
  onCustomerCreated: (newCustomer: Customer) => void;
}

export const PhoneContactImportModal: React.FC<PhoneContactImportModalProps> = ({
  isOpen,
  onClose,
  user,
  customers,
  onCustomerCreated,
}) => {
  const isSupported = isNativeContactPickerSupported();

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState<string>('5000');

  // Input modes & status
  const [pasteInput, setPasteInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoadingNative, setIsLoadingNative] = useState(false);
  const [showVcfUpload, setShowVcfUpload] = useState(false);
  const [vcfContactsList, setVcfContactsList] = useState<{ name: string; phone: string; address?: string }[]>([]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setPasteInput('');
      setVcfContactsList([]);
      setShowVcfUpload(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Check duplicate phone in current customer base
  const cleanPhone = normalizePhoneNumber(customerPhone);
  const duplicateCustomer = cleanPhone
    ? customers.find(c => normalizePhoneNumber(c.phone) === cleanPhone)
    : null;

  // Next auto-generated code
  const nextCustomerCode = StorageService.generateNextCustomerCode(customers);

  /**
   * Triggers native mobile phonebook picker
   */
  const handlePickFromNativePhonebook = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoadingNative(true);

    try {
      const contact = await pickSingleContactFromPhone();
      if (contact) {
        if (contact.name) setCustomerName(contact.name);
        if (contact.phone) setCustomerPhone(contact.phone);
        if (contact.address) setCustomerAddress(contact.address);
        setSuccessMsg('ফোনবুক থেকে কন্ট্যাক্ট সফলভাবে লোড হয়েছে!');
      }
    } catch (err: any) {
      console.warn('Native contact picker error:', err);
      if (err.message === 'NOT_SUPPORTED') {
        setErrorMsg('আপনার ডিভাইসে সরাসরি কন্ট্যাক্ট পিকার সমর্থিত নয়। নিচের পেস্ট বা ফাইল অপশন ব্যবহার করুন।');
      } else {
        setErrorMsg('কন্ট্যাক্ট লোড করা যায়নি। অনুগ্রহ করে ম্যানুয়ালি পেস্ট করুন।');
      }
    } finally {
      setIsLoadingNative(false);
    }
  };

  /**
   * Handle pasting text from call log, WhatsApp, or SMS
   */
  const handleParsePastedText = () => {
    setErrorMsg('');
    if (!pasteInput.trim()) {
      setErrorMsg('অনুগ্রহ করে কন্ট্যাক্টের লেখা বা নম্বর পেস্ট করুন');
      return;
    }

    const parsed = parseSmartContactText(pasteInput);
    if (parsed) {
      if (parsed.name && parsed.name !== 'নতুন কাস্টমার') {
        setCustomerName(parsed.name);
      }
      if (parsed.phone) {
        setCustomerPhone(parsed.phone);
      }
      setSuccessMsg('নম্বর ও নাম স্বয়ংক্রিয়ভাবে শনাক্ত হয়েছে!');
      setPasteInput('');
    } else {
      setErrorMsg('সঠিক মোবাইল নম্বর শনাক্ত করা যায়নি। যেমন: 01712345678');
    }
  };

  /**
   * Handle .vcf (vCard) file upload
   */
  const handleVcfFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const parsed = parseVCardString(content);
        if (parsed.length > 0) {
          if (parsed.length === 1) {
            setCustomerName(parsed[0].name);
            setCustomerPhone(parsed[0].phone);
            if (parsed[0].address) setCustomerAddress(parsed[0].address);
            setSuccessMsg('কন্ট্যাক্ট ফাইল থেকে তথ্য লোড হয়েছে!');
          } else {
            setVcfContactsList(parsed);
            setSuccessMsg(`ফাইল থেকে মোট ${parsed.length}টি কন্ট্যাক্ট পাওয়া গেছে। যেকোনো একটি নির্বাচন করুন।`);
          }
        } else {
          setErrorMsg('.vcf ফাইলে কোনো বৈধ কন্ট্যাক্ট পাওয়া যায়নি।');
        }
      }
    };
    reader.readAsText(file);
  };

  /**
   * Select a contact from parsed vcf list
   */
  const handleSelectFromVcfList = (c: { name: string; phone: string; address?: string }) => {
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    if (c.address) setCustomerAddress(c.address);
    setVcfContactsList([]);
    setShowVcfUpload(false);
    setSuccessMsg(`"${c.name}" নির্বাচিত হয়েছে!`);
  };

  /**
   * Save customer to app
   */
  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!customerName.trim()) {
      setErrorMsg('কাস্টমারের নাম প্রদান করুন');
      return;
    }

    const normPhone = normalizePhoneNumber(customerPhone);
    if (!normPhone) {
      setErrorMsg('কাস্টমারের মোবাইল নম্বর দিন');
      return;
    }

    if (!isValidBdPhoneNumber(normPhone)) {
      setErrorMsg('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01712345678)');
      return;
    }

    const limitVal = parseFloat(creditLimit) || 5000;

    const newCustomer: Customer = {
      id: generateId(),
      code: nextCustomerCode,
      userId: user.id,
      name: customerName.trim(),
      phone: normPhone,
      address: customerAddress.trim(),
      creditLimit: limitVal,
      totalReceivable: 0,
      totalPayable: 0,
      netBalance: 0,
      lastTransactionAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    onCustomerCreated(newCustomer);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[94vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">
                ফোন কন্ট্যাক্টস থেকে কাস্টমার যোগ
              </h3>
              <p className="text-xs text-indigo-200">
                DSR-এর ফোনের সেভ থাকা নাম্বার থেকে দ্রুত কাস্টমার বানান
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">

          {/* Feedback messages */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. PRIMARY ONE-TAP NATIVE PHONEBOOK BUTTON */}
          <div className="bg-gradient-to-br from-indigo-50 via-white to-indigo-50/50 p-4 rounded-2xl border-2 border-indigo-200 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>ফোনের ফোনবুক থেকে নির্বাচন</span>
              </span>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
                {isSupported ? 'সরাসরি কানেক্টেড' : 'সাপোর্টেড ব্রাউজার'}
              </span>
            </div>

            <p className="text-xs text-slate-600">
              বাটনে চাপলে আপনার ফোনের আসল ফোনবুক তালিকা খুলবে। নাম ও নম্বর সিলেক্ট করলে স্বয়ংক্রিয়ভাবে বসে যাবে।
            </p>

            <button
              type="button"
              onClick={handlePickFromNativePhonebook}
              disabled={isLoadingNative}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
            >
              <Smartphone className="w-5 h-5 text-indigo-200" />
              <span>{isLoadingNative ? 'ফোনবুক লোড হচ্ছে...' : '📱 ফোনবুক খুলুন ও কন্ট্যাক্ট বেছে নিন'}</span>
            </button>
          </div>

          {/* 2. ALTERNATIVE: SMART TEXT PASTE / CALL LOG PARSER */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>কল লগ, মেসেজ বা হোয়াটসঅ্যাপ থেকে পেস্ট করুন</span>
              </label>
              <button
                type="button"
                onClick={() => setShowVcfUpload(!showVcfUpload)}
                className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>{showVcfUpload ? 'ফাইল লুকান' : '.vcf ফাইল আপলোড'}</span>
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="যেমন: রহিম স্টোর 01712345678 বা শুধু নম্বর পেস্ট করুন"
                value={pasteInput}
                onChange={e => setPasteInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleParsePastedText();
                  }
                }}
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleParsePastedText}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer shrink-0 shadow-2xs"
              >
                অটো ডিটেক্ট
              </button>
            </div>

            {/* VCF File Upload section */}
            {showVcfUpload && (
              <div className="p-3 bg-white border border-dashed border-indigo-300 rounded-xl space-y-2 mt-2">
                <span className="text-[11px] font-bold text-slate-700 block">
                  ফোনবুকের ব্যাকআপ / শেয়ার ফাইল (.vcf) আপলোড:
                </span>
                <input
                  type="file"
                  accept=".vcf,text/vcard"
                  onChange={handleVcfFileUpload}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>
            )}

            {/* VCF Contact list selector if multi-contact found */}
            {vcfContactsList.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-white border border-slate-200 rounded-xl">
                <span className="text-[11px] font-bold text-slate-500 block">কন্ট্যাক্ট বেছে নিন:</span>
                {vcfContactsList.map((c, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectFromVcfList(c)}
                    className="w-full p-2 text-left hover:bg-indigo-50 rounded-lg flex items-center justify-between border border-slate-100 transition cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">{c.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">{c.phone}</span>
                    </div>
                    <span className="text-xs text-indigo-600 font-bold">+ যোগ</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. CUSTOMER DETAILS FORM (Pre-filled & Editable) */}
          <form onSubmit={handleSaveCustomer} className="space-y-3 pt-1">
            <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-xs font-semibold text-emerald-900">
                নির্ধারিত কাস্টমার আইডি:
              </span>
              <span className="font-mono font-black text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-300 text-xs shadow-2xs">
                {nextCustomerCode}
              </span>
            </div>

            {/* Duplicate customer warning */}
            {duplicateCustomer && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">সতর্কতা: এই নম্বরটি ইতিমধ্যে সেভ আছে!</span>
                  <span>কাস্টমার: <strong>{duplicateCustomer.name}</strong> (আইডি: {duplicateCustomer.code || 'N/A'})।</span>
                </div>
              </div>
            )}

            {/* Customer Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                কাস্টমারের নাম <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="যেমন: রহিম স্টোর / রহিম মিয়া"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                required
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                মোবাইল নম্বর <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  placeholder="01712345678"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  required
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                দোকানের ঠিকানা বা এলাকা (ঐচ্ছিক)
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="যেমন: চকবাজার মেইন রোড"
                  value={customerAddress}
                  onChange={e => setCustomerAddress(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Credit Limit */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                বাকি সতর্কতা সীমা (ক্রেডিট লিমিট ৳)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">৳</span>
                <input
                  type="number"
                  placeholder="5000"
                  value={creditLimit}
                  onChange={e => setCreditLimit(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Submit button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <UserPlus className="w-4 h-4" />
                <span>কাস্টমার তালিকায় সেভ করুন</span>
              </button>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
};
