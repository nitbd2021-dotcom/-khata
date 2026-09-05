export type TransactionType =
  | 'credit_given'       // বাকি দিলাম (আমার পাওনা বাড়ে)
  | 'credit_taken'       // বাকি নিলাম (আমার দেনা বাড়ে)
  | 'loan_given'         // ধার দিলাম (আমার পাওনা বাড়ে)
  | 'loan_taken'         // ধার পেলাম (আমার দেনা বাড়ে)
  | 'payment_received'   // টাকা পেলাম (বাকি/ধার পরিশোধ -> পাওনা কমে)
  | 'payment_given'      // টাকা দিলাম (দেনা পরিশোধ -> দেনা কমে)
  | 'sale'               // নগদ বিক্রি
  | 'expense';           // সাধারণ খরচ

export type UserRole = 'admin' | 'moderator' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  pin: string; // 4 digit security PIN
  shopName: string;
  shopAddress?: string;
  shopCategory?: string;
  avatarUrl?: string;
  createdAt: string;
  googleSheetId?: string;
  googleSheetUrl?: string;
  googleAccessToken?: string;
  googleAppsScriptUrl?: string;
  isAdmin?: boolean;
  isModerator?: boolean;
  role?: UserRole;
  moderatorId?: string; // ID of the moderator this user is assigned to
  dueThreshold?: number; // সর্বোচ্চ বাকি সীমা বা বকেয়া সতর্কবার্তা থ্রেশহোল্ড (Receivable limit threshold)
  monthlyExpenseBudget?: number; // মাসিক খরচ বাজেট বা সর্বোচ্চ খরচের সীমা (Monthly expense budget limit)
  dsrCreditLimit?: number; // মডারেটর কর্তৃক নির্ধারিত ডিএসআর-এর মোট সর্বোচ্চ বাকি সীমা (Total DSR credit limit set by moderator)
  isCreditLocked?: boolean; // মডারেটর কর্তৃক ডিএসআর-এর নতুন বাকি দেওয়া লক বা স্থগিত করা আছে কিনা
  dsrStatus?: 'active' | 'suspended'; // ডিএসআর একাউন্ট স্ট্যাটাস (সক্রিয় বা সাময়িক স্থগিত)
}

export interface Customer {
  id: string;
  code?: string; // ৪/৫/৬ সংখ্যার ইউনিক আইডি কোড (যেমন: A1001, A1111, A10000)
  userId: string;
  name: string;
  phone: string;
  address?: string;
  note?: string;
  creditLimit?: number;    // মডারেটর কর্তৃক নির্ধারিত কাস্টমারের ব্যক্তিগত বাকি সীমা (Customer credit limit set by moderator)
  totalReceivable: number; // মোট পাওনা
  totalPayable: number;    // মোট দেনা
  netBalance: number;      // পাওনা - দেনা (ধনাত্মক হলে আমি পাব, ঋণাত্মক হলে আমি দেব)
  lastTransactionAt: string;
  createdAt: string;
}

export type PaymentMethod = 
  | 'cash'     // নগদ
  | 'bkash'    // বিকাশ
  | 'bank'     // ব্যাংক
  | 'nagad'    // নগদ (ডিজিটাল ওয়ালেট)
  | 'rocket'   // রকেট
  | 'other'    // অন্যান্য
  | string;

export interface TransactionItemDetail {
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface Transaction {
  id: string;
  userId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  balanceAfter: number;
  syncedToSheet: boolean;
  paymentMethod?: PaymentMethod;
  items?: TransactionItemDetail[];
}

export interface InventoryItem {
  id: string;
  userId: string;
  name: string;
  code?: string;           // বারকোড বা প্রোডাক্ট কোড (যেমন: PRD-101)
  category?: string;       // ক্যাটাগরি (মুদি, বেকারি, পানীয়, স্ন্যাক্স, প্রসাধন, ইত্যাদি)
  unit: string;           // একক (পিস, প্যাকেট, কার্টুন, বস্তা, কেজি, লিটার, ইত্যাদি)
  costPrice?: number;      // ক্রয় বা পাইকারি দর (৳)
  sellingPrice: number;    // বিক্রয় দর (৳)
  currentStock: number;    // বর্তমান মজুদ সংখ্যা
  minStockAlert: number;   // লো-স্টক সতর্কতা সীমা (যেমন: ৫ বা ১০)
  lastRestockedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovementLog {
  id: string;
  userId: string;
  itemId: string;
  itemName: string;
  type: 'in' | 'out' | 'adjustment'; // 'in' (মজুদ বৃদ্ধি), 'out' (বিক্রি/বাকি কর্তন), 'adjustment' (সমন্বয়)
  quantity: number;
  previousStock: number;
  newStock: number;
  relatedTransactionId?: string;
  relatedCustomerId?: string;
  relatedCustomerName?: string;
  note?: string;
  date: string;
}

export interface Expense {
  id: string;
  userId: string;
  category: string;
  amount: number;
  description: string;
  date: string;
}

export interface AdminUserRecord {
  userId: string;
  email: string;
  pin: string;
  shopName: string;
  shopCategory: string;
  customerCount: number;
  transactionCount: number;
  totalReceivable: number;
  totalPayable: number;
  googleSheetId?: string;
  googleSheetUrl?: string;
  registeredAt: string;
  lastActive: string;
  isAdmin?: boolean;
  isModerator?: boolean;
  role?: UserRole;
  moderatorId?: string;
  moderatorName?: string;
  assignedUsersCount?: number;
}

export interface ModeratorUserDetail {
  user: User;
  customerCount: number;
  transactionCount: number;
  totalReceivable: number;
  totalPayable: number;
  netBalance: number;
  customers: Customer[];
  transactions: Transaction[];
  lastActive?: string;
}

export interface ModeratorSummary {
  moderator: User;
  totalAssignedUsers: number;
  totalCustomers: number;
  totalReceivable: number; // মোট পাওনা/বাকি
  totalPayable: number;    // মোট দেনা
  totalTransactions: number;
  todayReceived: number;
  todayGiven: number;
  todaySales: number;
  userRecords: ModeratorUserDetail[];
}

export interface DeviceSession {
  deviceId: string;
  email: string;
  pin: string;
  rememberMe: boolean;
  shopName: string;
  lastActive: string;
}

export interface VoiceParseResult {
  rawText: string;
  customerName: string;
  customerCode?: string;
  matchedCustomerId?: string;
  amount: number;
  type: TransactionType;
  typeLabel: string;
  description: string;
  confidence: number;
}

export interface ModeratorProductTableRow {
  id: string;
  productName: string; // প্রথম কলাম: পণ্য এর নাম
  quantity1: number;   // ২ য় কলাম: পরিমান
  quantity2: number;   // ৩ য় কলাম: পরিমান
  unit?: string;       // একক
  note?: string;       // নোট/মন্তব্য
  updatedAt?: string;
}
