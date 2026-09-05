import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  QrCode,
  Camera,
  Upload,
  RefreshCw,
  Zap,
  ZapOff,
  CheckCircle2,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  UserPlus,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Customer, TransactionType } from '../types';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onQuickAddTx?: (type: TransactionType, customerId: string) => void;
  onAddNewCustomerWithCode?: (code: string) => void;
}

const banglaDigitsMap: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

export const parseScannedCustomerCode = (rawText: string): string => {
  const text = rawText.trim();

  // Check JSON format
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const obj = JSON.parse(text);
      if (obj.code) return String(obj.code).trim().toUpperCase();
      if (obj.customerCode) return String(obj.customerCode).trim().toUpperCase();
      if (obj.id) return String(obj.id).trim().toUpperCase();
    } catch {
      // ignore
    }
  }

  // Convert any Bengali digits to English
  let converted = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    converted += banglaDigitsMap[char] || char;
  }

  // Look for A + 4 to 6 digits pattern (e.g. A1111, A1001, A10000, A100000)
  const match = converted.match(/[A-Za-z](\d{4,6})/i);
  if (match) {
    return match[0].toUpperCase();
  }

  // Match raw string if clean alphanumeric
  const clean = converted.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return clean || text.toUpperCase();
};

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  customers,
  onSelectCustomer,
  onQuickAddTx,
  onAddNewCustomerWithCode,
}) => {
  const [scannerState, setScannerState] = useState<'idle' | 'starting' | 'scanning' | 'matched' | 'not_found' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [scannedCode, setScannedCode] = useState<string>('');
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [isUploading, setIsUploading] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'customer-qr-reader';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synthesized audio feedback on successful scan
  const playSuccessChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch {
      // Silently proceed if browser prevents audio autoplay
    }
  };

  // Process any decoded code
  const handleDecodedCode = (decodedText: string) => {
    const code = parseScannedCustomerCode(decodedText);
    setScannedCode(code);
    playSuccessChime();

    // Stop scanner
    stopScanner();

    // Check if customer exists in current user's list
    const found = customers.find(
      c => (c.code && c.code.toUpperCase() === code.toUpperCase()) || c.id === code
    );

    if (found) {
      setMatchedCustomer(found);
      setScannerState('matched');
    } else {
      setMatchedCustomer(null);
      setScannerState('not_found');
    }
  };

  const startScanner = async (cameraId?: string) => {
    if (!isOpen) return;

    setScannerState('starting');
    setErrorMessage('');

    try {
      // Ensure any previous instance is stopped
      await stopScanner();

      // Check available cameras
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setAvailableCameras(devices);
          if (!cameraId && !selectedCameraId) {
            // Prefer back camera ("environment")
            const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear') || d.label.toLowerCase().includes('environment'));
            setSelectedCameraId(backCam ? backCam.id : devices[0].id);
          }
        }
      } catch (devErr) {
        console.warn('Could not enumerate cameras:', devErr);
      }

      const qrScanner = new Html5Qrcode(containerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      html5QrCodeRef.current = qrScanner;

      const cameraConfig = cameraId || selectedCameraId ? { deviceId: { exact: cameraId || selectedCameraId } } : { facingMode: 'environment' };

      await qrScanner.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleDecodedCode(decodedText);
        },
        () => {
          // Standard frame-by-frame miss, no action needed
        }
      );

      setScannerState('scanning');

      // Check if torch/flashlight capability is available
      try {
        const track = (qrScanner as unknown as { getRunningTrackCameraCapabilities?: () => { torch?: boolean } }).getRunningTrackCameraCapabilities?.();
        if (track && track.torch) {
          setHasTorch(true);
        }
      } catch {
        setHasTorch(false);
      }
    } catch (err: unknown) {
      console.error('QR Scanner Start Error:', err);
      const errStr = err instanceof Error ? err.message : String(err);
      setScannerState('error');
      if (errStr.includes('NotAllowedError') || errStr.includes('Permission')) {
        setErrorMessage('ক্যামেরা ব্যবহারের অনুমতি দেওয়া হয়নি। অনুগ্রহ করে ব্রাউজারে ক্যামেরার অনুমতি দিন অথবা নিচের ছবি আপলোড অপশনটি ব্যবহার করুন।');
      } else if (errStr.includes('NotFoundError') || errStr.includes('DevicesNotFoundError')) {
        setErrorMessage('কোনো উপযুক্ত ক্যামেরা পাওয়া যায়নি। আপনি নিচের ফাইল আপলোড অপশন দিয়ে কিউআর কোড স্ক্যান করতে পারেন।');
      } else {
        setErrorMessage(`ক্যামেরা চালু করা সম্ভব হয়নি (${errStr})। আপনি ছবি আপলোড বা স্যাম্পল কোড দিয়ে ট্রাই করতে পারেন।`);
      }
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
      html5QrCodeRef.current = null;
    }
    setTorchOn(false);
  };

  // Toggle torch / flash
  const handleToggleTorch = async () => {
    if (!html5QrCodeRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await (html5QrCodeRef.current as unknown as { applyVideoConstraints: (c: { advanced: [{ torch: boolean }] }) => Promise<void> }).applyVideoConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Failed to toggle torch:', e);
    }
  };

  // Handle image file upload for scanning
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMessage('');

    try {
      // Create temporary scanner instance for file scanning
      const fileScanner = new Html5Qrcode('qr-file-dummy-container', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });

      const decodedText = await fileScanner.scanFile(file, true);
      fileScanner.clear();
      setIsUploading(false);
      handleDecodedCode(decodedText);
    } catch (err: unknown) {
      console.error('File scan error:', err);
      setIsUploading(false);
      setErrorMessage('এই ছবিতে কোনো স্পষ্ট QR কোড পাওয়া যায়নি। অনুগ্রহ করে পরিষ্কার ছবি নির্বাচন করুন।');
    }
  };

  // Lifecycle
  useEffect(() => {
    if (isOpen) {
      setScannerState('idle');
      setScannedCode('');
      setMatchedCustomer(null);
      setErrorMessage('');
      setActiveTab('camera');

      // Start camera automatically with a small delay for container render
      const timer = setTimeout(() => {
        startScanner();
      }, 350);

      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[96vh] flex flex-col">
        
        {/* Hidden container for image file scanner */}
        <div id="qr-file-dummy-container" className="hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                কাস্টমার QR স্ক্যানার
              </h3>
              <p className="text-xs text-slate-500">
                মুহূর্তেই কাস্টমারের খাতা ও ব্যালেন্স খুঁজুন
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">

          {/* Mode Switcher: Camera vs Image File */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => {
                setActiveTab('camera');
                setErrorMessage('');
                if (scannerState !== 'scanning' && scannerState !== 'starting') {
                  startScanner();
                }
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>মোবাইল ক্যামেরা</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('upload');
                stopScanner();
                setErrorMessage('');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>ছবি / গ্যালারি থেকে</span>
            </button>
          </div>

          {/* SUCCESS MATCH VIEW */}
          {scannerState === 'matched' && matchedCustomer && (
            <div className="bg-gradient-to-b from-emerald-50 to-teal-50/40 rounded-2xl p-5 border-2 border-emerald-300 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>কাস্টমার সফলভাবে শনাক্ত হয়েছে!</span>
                </div>

                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-100 border border-indigo-200 text-indigo-800 font-mono font-black text-sm shadow-2xs">
                    {matchedCustomer.code || scannedCode}
                  </span>
                  <h4 className="text-xl font-bold text-slate-900">
                    {matchedCustomer.name}
                  </h4>
                </div>

                <p className="text-xs text-slate-600 mt-1">
                  {matchedCustomer.phone ? `মোবাইল: ${matchedCustomer.phone}` : 'মোবাইল নম্বর নেই'} 
                  {matchedCustomer.address ? ` • ${matchedCustomer.address}` : ''}
                </p>
              </div>

              {/* Balance Highlight */}
              <div className="bg-white rounded-xl p-3 border border-emerald-200 shadow-xs max-w-xs mx-auto">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  বর্তমান খাতার স্থিতি
                </span>
                <span className={`text-xl font-black block mt-0.5 ${
                  matchedCustomer.netBalance > 0
                    ? 'text-red-600'
                    : matchedCustomer.netBalance < 0
                    ? 'text-purple-600'
                    : 'text-emerald-600'
                }`}>
                  ৳{Math.abs(matchedCustomer.netBalance).toLocaleString('bn-BD')} {
                    matchedCustomer.netBalance > 0 ? '(বকেয়া পাওনা)' : matchedCustomer.netBalance < 0 ? '(দেনা)' : '(কোনো বাকি নেই)'
                  }
                </span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => {
                    onSelectCustomer(matchedCustomer);
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white font-bold py-3 px-4 rounded-xl text-sm shadow-md transition active:scale-98 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span>খাতা ও লেনদেনের বিস্তারিত দেখুন</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      if (onQuickAddTx) {
                        onQuickAddTx('credit_given', matchedCustomer.id);
                        onClose();
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>বাকি দিন</span>
                  </button>

                  <button
                    onClick={() => {
                      if (onQuickAddTx) {
                        onQuickAddTx('payment_received', matchedCustomer.id);
                        onClose();
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>টাকা জমা নিন</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    setScannerState('idle');
                    setMatchedCustomer(null);
                    setScannedCode('');
                    startScanner();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold py-2 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>অন্য কাস্টমার স্ক্যান করুন</span>
                </button>
              </div>
            </div>
          )}

          {/* NOT FOUND VIEW */}
          {scannerState === 'not_found' && (
            <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 text-center space-y-3 animate-in fade-in duration-200">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center mx-auto shadow-xs">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900">
                  অচেনা কাস্টমার কোড
                </h4>
                <div className="mt-1 flex items-center justify-center gap-1.5">
                  <span className="text-xs text-slate-600">স্ক্যানকৃত কোড:</span>
                  <span className="font-mono font-black text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-lg border border-amber-300 text-sm">
                    {scannedCode}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  আপনার কাস্টমার তালিকায় এই ইউনিক আইডির কোনো গ্রাহক পাওয়া যায়নি। আপনি চাইলে সরাসরি এই আইডি কোড দিয়ে নতুন কাস্টমার হিসেবে যুক্ত করতে পারেন।
                </p>
              </div>

              <div className="space-y-2 pt-2">
                {onAddNewCustomerWithCode && (
                  <button
                    onClick={() => {
                      onAddNewCustomerWithCode(scannedCode);
                      onClose();
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>এই কোড দিয়ে কাস্টমার যোগ করুন</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setScannerState('idle');
                    setScannedCode('');
                    startScanner();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold py-2 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>পুনরায় স্ক্যান করুন</span>
                </button>
              </div>
            </div>
          )}

          {/* ACTIVE CAMERA SCANNING VIEW */}
          {activeTab === 'camera' && scannerState !== 'matched' && scannerState !== 'not_found' && (
            <div className="space-y-3">
              
              {/* Camera Stream & Viewfinder */}
              <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-square flex flex-col items-center justify-center border border-slate-800 shadow-inner">
                
                {/* HTML5 QR Container */}
                <div id={containerId} className="w-full h-full object-cover" />

                {/* Laser line & Corner Viewfinder overlay */}
                {scannerState === 'scanning' && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                    <div className="w-60 h-60 relative">
                      {/* Corner Borders */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                      
                      {/* Scanning animated red laser */}
                      <div className="absolute left-2 right-2 h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse top-1/2 transform -translate-y-1/2" />
                    </div>
                  </div>
                )}

                {/* Status Indicator */}
                {scannerState === 'starting' && (
                  <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-white space-y-2">
                    <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                    <span className="text-xs font-semibold">ক্যামেরা চালু হচ্ছে...</span>
                  </div>
                )}

                {/* Controls overlay (Torch / Switch Cam) */}
                {scannerState === 'scanning' && (
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
                    {hasTorch ? (
                      <button
                        onClick={handleToggleTorch}
                        className={`p-2.5 rounded-xl backdrop-blur-md text-white transition cursor-pointer ${
                          torchOn ? 'bg-amber-500/80 text-white' : 'bg-black/40 hover:bg-black/60'
                        }`}
                        title="ফ্ল্যাশলাইট অন/অফ"
                      >
                        {torchOn ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                      </button>
                    ) : <div />}

                    {availableCameras.length > 1 && (
                      <button
                        onClick={() => {
                          const currentIdx = availableCameras.findIndex(c => c.id === selectedCameraId);
                          const nextCam = availableCameras[(currentIdx + 1) % availableCameras.length];
                          setSelectedCameraId(nextCam.id);
                          startScanner(nextCam.id);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-black/50 hover:bg-black/70 backdrop-blur-md text-white text-xs font-semibold transition cursor-pointer"
                        title="ক্যামেরা পরিবর্তন করুন"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>ক্যামেরা বদলান</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Instructions banner */}
              <p className="text-center text-xs text-slate-500">
                কাস্টমারের মোবাইলের কিউআর কোড বা আইডি কার্ডটি ফ্রেমের ভেতরে ধরুন
              </p>
            </div>
          )}

          {/* IMAGE UPLOAD TAB */}
          {activeTab === 'upload' && scannerState !== 'matched' && scannerState !== 'not_found' && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition group"
              >
                <div className="w-14 h-14 rounded-2xl bg-white text-emerald-600 border border-emerald-200 flex items-center justify-center mb-3 shadow-xs group-hover:scale-105 transition">
                  {isUploading ? (
                    <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6 text-emerald-600" />
                  )}
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  {isUploading ? 'ছবি স্ক্যান হচ্ছে...' : 'কিউআর কোডের ছবি নির্বাচন করুন'}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  গ্যালারি থেকে কাস্টমারের কিউআর কোডের স্ক্রিনশট বা ছবি সিলেক্ট করুন
                </p>
                <button
                  type="button"
                  className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs group-hover:bg-emerald-700 transition"
                >
                  ছবি বাছাই করুন
                </button>
              </div>
            </div>
          )}

          {/* Error Message if camera failed */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p>{errorMessage}</p>
                {activeTab === 'camera' && (
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="mt-1.5 font-bold text-red-900 underline hover:text-red-950 cursor-pointer block"
                  >
                    গ্যালারি বা ছবি আপলোড অপশন ট্রাই করুন
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick Demo Test Buttons (1-Click Customer Code Simulation) */}
          <div className="text-left bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              স্যাম্পল কাস্টমার কোড (১-ক্লিকে স্ক্যান টেস্ট করুন):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {customers.slice(0, 6).map((cust) => (
                <button
                  key={cust.id}
                  onClick={() => handleDecodedCode(cust.code || cust.id)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-xs font-medium text-slate-700 transition active:scale-95 cursor-pointer shadow-2xs"
                  title={`${cust.name} এর কিউআর কোড স্ক্যান টেস্ট`}
                >
                  <span className="font-mono font-black text-indigo-700 text-[11px] bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                    {cust.code || 'CODE'}
                  </span>
                  <span className="font-semibold text-slate-800">{cust.name}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
            <span>সাপোর্টেড: ৪/৫/৬ সংখ্যার ইউনিক আইডি</span>
          </span>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="text-slate-600 hover:text-slate-900 font-semibold px-3 py-1 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
};
