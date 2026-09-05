import React, { useEffect, useState } from 'react';
import { X, Download, Printer, QrCode, User, Phone, Store, Check, Copy } from 'lucide-react';
import QRCode from 'qrcode';
import { Customer, User as ShopUser } from '../types';

interface CustomerQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  shopUser: ShopUser;
}

export const CustomerQRCodeModal: React.FC<CustomerQRCodeModalProps> = ({
  isOpen,
  onClose,
  customer,
  shopUser,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // The payload encoded in the QR code:
  // We encode the clean unique ID code (e.g. "A1111")
  // as well as JSON payload for universal compatibility
  const customerCode = customer.code || 'A1001';

  useEffect(() => {
    if (!isOpen) return;

    // Generate high quality QR code data URL
    QRCode.toDataURL(
      customerCode,
      {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a', // slate-900
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      },
      (err, url) => {
        if (err) {
          console.error('Failed to generate QR code:', err);
          return;
        }
        setQrDataUrl(url);
      }
    );
  }, [isOpen, customerCode]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_${customer.name.replace(/\s+/g, '_')}_${customerCode}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(customerCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[96vh] flex flex-col print:shadow-none print:border-none print:max-h-full">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 print:hidden">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                কাস্টমার কিউআর কোড
              </h3>
              <p className="text-xs text-slate-500">
                স্ক্যান করে মুহূর্তেই কাস্টমার সনাক্ত করুন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Card Area */}
        <div className="p-6 space-y-4 text-center overflow-y-auto">
          
          {/* Shop branding on the card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">{shopUser.shopName}</span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                ডিজিটাল কাস্টমার কার্ড
              </span>
            </div>

            <div className="mt-2.5 pt-2.5 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">কাস্টমারের নাম</span>
                <span className="text-sm font-black text-slate-900">{customer.name}</span>
                {customer.phone && (
                  <span className="text-xs text-slate-500 block flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-slate-400" /> {customer.phone}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold block">ইউনিক আইডি কোড</span>
                <div className="flex items-center gap-1.5 justify-end mt-0.5">
                  <span className="font-mono font-black text-base text-indigo-700 bg-indigo-100/70 border border-indigo-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
                    {customerCode}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Scannable QR Code Canvas / Image */}
          <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-indigo-200 flex flex-col items-center justify-center relative group">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code for ${customer.name} (${customerCode})`}
                className="w-56 h-56 rounded-xl shadow-xs"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-sm">
                QR কোড তৈরি হচ্ছে...
              </div>
            )}
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <QrCode className="w-4 h-4 text-indigo-600" />
              <span>মোবাইলের কিউআর স্ক্যানার দিয়ে স্ক্যান করুন</span>
            </div>
          </div>

          {/* Quick Copy Code Button */}
          <div className="flex items-center justify-center gap-2 print:hidden">
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">কপি হয়েছে!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>আইডি কোড কপি করুন ({customerCode})</span>
                </>
              )}
            </button>
          </div>

          {/* Explanation Text */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-left text-xs text-amber-900 print:hidden">
            <p className="leading-relaxed">
              💡 <strong>ব্যবহারের নিয়ম:</strong> কাস্টমার তার ফোনে এই কিউআর কোডের ছবি রাখতে পারেন। দোকানদার দোকানে থাকা <strong>"QR স্ক্যান"</strong> বোতামে চাপ দিয়ে কাস্টমারের ফোন থেকে এই কোড স্ক্যান করলেই তাৎক্ষণিক তার হিসাবের খাতা বের হয়ে আসবে।
            </p>
          </div>

          {/* Print & Download Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-1 print:hidden">
            <button
              onClick={handleDownload}
              disabled={!qrDataUrl}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>QR ডাউনলোড</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>কার্ড প্রিন্ট / PDF</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
