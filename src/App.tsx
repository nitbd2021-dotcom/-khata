import React, { useState, useEffect, useCallback } from 'react';
import { 
  Home, 
  Users, 
  PlusCircle,
  Plus,
  X,
  QrCode,
  Wallet,
  TrendingDown,
  Receipt,
  UserPlus,
  BarChart3, 
  Mic, 
  Sparkles, 
  Cloud, 
  ShieldCheck,
  Smartphone,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { Customer, Expense, PaymentMethod, Transaction, TransactionType, User } from './types';
import { StorageService } from './services/storageService';
import { GoogleSheetsService } from './services/googleSheetsService';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { CustomerList } from './components/CustomerList';
import { CustomerDetailModal } from './components/CustomerDetailModal';
import { AddTransactionModal } from './components/AddTransactionModal';
import { VoiceKhataModal } from './components/VoiceKhataModal';
import { AdminSheetView } from './components/AdminSheetView';
import { LoginModal } from './components/LoginModal';
import { ReportsView } from './components/ReportsView';
import { AddExpenseModal } from './components/AddExpenseModal';
import { SettingsModal } from './components/SettingsModal';
import { UserSheetModal } from './components/UserSheetModal';
import { ModeratorPortalView } from './components/ModeratorPortalView';
import { QRScannerModal } from './components/QRScannerModal';
import { CustomerQRCodeModal } from './components/CustomerQRCodeModal';
import { TransactionReceiptModal } from './components/TransactionReceiptModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'reports'>('dashboard');
  const [isAdminView, setIsAdminView] = useState<boolean>(false);
  const [isModeratorView, setIsModeratorView] = useState<boolean>(false);
  const [moderatorViewTargetId, setModeratorViewTargetId] = useState<string | undefined>(undefined);

  // Online / Offline & Auto-Sync State
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncNotification, setSyncNotification] = useState<{
    message: string;
    type: 'success' | 'warning' | 'info';
  } | null>(null);

  // Modals
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isUserSheetOpen, setIsUserSheetOpen] = useState<boolean>(false);
  const [isAddTxOpen, setIsAddTxOpen] = useState<boolean>(false);
  const [addTxDefaultType, setAddTxDefaultType] = useState<TransactionType>('payment_received');
  const [addTxDefaultCustomerId, setAddTxDefaultCustomerId] = useState<string>('');
  
  const [isVoiceKhataOpen, setIsVoiceKhataOpen] = useState<boolean>(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState<boolean>(false);
  const [viewQrCustomer, setViewQrCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState<boolean>(false);
  
  // Transaction Receipt / WhatsApp Share Modal State
  const [receiptTx, setReceiptTx] = useState<{ transaction: Transaction; customer: Customer } | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  // Trigger Google Sheet Sync
  const triggerSync = useCallback(async (targetUser?: User) => {
    const userToSync = targetUser || currentUser;
    if (!userToSync) return;

    setIsSyncing(true);
    const currentCustomers = StorageService.getCustomers(userToSync.id);
    const currentTransactions = StorageService.getTransactions(userToSync.id);

    try {
      const result = await GoogleSheetsService.syncUserDataToSheet(
        userToSync,
        currentCustomers,
        currentTransactions
      );

      // Refresh transactions state to reflect synced status
      const refreshedTransactions = StorageService.getTransactions(userToSync.id);
      setTransactions(refreshedTransactions);
      setLastSyncTime(new Date().toISOString());

      if (result.isOffline) {
        setSyncNotification({
          message: 'অফলাইন মোড: ডাটা ডিভাইসে সংরক্ষিত আছে। ইন্টারনেট পেলেই স্বয়ংক্রিয় শিটে যাবে।',
          type: 'warning',
        });
      } else {
        setSyncNotification({
          message: 'অনলাইন সংযোগ সক্রিয়: সকল হিসাব স্বয়ংক্রিয়ভাবে গুগল শিটে সিঙ্ক হয়েছে!',
          type: 'success',
        });
      }
    } catch (e) {
      console.warn('Sync attempt failed:', e);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncNotification(null), 5000);
    }
  }, [currentUser]);

  // Listen for Online / Offline network changes for Automatic Background Sync
  useEffect(() => {
    const handleNetworkOnline = () => {
      setIsOnline(true);
      if (currentUser) {
        setSyncNotification({
          message: 'ইন্টারনেট সংযোগ পাওয়া গেছে! অফলাইনের সকল হিসাব স্বয়ংক্রিয়ভাবে শিটে যাচ্ছে...',
          type: 'info',
        });
        triggerSync(currentUser);
      }
    };

    const handleNetworkOffline = () => {
      setIsOnline(false);
      setSyncNotification({
        message: '📡 অফলাইন মোড: ইন্টারনেট বন্ধ। আপনি হিসাব লিখতে থাকুন, অনলাইনে এলে স্বয়ংক্রিয় শিটে যাবে।',
        type: 'warning',
      });
      setTimeout(() => setSyncNotification(null), 5000);
    };

    window.addEventListener('online', handleNetworkOnline);
    window.addEventListener('offline', handleNetworkOffline);

    return () => {
      window.removeEventListener('online', handleNetworkOnline);
      window.removeEventListener('offline', handleNetworkOffline);
    };
  }, [currentUser, triggerSync]);

  // Load User Data & Remembered Device
  useEffect(() => {
    const user = StorageService.getCurrentUser();
    if (user) {
      loadUserData(user);
    } else {
      // Check if device remembered session exists
      const session = StorageService.getDeviceSession();
      if (session && session.rememberMe) {
        try {
          const { user: autoUser } = StorageService.registerOrLogin(
            session.email,
            session.pin,
            session.shopName,
            undefined,
            undefined,
            undefined,
            true
          );
          loadUserData(autoUser);
          return;
        } catch (e) {
          console.warn('Auto login failed:', e);
        }
      }
      setIsLoginModalOpen(true);
    }
  }, []);

  const loadUserData = (user: User) => {
    setCurrentUser(user);
    const userCustomers = StorageService.getCustomers(user.id);
    const userTransactions = StorageService.getTransactions(user.id);
    const userExpenses = StorageService.getExpenses(user.id);

    setCustomers(userCustomers);
    setTransactions(userTransactions);
    setExpenses(userExpenses);

    const savedSyncTime = GoogleSheetsService.getLastSyncTime(user.id);
    if (savedSyncTime) {
      setLastSyncTime(savedSyncTime);
    }
  };

  const handleLoginSuccess = async (user: User) => {
    setIsLoginModalOpen(false);
    loadUserData(user);

    if (StorageService.isModeratorUser(user)) {
      setIsModeratorView(true);
    } else {
      setIsModeratorView(false);
    }

    // Initialize spreadsheet for this user immediately upon account open
    const userCustomers = StorageService.getCustomers(user.id);
    const userTransactions = StorageService.getTransactions(user.id);
    await GoogleSheetsService.initializeUserSheet(user, userCustomers, userTransactions);

    // If online, perform initial auto-sync
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      await triggerSync(user);
    }
  };

  const handleLogout = () => {
    StorageService.setCurrentUser(null);
    setCurrentUser(null);
    setIsLoginModalOpen(true);
    setIsAdminView(false);
    setIsModeratorView(false);
    setModeratorViewTargetId(undefined);
  };

  const handleOpenAddTx = (type: TransactionType = 'payment_received', customerId?: string) => {
    setAddTxDefaultType(type);
    if (customerId) setAddTxDefaultCustomerId(customerId);
    else if (customers.length > 0) setAddTxDefaultCustomerId(customers[0].id);
    setIsAddTxOpen(true);
  };

  const handleSaveTransaction = (
    customerId: string,
    type: TransactionType,
    amount: number,
    description: string,
    date?: string,
    paymentMethod?: PaymentMethod | string
  ) => {
    if (!currentUser) return;

    // Add to storage & recalculate
    const newTx = StorageService.addTransaction(
      currentUser.id,
      customerId,
      type,
      amount,
      description,
      date,
      paymentMethod
    );

    // Refresh state
    const updatedCustomers = StorageService.getCustomers(currentUser.id);
    const updatedTransactions = StorageService.getTransactions(currentUser.id);
    setCustomers(updatedCustomers);
    setTransactions(updatedTransactions);

    // If modal of selected customer is open, update selected customer
    const updatedC = updatedCustomers.find(c => c.id === customerId);
    if (selectedCustomer && selectedCustomer.id === customerId) {
      if (updatedC) setSelectedCustomer(updatedC);
    }

    // Automatically trigger digital receipt & WhatsApp share dialog
    if (updatedC && newTx) {
      setReceiptTx({ transaction: newTx, customer: updatedC });
      setIsReceiptModalOpen(true);
    }

    // Background sync to Google Sheet
    triggerSync(currentUser);
  };

  const handleViewReceipt = (transaction: Transaction, customer?: Customer) => {
    const cust = customer || customers.find(c => c.id === transaction.customerId);
    if (cust) {
      setReceiptTx({ transaction, customer: cust });
      setIsReceiptModalOpen(true);
    }
  };

  const handleAddCustomer = (newCustomer: Customer) => {
    StorageService.saveCustomer(newCustomer);
    if (currentUser) {
      const updatedCustomers = StorageService.getCustomers(currentUser.id);
      setCustomers(updatedCustomers);
    }
  };

  const handleSaveExpense = (category: string, amount: number, description: string) => {
    if (!currentUser) return;
    StorageService.addExpense(currentUser.id, category, amount, description);
    const updatedExpenses = StorageService.getExpenses(currentUser.id);
    setExpenses(updatedExpenses);
  };

  const handleVoiceKhataConfirm = (
    customerId: string,
    customerName: string,
    type: TransactionType,
    amount: number,
    description: string,
    paymentMethod?: PaymentMethod | string
  ) => {
    if (!currentUser) return;

    let targetCustId = customerId;
    // If customer doesn't exist, create automatically
    if (!targetCustId) {
      const existing = customers.find(c => c.name.toLowerCase() === customerName.toLowerCase());
      if (existing) {
        targetCustId = existing.id;
      } else {
        const newCust: Customer = {
          id: 'cust-' + Math.random().toString(36).substring(2, 8),
          code: StorageService.generateNextCustomerCode(customers),
          userId: currentUser.id,
          name: customerName,
          phone: '',
          totalReceivable: 0,
          totalPayable: 0,
          netBalance: 0,
          lastTransactionAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        StorageService.saveCustomer(newCust);
        targetCustId = newCust.id;
      }
    }

    handleSaveTransaction(targetCustId, type, amount, description, undefined, paymentMethod);
  };

  const handleSwitchUserFromAdmin = (userId: string) => {
    const allUsers = StorageService.getAllUsers();
    const target = allUsers.find(u => u.id === userId);
    if (target) {
      StorageService.setCurrentUser(target.id);
      loadUserData(target);
      setIsAdminView(false);
      if (StorageService.isModeratorUser(target)) {
        setIsModeratorView(true);
      } else {
        setIsModeratorView(false);
      }
      setActiveTab('dashboard');
    }
  };

  const summary = currentUser ? StorageService.getDashboardSummary(currentUser.id) : {
    totalReceivable: 0,
    totalPayable: 0,
    todayReceived: 0,
    todayGiven: 0,
    todaySales: 0,
    todayExpenseAmount: 0,
    totalCustomers: 0,
    totalTransactions: 0,
  };

  const deviceSession = StorageService.getDeviceSession();

  const pendingCount = transactions.filter(t => !t.syncedToSheet).length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col selection:bg-emerald-200 relative overflow-x-hidden w-full max-w-full">
      
      {/* Dynamic Auto-Sync / Offline Notification Toast */}
      {syncNotification && (
        <div className={`fixed top-3 right-3 left-3 sm:left-auto sm:right-4 sm:max-w-md z-50 p-3 sm:p-3.5 rounded-2xl shadow-xl border flex items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-200 ${
          syncNotification.type === 'success'
            ? 'bg-emerald-900 text-white border-emerald-600 shadow-emerald-950/20'
            : syncNotification.type === 'warning'
            ? 'bg-amber-900 text-white border-amber-600 shadow-amber-950/20'
            : 'bg-slate-900 text-white border-slate-700 shadow-slate-950/20'
        }`}>
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            {syncNotification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : syncNotification.type === 'warning' ? (
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
            )}
            <span>{syncNotification.message}</span>
          </div>
          <button
            onClick={() => setSyncNotification(null)}
            className="text-white/60 hover:text-white text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header */}
      {currentUser && (
        <Header
          user={currentUser}
          isAdminView={isAdminView}
          onToggleAdminView={() => {
            const next = !isAdminView;
            setIsAdminView(next);
            if (next) setIsModeratorView(false);
          }}
          isModeratorView={isModeratorView}
          onToggleModeratorView={() => {
            const next = !isModeratorView;
            setIsModeratorView(next);
            if (next) setIsAdminView(false);
          }}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onLogout={handleLogout}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenVoiceKhata={() => setIsVoiceKhataOpen(true)}
          onOpenQRScanner={() => setIsQRScannerOpen(true)}
          isRemembered={Boolean(deviceSession?.rememberMe)}
          isOnline={isOnline}
          pendingCount={pendingCount}
          isSyncing={isSyncing}
          onOpenUserSheet={() => setIsUserSheetOpen(true)}
        />
      )}

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-28 md:pb-12">
        {currentUser && (
          <>
            {isAdminView ? (
              <AdminSheetView
                currentUser={currentUser}
                onSwitchUser={handleSwitchUserFromAdmin}
                onExitAdmin={() => setIsAdminView(false)}
                onOpenLoginModal={() => setIsLoginModalOpen(true)}
                onOpenModeratorPortal={(modUserId) => {
                  setModeratorViewTargetId(modUserId);
                  setIsAdminView(false);
                  setIsModeratorView(true);
                }}
              />
            ) : isModeratorView ? (
              <ModeratorPortalView
                currentUser={currentUser}
                targetModeratorId={moderatorViewTargetId}
                onExitPortal={() => {
                  setIsModeratorView(false);
                  setModeratorViewTargetId(undefined);
                }}
                onSwitchToUserShop={handleSwitchUserFromAdmin}
              />
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <Dashboard
                    user={currentUser}
                    customers={customers}
                    transactions={transactions}
                    summary={summary}
                    onOpenAddTx={handleOpenAddTx}
                    onOpenVoiceKhata={() => setIsVoiceKhataOpen(true)}
                    onOpenQRScanner={() => setIsQRScannerOpen(true)}
                    onSelectCustomer={cust => setSelectedCustomer(cust)}
                    onAddExpense={() => setIsAddExpenseOpen(true)}
                    isOnline={isOnline}
                    pendingCount={pendingCount}
                    onOpenUserSheet={() => setIsUserSheetOpen(true)}
                    onViewReceipt={handleViewReceipt}
                  />
                )}

                {activeTab === 'customers' && (
                  <CustomerList
                    customers={customers}
                    onSelectCustomer={cust => setSelectedCustomer(cust)}
                    onOpenAddCustomer={() => {
                      setAddTxDefaultCustomerId('NEW_CUSTOMER');
                      setIsAddTxOpen(true);
                    }}
                    onQuickAddTx={(type, custId) => handleOpenAddTx(type, custId)}
                    dueThreshold={currentUser.dueThreshold ?? 2500}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onViewQRCode={cust => setViewQrCustomer(cust)}
                  />
                )}

                {activeTab === 'reports' && (
                  <ReportsView
                    user={currentUser}
                    customers={customers}
                    transactions={transactions}
                    expenses={expenses}
                    onAddExpense={() => setIsAddExpenseOpen(true)}
                    onViewReceipt={handleViewReceipt}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Material 3 Touch Ergonomics) */}
      {currentUser && !isAdminView && !isModeratorView && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 md:hidden px-1.5 pt-1.5 pb-safe shadow-lg">
          <div className="flex items-center justify-around">
            
            {/* Home Tab */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition min-w-[56px] ${
                activeTab === 'dashboard'
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-500 font-medium'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[11px] mt-0.5">হোম</span>
            </button>

            {/* Customers Tab */}
            <button
              onClick={() => setActiveTab('customers')}
              className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition min-w-[56px] ${
                activeTab === 'customers'
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-500 font-medium'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[11px] mt-0.5">কাস্টমার</span>
            </button>

            {/* Prominent Center Add Button */}
            <button
              onClick={() => setIsPlusMenuOpen(prev => !prev)}
              className={`flex flex-col items-center -mt-6 p-3.5 rounded-2xl shadow-lg transition-all duration-200 active:scale-95 cursor-pointer min-w-[52px] min-h-[52px] justify-center ${
                isPlusMenuOpen
                  ? 'bg-slate-900 text-white shadow-slate-400 rotate-45'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 ring-4 ring-white'
              }`}
              title={isPlusMenuOpen ? 'বন্ধ করুন' : 'নতুন হিসাব বা QR স্ক্যান'}
            >
              <Plus className="w-6 h-6" />
            </button>

            {/* Voice Khata Tab */}
            <button
              onClick={() => setIsVoiceKhataOpen(true)}
              className="flex flex-col items-center py-1 px-2.5 rounded-xl text-slate-500 hover:text-emerald-700 transition min-w-[56px]"
            >
              <Mic className="w-5 h-5 text-red-500 animate-pulse" />
              <span className="text-[11px] mt-0.5 font-bold">ভয়েস খাতা</span>
            </button>

            {/* Reports Tab */}
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition min-w-[56px] ${
                activeTab === 'reports'
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-500 font-medium'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-[11px] mt-0.5">রিপোর্ট</span>
            </button>

          </div>
        </div>
      )}

      {/* Plus Action Dropdown Popover (Positioned above bottom nav on mobile, centered on desktop) */}
      {isPlusMenuOpen && currentUser && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsPlusMenuOpen(false)}
          />

          {/* Dropdown Menu Card */}
          <div className="relative mb-24 sm:mb-0 w-full max-w-sm bg-white rounded-3xl p-4 shadow-2xl border border-slate-200 z-10 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-1 mb-2.5 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">দ্রুত অ্যাকশন নির্বাচন করুন</span>
              <button 
                onClick={() => setIsPlusMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                title="বন্ধ করুন"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. TOP OPTION: QR স্ক্যান (User Request: "ড্রপডাউন এর উপরে QR স্ক্রান এর অপশন থাকবে") */}
            <button
              onClick={() => {
                setIsPlusMenuOpen(false);
                setIsQRScannerOpen(true);
              }}
              className="w-full flex items-center gap-3.5 p-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl shadow-sm hover:from-black hover:to-indigo-900 transition active:scale-98 cursor-pointer border border-indigo-500/30 mb-2.5 text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 group-hover:scale-105 transition">
                <QrCode className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">QR কোড স্ক্যান</span>
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/40">ক্যামেরা</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5 truncate">কাস্টমারের কোড স্ক্যান করে খাতা বের করুন</p>
              </div>
            </button>

            {/* Divider */}
            <div className="border-t border-slate-100 my-2"></div>

            {/* Action List Options */}
            <div className="space-y-1.5">
              {/* জমা পেলাম (+ জমা) */}
              <button
                onClick={() => {
                  setIsPlusMenuOpen(false);
                  handleOpenAddTx('payment_received');
                }}
                className="w-full flex items-center gap-3 p-2.5 hover:bg-emerald-50 rounded-xl transition text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-200">
                  <Wallet className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-slate-900 block group-hover:text-emerald-800">টাকা জমা পেলাম (+ জমা)</span>
                  <span className="text-[10px] text-slate-400">কাস্টমার থেকে নগদ বা অনলাইন আদায়</span>
                </div>
              </button>

              {/* বাকি দিলাম (+ বাকি) */}
              <button
                onClick={() => {
                  setIsPlusMenuOpen(false);
                  handleOpenAddTx('credit_given');
                }}
                className="w-full flex items-center gap-3 p-2.5 hover:bg-rose-50 rounded-xl transition text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 group-hover:bg-rose-200">
                  <TrendingDown className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-slate-900 block group-hover:text-rose-800">বাকি দিলাম (+ বাকি)</span>
                  <span className="text-[10px] text-slate-400">নতুন বাকি বা মাল বিক্রি</span>
                </div>
              </button>

              {/* দোকানের খরচ (+ খরচ) */}
              <button
                onClick={() => {
                  setIsPlusMenuOpen(false);
                  setIsAddExpenseOpen(true);
                }}
                className="w-full flex items-center gap-3 p-2.5 hover:bg-amber-50 rounded-xl transition text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-200">
                  <Receipt className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-slate-900 block group-hover:text-amber-800">দোকানের খরচ (+ খরচ)</span>
                  <span className="text-[10px] text-slate-400">দোকান ভাড়া, বিল, কর্মচারীর বেতন ইত্যাদি</span>
                </div>
              </button>

              {/* নতুন কাস্টমার তৈরি (+ কাস্টমার) */}
              <button
                onClick={() => {
                  setIsPlusMenuOpen(false);
                  setAddTxDefaultCustomerId('NEW_CUSTOMER');
                  setIsAddTxOpen(true);
                }}
                className="w-full flex items-center gap-3 p-2.5 hover:bg-blue-50 rounded-xl transition text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-200">
                  <UserPlus className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-slate-900 block group-hover:text-blue-800">নতুন কাস্টমার তৈরি (+ কাস্টমার)</span>
                  <span className="text-[10px] text-slate-400">নাম ও ফোন নম্বর দিয়ে নতুন খাতা খুলুন</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isLoginModalOpen && (
        <LoginModal
          isOpen={isLoginModalOpen}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {isAddTxOpen && currentUser && (
        <AddTransactionModal
          isOpen={isAddTxOpen}
          onClose={() => setIsAddTxOpen(false)}
          user={currentUser}
          customers={customers}
          initialType={addTxDefaultType}
          initialCustomerId={addTxDefaultCustomerId}
          onSave={handleSaveTransaction}
          onAddCustomer={handleAddCustomer}
        />
      )}

      {isVoiceKhataOpen && (
        <VoiceKhataModal
          isOpen={isVoiceKhataOpen}
          onClose={() => setIsVoiceKhataOpen(false)}
          customers={customers}
          onConfirmTransaction={handleVoiceKhataConfirm}
        />
      )}

      {selectedCustomer && currentUser && (
        <CustomerDetailModal
          isOpen={Boolean(selectedCustomer)}
          onClose={() => setSelectedCustomer(null)}
          customer={selectedCustomer}
          transactions={transactions}
          user={currentUser}
          isModerator={currentUser.role === 'moderator' || currentUser.role === 'admin'}
          onCustomerUpdated={() => {
            const updated = StorageService.getCustomers(currentUser.id);
            setCustomers(updated);
            const freshCust = updated.find(c => c.id === selectedCustomer.id);
            if (freshCust) setSelectedCustomer(freshCust);
          }}
          onQuickAddTx={(type, custId) => {
            setSelectedCustomer(null);
            handleOpenAddTx(type, custId);
          }}
          onViewReceipt={(tx, cust) => handleViewReceipt(tx, cust)}
        />
      )}

      {isAddExpenseOpen && (
        <AddExpenseModal
          isOpen={isAddExpenseOpen}
          onClose={() => setIsAddExpenseOpen(false)}
          onSave={handleSaveExpense}
        />
      )}

      {isSettingsOpen && currentUser && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          user={currentUser}
          onUpdateUser={updated => {
            StorageService.saveUser(updated);
            setCurrentUser(updated);
          }}
          onLogout={handleLogout}
        />
      )}

      {/* Interactive Google Sheet Mirror & Offline Sync Modal */}
      {isUserSheetOpen && currentUser && (
        <UserSheetModal
          isOpen={isUserSheetOpen}
          onClose={() => setIsUserSheetOpen(false)}
          user={currentUser}
          customers={customers}
          transactions={transactions}
          isOnline={isOnline}
          onTriggerSync={() => triggerSync()}
          isSyncing={isSyncing}
          lastSyncTime={lastSyncTime}
          onUpdateUser={updated => {
            StorageService.saveUser(updated);
            setCurrentUser(updated);
          }}
        />
      )}

      {/* Customer QR Scanner Modal */}
      {isQRScannerOpen && currentUser && (
        <QRScannerModal
          isOpen={isQRScannerOpen}
          onClose={() => setIsQRScannerOpen(false)}
          customers={customers}
          onSelectCustomer={cust => {
            setSelectedCustomer(cust);
            setIsQRScannerOpen(false);
          }}
          onQuickAddTx={(type, custId) => {
            setIsQRScannerOpen(false);
            handleOpenAddTx(type, custId);
          }}
          onAddNewCustomerWithCode={code => {
            setIsQRScannerOpen(false);
            setAddTxDefaultCustomerId('');
            setIsAddTxOpen(true);
          }}
        />
      )}

      {/* Customer Individual QR Code & ID Card Modal */}
      {viewQrCustomer && currentUser && (
        <CustomerQRCodeModal
          isOpen={Boolean(viewQrCustomer)}
          onClose={() => setViewQrCustomer(null)}
          customer={viewQrCustomer}
          shopUser={currentUser}
        />
      )}

      {/* Transaction Digital Receipt & WhatsApp Share Modal */}
      {isReceiptModalOpen && receiptTx && currentUser && (
        <TransactionReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setReceiptTx(null);
          }}
          transaction={receiptTx.transaction}
          customer={receiptTx.customer}
          user={currentUser}
          onAddNewTx={() => {
            setIsReceiptModalOpen(false);
            setReceiptTx(null);
            handleOpenAddTx('payment_received', receiptTx.customer.id);
          }}
        />
      )}

    </div>
  );
}
