import { Customer, DeviceSession, Expense, PaymentMethod, Transaction, TransactionType, User, AdminUserRecord } from '../types';

const STORAGE_USERS_KEY = 'khata_plus_users';
const STORAGE_CUSTOMERS_KEY = 'khata_plus_customers';
const STORAGE_TRANSACTIONS_KEY = 'khata_plus_transactions';
const STORAGE_EXPENSES_KEY = 'khata_plus_expenses';
const STORAGE_DEVICE_KEY = 'khata_plus_device_session';
const STORAGE_CURRENT_USER_KEY = 'khata_plus_current_user_id';
export const ADMIN_EMAIL = 'jahidulraju87@gmail.com';
export const ADMIN_PASSWORD = 'raju12158A+';
const STORAGE_ADMIN_PIN = '7860'; // Alternative Master Admin PIN

// Generate unique ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
};

/**
 * Customer Unique Code Generator
 * Starts with 1 letter ('A') and a 4-digit number (1001 to 9999).
 * When 4 digits run out (after 9999), expands to 5 digits (10000 to 99999).
 * When 5 digits run out (after 99999), expands to 6 digits (100000 to 999999).
 */
export const generateNextCustomerCode = (customers: Customer[]): string => {
  let maxNum = 1000;
  for (const c of customers) {
    if (c.code) {
      const match = c.code.match(/^[A-Za-z](\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  const nextNum = maxNum + 1;
  const numStr = nextNum < 10000 ? String(nextNum).padStart(4, '0') : String(nextNum);
  return `A${numStr}`;
};

// Initial Demo Data Setup for first launch
const seedInitialData = () => {
  const adminUser: User = {
    id: 'user-admin-jahidul',
    email: 'Jahidulraju87@gmail.com',
    name: 'জাহিদুল ইসলাম রাজু',
    phone: '01712158000',
    pin: ADMIN_PASSWORD,
    shopName: 'খাতা+ কেন্দ্রীয় এডমিন হেডকোয়ার্টার',
    shopAddress: 'ঢাকা, বাংলাদেশ',
    shopCategory: 'এডমিন কন্ট্রোল',
    createdAt: new Date().toISOString(),
    googleSheetId: 'admin_master_ledger_sheet',
    googleSheetUrl: 'https://docs.google.com/spreadsheets/d/admin_master_ledger_sheet/edit',
    isAdmin: true,
    role: 'admin',
  };

  const defaultModerator: User = {
    id: 'user-mod-1',
    email: 'moderator@khata.com',
    name: 'মো: আরিফুল ইসলাম (মডারেটর)',
    phone: '01819988776',
    pin: '1234',
    shopName: 'উত্তরা জোন ব্যবসায়ী সমিতি (মডারেটর হাব)',
    shopAddress: 'উত্তরা সেক্টর ৭, ঢাকা',
    shopCategory: 'জোন সুপারভাইজার ও মডারেটর',
    createdAt: new Date().toISOString(),
    googleSheetId: '',
    googleSheetUrl: '',
    isAdmin: false,
    isModerator: true,
    role: 'moderator',
  };

  const defaultUser: User = {
    id: 'user-demo-1',
    email: 'nitbd2021@gmail.com',
    name: 'আহমেদ রফিক',
    phone: '01711223344',
    pin: '1234',
    shopName: 'মেসার্স ভাই ভাই এন্টারপ্রাইজ',
    shopAddress: 'চকবাজার, ঢাকা',
    shopCategory: 'মুদি দোকান',
    createdAt: new Date().toISOString(),
    googleSheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    googleSheetUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
    isAdmin: false,
    role: 'user',
    moderatorId: 'user-mod-1',
    dueThreshold: 2500,
  };

  const demoUser2: User = {
    id: 'user-demo-2',
    email: 'bismillah.store@gmail.com',
    name: 'হাজী মোখলেসুর রহমান',
    phone: '01799881122',
    pin: '1234',
    shopName: 'বিসমিল্লাহ জেনারেল স্টোর',
    shopAddress: 'হাউস বিল্ডিং, উত্তরা, ঢাকা',
    shopCategory: 'জেনারেল স্টোর',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    googleSheetId: '',
    googleSheetUrl: '',
    isAdmin: false,
    role: 'user',
    moderatorId: 'user-mod-1',
    dueThreshold: 2500,
  };

  const existingUsersRaw = localStorage.getItem(STORAGE_USERS_KEY);
  if (existingUsersRaw) {
    try {
      const users: User[] = JSON.parse(existingUsersRaw);
      const adminIndex = users.findIndex(u => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
      if (adminIndex >= 0) {
        users[adminIndex].pin = ADMIN_PASSWORD;
        users[adminIndex].isAdmin = true;
        users[adminIndex].role = 'admin';
      } else {
        users.unshift(adminUser);
      }
      // Ensure moderator exists
      const modIndex = users.findIndex(u => u.id === 'user-mod-1' || u.email.toLowerCase() === 'moderator@khata.com');
      if (modIndex < 0) {
        users.push(defaultModerator);
      } else {
        users[modIndex].isModerator = true;
        users[modIndex].role = 'moderator';
      }

      // Ensure demoUser2 exists
      const demo2Index = users.findIndex(u => u.id === 'user-demo-2' || u.email.toLowerCase() === 'bismillah.store@gmail.com');
      if (demo2Index < 0) {
        users.push(demoUser2);
      }

      // Ensure at least demo users have a moderator assigned
      users.forEach(u => {
        if (u.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
          u.isAdmin = false;
        }
        if ((u.id === 'user-demo-1' || u.email.toLowerCase() === 'nitbd2021@gmail.com') && !u.moderatorId) {
          u.moderatorId = 'user-mod-1';
        }
        if ((u.id === 'user-demo-2' || u.email.toLowerCase() === 'bismillah.store@gmail.com') && !u.moderatorId) {
          u.moderatorId = 'user-mod-1';
        }
      });
      // Backfill customer unique codes and ensure Raju A1111 exists
      const existingCustsRaw = localStorage.getItem(STORAGE_CUSTOMERS_KEY);
      if (existingCustsRaw) {
        try {
          const custs: Customer[] = JSON.parse(existingCustsRaw);
          let changed = false;
          
          // Ensure Raju (A1111) exists for user-demo-1
          const hasRaju = custs.some(c => c.code === 'A1111' || (c.name.includes('রাজু') && c.userId === 'user-demo-1'));
          if (!hasRaju) {
            custs.push({
              id: 'cust-raju',
              userId: 'user-demo-1',
              code: 'A1111',
              name: 'রাজু',
              phone: '01712158000',
              address: 'মিরপুর, ঢাকা',
              note: 'ভয়েস স্পেশাল কাস্টমার (A1111)',
              totalReceivable: 500,
              totalPayable: 0,
              netBalance: 500,
              lastTransactionAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            });
            changed = true;
          }

          // Backfill missing codes
          let nextCodeNum = 1000;
          custs.forEach(c => {
            if (c.code) {
              const m = c.code.match(/^[A-Za-z](\d+)$/);
              if (m) {
                const v = parseInt(m[1], 10);
                if (v > nextCodeNum && v < 1111) nextCodeNum = v;
              }
            }
          });

          custs.forEach(c => {
            if (!c.code) {
              nextCodeNum++;
              const numStr = nextCodeNum < 10000 ? String(nextCodeNum).padStart(4, '0') : String(nextCodeNum);
              c.code = `A${numStr}`;
              changed = true;
            }
          });

          if (changed) {
            localStorage.setItem(STORAGE_CUSTOMERS_KEY, JSON.stringify(custs));
          }
        } catch (err) {
          console.warn('Error backfilling customer codes:', err);
        }
      }

      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    } catch (e) {
      console.warn('Error verifying users in storage:', e);
    }
    return;
  }

  const initialCustomers: Customer[] = [
    {
      id: 'cust-1',
      userId: defaultUser.id,
      code: 'A1001',
      name: 'রহিম মিয়া',
      phone: '01812345678',
      address: 'কাঁচাবাজার রোড',
      note: 'প্রতি শুক্রবার হিসাব চুকায়',
      totalReceivable: 3500,
      totalPayable: 0,
      netBalance: 3500,
      lastTransactionAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
    {
      id: 'cust-2',
      userId: defaultUser.id,
      code: 'A1002',
      name: 'করিম চৌধুরী',
      phone: '01998765432',
      address: 'স্টেশন রোড',
      note: 'ডিপার্টমেন্টাল স্টোর সাপ্লায়ার',
      totalReceivable: 0,
      totalPayable: 1800,
      netBalance: -1800,
      lastTransactionAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    },
    {
      id: 'cust-3',
      userId: defaultUser.id,
      code: 'A1003',
      name: 'মো: সোহেল রানা',
      phone: '01755443322',
      address: 'স্কুল মার্কেট',
      note: 'নিয়মিত ক্রেতা',
      totalReceivable: 1200,
      totalPayable: 0,
      netBalance: 1200,
      lastTransactionAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: 'cust-4',
      userId: defaultUser.id,
      code: 'A1004',
      name: 'সালমা বেগম',
      phone: '01677889900',
      address: 'মোল্লা বাড়ি',
      note: 'দুধ ও ডিম সাপ্লাই',
      totalReceivable: 0,
      totalPayable: 650,
      netBalance: -650,
      lastTransactionAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 'cust-raju',
      userId: defaultUser.id,
      code: 'A1111',
      name: 'রাজু',
      phone: '01712158000',
      address: 'মিরপুর, ঢাকা',
      note: 'ভয়েস স্পেশাল কাস্টমার (A1111)',
      totalReceivable: 500,
      totalPayable: 0,
      netBalance: 500,
      lastTransactionAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    }
  ];

  const initialTransactions: Transaction[] = [
    {
      id: 'tx-1',
      userId: defaultUser.id,
      customerId: 'cust-1',
      customerName: 'রহিম মিয়া',
      customerPhone: '01812345678',
      type: 'credit_given',
      amount: 4000,
      description: 'মিনিকেট চাল ২ বস্তা ও তেল ৫ লিটার',
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      balanceAfter: 4000,
      syncedToSheet: true,
    },
    {
      id: 'tx-2',
      userId: defaultUser.id,
      customerId: 'cust-1',
      customerName: 'রহিম মিয়া',
      customerPhone: '01812345678',
      type: 'payment_received',
      amount: 500,
      description: 'নগদ ক্যাশ আংশিক জমা',
      date: new Date(Date.now() - 3600000 * 4).toISOString(),
      balanceAfter: 3500,
      syncedToSheet: true,
    },
    {
      id: 'tx-3',
      userId: defaultUser.id,
      customerId: 'cust-2',
      customerName: 'করিম চৌধুরী',
      customerPhone: '01998765432',
      type: 'credit_taken',
      amount: 1800,
      description: 'মুদি মালামাল পাইকারি ক্রয়',
      date: new Date(Date.now() - 3600000 * 12).toISOString(),
      balanceAfter: -1800,
      syncedToSheet: true,
    },
    {
      id: 'tx-4',
      userId: defaultUser.id,
      customerId: 'cust-3',
      customerName: 'মো: সোহেল রানা',
      customerPhone: '01755443322',
      type: 'loan_given',
      amount: 1200,
      description: 'জরুরি পারিবারিক ধার',
      date: new Date(Date.now() - 3600000 * 24).toISOString(),
      balanceAfter: 1200,
      syncedToSheet: true,
    }
  ];

  const initialExpenses: Expense[] = [
    {
      id: 'exp-1',
      userId: defaultUser.id,
      category: 'বিদ্যুৎ বিল',
      amount: 650,
      description: 'চলতি মাসের বিদ্যুৎ বিল পরিশোধ',
      date: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'exp-2',
      userId: defaultUser.id,
      category: 'খাবার',
      amount: 120,
      description: 'দুপুরের নাস্তা ও চা',
      date: new Date().toISOString(),
    }
  ];

  const demo2Customers: Customer[] = [
    {
      id: 'cust-demo2-1',
      userId: demoUser2.id,
      code: 'A1005',
      name: 'জামাল উদ্দিন (ডিপার্টমেন্টাল)',
      phone: '01712998877',
      address: 'সেক্টর ৯, উত্তরা',
      note: 'সাপ্তাহিক পাইকারি খদ্দের',
      totalReceivable: 4500,
      totalPayable: 0,
      netBalance: 4500,
      lastTransactionAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 'cust-demo2-2',
      userId: demoUser2.id,
      code: 'A1006',
      name: 'মেসার্স মেঘনা ডিস্ট্রিবিউশন',
      phone: '01844556677',
      address: 'টঙ্গী বাজার',
      note: 'ড্রিংকস ও বেভারেজ সাপ্লায়ার',
      totalReceivable: 0,
      totalPayable: 2200,
      netBalance: -2200,
      lastTransactionAt: new Date(Date.now() - 3600000 * 18).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    }
  ];

  const demo2Transactions: Transaction[] = [
    {
      id: 'tx-demo2-1',
      userId: demoUser2.id,
      customerId: 'cust-demo2-1',
      customerName: 'জামাল উদ্দিন (ডিপার্টমেন্টাল)',
      customerPhone: '01712998877',
      type: 'credit_given',
      amount: 4500,
      description: 'বিস্কুট ও কনফেকশনারি মালামাল বাকি',
      date: new Date(Date.now() - 3600000 * 8).toISOString(),
      balanceAfter: 4500,
      syncedToSheet: true,
    },
    {
      id: 'tx-demo2-2',
      userId: demoUser2.id,
      customerId: 'cust-demo2-2',
      customerName: 'মেসার্স মেঘনা ডিস্ট্রিবিউশন',
      customerPhone: '01844556677',
      type: 'credit_taken',
      amount: 2200,
      description: 'জুস ও কোমল পানীয় কার্টুন চালান',
      date: new Date(Date.now() - 3600000 * 18).toISOString(),
      balanceAfter: -2200,
      syncedToSheet: true,
    }
  ];

  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify([adminUser, defaultModerator, defaultUser, demoUser2]));
  localStorage.setItem(STORAGE_CUSTOMERS_KEY, JSON.stringify([...initialCustomers, ...demo2Customers]));
  localStorage.setItem(STORAGE_TRANSACTIONS_KEY, JSON.stringify([...initialTransactions, ...demo2Transactions]));
  localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(initialExpenses));
  localStorage.setItem(STORAGE_CURRENT_USER_KEY, defaultUser.id);
  
  // Save device session so user is remembered
  const deviceSession: DeviceSession = {
    deviceId: 'dev-' + Math.random().toString(36).substring(2, 9),
    email: defaultUser.email,
    pin: defaultUser.pin,
    rememberMe: true,
    shopName: defaultUser.shopName,
    lastActive: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_DEVICE_KEY, JSON.stringify(deviceSession));
};

seedInitialData();

export const StorageService = {
  // Device Session (Remember Device)
  getDeviceSession: (): DeviceSession | null => {
    const raw = localStorage.getItem(STORAGE_DEVICE_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  saveDeviceSession: (session: DeviceSession) => {
    localStorage.setItem(STORAGE_DEVICE_KEY, JSON.stringify(session));
  },

  clearDeviceSession: () => {
    localStorage.removeItem(STORAGE_DEVICE_KEY);
  },

  // Users Management
  getAllUsers: (): User[] => {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  saveUser: (user: User) => {
    const users = StorageService.getAllUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  },

  getCurrentUser: (): User | null => {
    const currentId = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    if (!currentId) return null;
    const users = StorageService.getAllUsers();
    return users.find(u => u.id === currentId) || null;
  },

  setCurrentUser: (userId: string | null) => {
    if (userId) {
      localStorage.setItem(STORAGE_CURRENT_USER_KEY, userId);
    } else {
      localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
    }
  },

  registerOrLogin: (
    email: string,
    pin: string,
    shopName?: string,
    shopCategory?: string,
    name?: string,
    phone?: string,
    rememberMe: boolean = true
  ): { user: User; isNew: boolean } => {
    const users = StorageService.getAllUsers();
    const normalizedEmail = email.trim().toLowerCase();
    const isAdminEmail = normalizedEmail === ADMIN_EMAIL.toLowerCase();

    let existing = users.find(u => u.email.toLowerCase() === normalizedEmail);

    // If Admin email login
    if (isAdminEmail) {
      if (pin.trim() !== ADMIN_PASSWORD) {
        throw new Error('ভুল এডমিন পাসওয়ার্ড! এডমিন পাসওয়ার্ড (raju12158A+) সঠিকভাবে লিখুন।');
      }

      if (!existing) {
        existing = {
          id: 'user-admin-jahidul',
          email: 'Jahidulraju87@gmail.com',
          name: name?.trim() || 'জাহিদুল ইসলাম রাজু',
          phone: phone?.trim() || '01712158000',
          pin: ADMIN_PASSWORD,
          shopName: shopName?.trim() || 'খাতা+ কেন্দ্রীয় এডমিন হেডকোয়ার্টার',
          shopCategory: 'এডমিন কন্ট্রোল',
          createdAt: new Date().toISOString(),
          googleSheetId: 'admin_master_ledger_sheet',
          googleSheetUrl: 'https://docs.google.com/spreadsheets/d/admin_master_ledger_sheet/edit',
          isAdmin: true,
        };
        users.unshift(existing);
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
      } else {
        existing.isAdmin = true;
        existing.pin = ADMIN_PASSWORD;
        StorageService.saveUser(existing);
      }

      StorageService.setCurrentUser(existing.id);

      if (rememberMe) {
        StorageService.saveDeviceSession({
          deviceId: 'dev-' + existing.id,
          email: existing.email,
          pin: existing.pin,
          rememberMe: true,
          shopName: existing.shopName,
          lastActive: new Date().toISOString(),
        });
      }

      return { user: existing, isNew: false };
    }

    if (existing) {
      // Check Password/PIN for normal user
      if (existing.pin !== pin.trim()) {
        throw new Error('ভুল পাসওয়ার্ড / পিন দিয়েছেন! সঠিক পাসওয়ার্ড লিখুন।');
      }
      StorageService.setCurrentUser(existing.id);

      if (rememberMe) {
        StorageService.saveDeviceSession({
          deviceId: 'dev-' + existing.id,
          email: existing.email,
          pin: existing.pin,
          rememberMe: true,
          shopName: existing.shopName,
          lastActive: new Date().toISOString(),
        });
      }

      return { user: existing, isNew: false };
    }

    // Create New User (Regular User)
    const newUser: User = {
      id: generateId(),
      email: normalizedEmail,
      pin: pin.trim(),
      name: name?.trim() || email.split('@')[0],
      phone: phone?.trim() || '',
      shopName: shopName?.trim() || 'আমার দোকান',
      shopCategory: shopCategory || 'মুদি দোকান',
      createdAt: new Date().toISOString(),
      isAdmin: false, // Only Jahidulraju87@gmail.com is Admin
      dueThreshold: 2500,
    };

    // For new users, keep sheet unlinked until user creates or links their real Google Sheet
    newUser.googleSheetId = '';
    newUser.googleSheetUrl = '';

    StorageService.saveUser(newUser);
    StorageService.setCurrentUser(newUser.id);

    if (rememberMe) {
      StorageService.saveDeviceSession({
        deviceId: 'dev-' + newUser.id,
        email: newUser.email,
        pin: newUser.pin,
        rememberMe: true,
        shopName: newUser.shopName,
        lastActive: new Date().toISOString(),
      });
    }

    return { user: newUser, isNew: true };
  },

  // Customers
  getCustomers: (userId: string): Customer[] => {
    const raw = localStorage.getItem(STORAGE_CUSTOMERS_KEY);
    const all: Customer[] = raw ? JSON.parse(raw) : [];
    
    // Check if any customer is missing a code or if Raju A1111 should be seeded
    let updated = false;
    let nextCodeNum = 1000;
    all.forEach(c => {
      if (c.code) {
        const m = c.code.match(/^[A-Za-z](\d+)$/);
        if (m) {
          const num = parseInt(m[1], 10);
          if (num > nextCodeNum && num < 1111) nextCodeNum = num;
        }
      }
    });

    // If Raju with A1111 is missing for default user, add
    const hasRaju = all.some(c => c.code === 'A1111' || (c.name.includes('রাজু') && c.userId === userId));
    if (!hasRaju && (userId === 'user-demo-1' || userId.includes('demo'))) {
      all.push({
        id: 'cust-raju',
        userId,
        code: 'A1111',
        name: 'রাজু',
        phone: '01712158000',
        address: 'মিরপুর, ঢাকা',
        note: 'ভয়েস স্পেশাল কাস্টমার (A1111)',
        totalReceivable: 500,
        totalPayable: 0,
        netBalance: 500,
        lastTransactionAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      updated = true;
    }

    all.forEach(c => {
      if (!c.code) {
        nextCodeNum++;
        const numStr = nextCodeNum < 10000 ? String(nextCodeNum).padStart(4, '0') : String(nextCodeNum);
        c.code = `A${numStr}`;
        updated = true;
      }
    });

    if (updated) {
      localStorage.setItem(STORAGE_CUSTOMERS_KEY, JSON.stringify(all));
    }

    return all.filter(c => c.userId === userId);
  },

  generateNextCustomerCode: (customers: Customer[]): string => {
    return generateNextCustomerCode(customers);
  },

  saveCustomer: (customer: Customer) => {
    const raw = localStorage.getItem(STORAGE_CUSTOMERS_KEY);
    const all: Customer[] = raw ? JSON.parse(raw) : [];
    
    // Auto-assign code if missing
    if (!customer.code) {
      customer.code = generateNextCustomerCode(all);
    }

    const idx = all.findIndex(c => c.id === customer.id);
    if (idx >= 0) {
      all[idx] = customer;
    } else {
      all.push(customer);
    }
    localStorage.setItem(STORAGE_CUSTOMERS_KEY, JSON.stringify(all));
  },

  // Transactions
  getTransactions: (userId: string): Transaction[] => {
    const raw = localStorage.getItem(STORAGE_TRANSACTIONS_KEY);
    const all: Transaction[] = raw ? JSON.parse(raw) : [];
    return all
      .filter(t => t.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  addTransaction: (
    userId: string,
    customerId: string,
    type: TransactionType,
    amount: number,
    description: string,
    date?: string,
    paymentMethod?: PaymentMethod | string
  ): Transaction => {
    const customers = StorageService.getCustomers(userId);
    const customer = customers.find(c => c.id === customerId);
    if (!customer) throw new Error('কাস্টমার খুঁজে পাওয়া যায়নি');

    const numAmount = Math.max(0, Number(amount));

    // Check if DSR is credit locked by their moderator
    const currentUserObj = StorageService.getAllUsers().find(u => u.id === userId);
    if (currentUserObj?.isCreditLocked && (type === 'credit_given' || type === 'loan_given')) {
      throw new Error('আপনার মডারেটর সাময়িকভাবে নতুন বাকি দেওয়া স্থগিত/লক করেছেন। বাকি ছাড়া নগদ জমা/আদায় করতে পারবেন। মডারেটরের সাথে যোগাযোগ করুন।');
    }

    // Calculate updated balances strictly according to business ledger logic:
    // বাকি দিলাম (credit_given) -> পাওনা বৃদ্ধি
    // বাকি নিলাম (credit_taken) -> দেনা বৃদ্ধি
    // ধার দিলাম (loan_given) -> পাওনা বৃদ্ধি
    // ধার পেলাম (loan_taken) -> দেনা বৃদ্ধি
    // টাকা পেলাম (payment_received) -> বাকি টাকা দিলে মোট পাওনা থেকে বাদ যাবে
    // টাকা দিলাম (payment_given) -> দেনা থেকে বাদ যাবে

    if (type === 'credit_given' || type === 'loan_given') {
      customer.totalReceivable += numAmount;
    } else if (type === 'payment_received') {
      customer.totalReceivable = Math.max(0, customer.totalReceivable - numAmount);
    } else if (type === 'credit_taken' || type === 'loan_taken') {
      customer.totalPayable += numAmount;
    } else if (type === 'payment_given') {
      customer.totalPayable = Math.max(0, customer.totalPayable - numAmount);
    }

    customer.netBalance = customer.totalReceivable - customer.totalPayable;
    customer.lastTransactionAt = date || new Date().toISOString();

    StorageService.saveCustomer(customer);

    const isOnlineNow = typeof navigator !== 'undefined' ? navigator.onLine : false;

    const newTx: Transaction = {
      id: generateId(),
      userId,
      customerId,
      customerName: customer.name,
      customerPhone: customer.phone,
      type,
      amount: numAmount,
      description: description.trim() || getDefaultDescription(type),
      date: date || new Date().toISOString(),
      balanceAfter: customer.netBalance,
      syncedToSheet: isOnlineNow,
      paymentMethod: (paymentMethod as PaymentMethod) || 'cash',
    };

    const raw = localStorage.getItem(STORAGE_TRANSACTIONS_KEY);
    const all: Transaction[] = raw ? JSON.parse(raw) : [];
    all.push(newTx);
    localStorage.setItem(STORAGE_TRANSACTIONS_KEY, JSON.stringify(all));

    return newTx;
  },

  // Mark transactions as synced to Google Sheet
  markTransactionsSynced: (userId: string, txIds?: string[]) => {
    const raw = localStorage.getItem(STORAGE_TRANSACTIONS_KEY);
    if (!raw) return;
    try {
      const all: Transaction[] = JSON.parse(raw);
      let updated = false;
      all.forEach(t => {
        if (t.userId === userId) {
          if (!txIds || txIds.includes(t.id)) {
            if (!t.syncedToSheet) {
              t.syncedToSheet = true;
              updated = true;
            }
          }
        }
      });
      if (updated) {
        localStorage.setItem(STORAGE_TRANSACTIONS_KEY, JSON.stringify(all));
      }
    } catch (e) {
      console.warn('Error marking transactions synced:', e);
    }
  },

  // Get pending unsynced count
  getPendingSyncCount: (userId: string): number => {
    const transactions = StorageService.getTransactions(userId);
    return transactions.filter(t => !t.syncedToSheet).length;
  },

  // Expenses
  getExpenses: (userId: string): Expense[] => {
    const raw = localStorage.getItem(STORAGE_EXPENSES_KEY);
    const all: Expense[] = raw ? JSON.parse(raw) : [];
    return all.filter(e => e.userId === userId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  addExpense: (userId: string, category: string, amount: number, description: string): Expense => {
    const newExp: Expense = {
      id: generateId(),
      userId,
      category,
      amount: Number(amount),
      description: description.trim(),
      date: new Date().toISOString(),
    };
    const raw = localStorage.getItem(STORAGE_EXPENSES_KEY);
    const all: Expense[] = raw ? JSON.parse(raw) : [];
    all.push(newExp);
    localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(all));
    return newExp;
  },

  // Summaries
  getDashboardSummary: (userId: string) => {
    const customers = StorageService.getCustomers(userId);
    const transactions = StorageService.getTransactions(userId);
    const expenses = StorageService.getExpenses(userId);

    const totalReceivable = customers.reduce((sum, c) => sum + (c.totalReceivable || 0), 0);
    const totalPayable = customers.reduce((sum, c) => sum + (c.totalPayable || 0), 0);

    const todayStr = new Date().toDateString();
    const todayTransactions = transactions.filter(t => new Date(t.date).toDateString() === todayStr);
    const todayExpenses = expenses.filter(e => new Date(e.date).toDateString() === todayStr);

    const todayReceived = todayTransactions
      .filter(t => t.type === 'payment_received' || t.type === 'sale')
      .reduce((sum, t) => sum + t.amount, 0);

    const todayGiven = todayTransactions
      .filter(t => t.type === 'credit_given' || t.type === 'loan_given' || t.type === 'payment_given')
      .reduce((sum, t) => sum + t.amount, 0);

    const todaySales = todayTransactions
      .filter(t => t.type === 'credit_given' || t.type === 'sale')
      .reduce((sum, t) => sum + t.amount, 0);

    const todayExpenseAmount = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

    return {
      totalReceivable,
      totalPayable,
      todayReceived,
      todayGiven,
      todaySales,
      todayExpenseAmount,
      totalCustomers: customers.length,
      totalTransactions: transactions.length,
    };
  },

  // Central Admin Sheet Records
  getAdminSheetRecords: (): AdminUserRecord[] => {
    const users = StorageService.getAllUsers();
    return users.map(user => {
      const customers = StorageService.getCustomers(user.id);
      const transactions = StorageService.getTransactions(user.id);
      const totalReceivable = customers.reduce((s, c) => s + (c.totalReceivable || 0), 0);
      const totalPayable = customers.reduce((s, c) => s + (c.totalPayable || 0), 0);

      const isMod = user.isModerator === true || user.role === 'moderator';
      const assignedModerator = user.moderatorId ? users.find(u => u.id === user.moderatorId) : undefined;
      const assignedUsersCount = isMod ? users.filter(u => u.moderatorId === user.id && !u.isAdmin).length : undefined;

      return {
        userId: user.id,
        email: user.email,
        pin: user.pin,
        shopName: user.shopName,
        shopCategory: user.shopCategory || 'মুদি দোকান',
        customerCount: customers.length,
        transactionCount: transactions.length,
        totalReceivable,
        totalPayable,
        googleSheetId: user.googleSheetId,
        googleSheetUrl: user.googleSheetUrl,
        registeredAt: user.createdAt,
        lastActive: new Date().toISOString(),
        isAdmin: Boolean(user.isAdmin || user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()),
        isModerator: isMod,
        role: user.isAdmin ? 'admin' : isMod ? 'moderator' : 'user',
        moderatorId: user.moderatorId,
        moderatorName: assignedModerator?.name || (user.moderatorId ? 'মডারেটর' : undefined),
        assignedUsersCount,
      };
    });
  },

  // Moderator Management Methods
  isModeratorUser: (user: User | null | undefined): boolean => {
    if (!user) return false;
    return Boolean(user.isModerator === true || user.role === 'moderator');
  },

  getModerators: (): User[] => {
    const users = StorageService.getAllUsers();
    return users.filter(u => u.isModerator === true || u.role === 'moderator');
  },

  getUsersByModerator: (moderatorId: string): User[] => {
    const users = StorageService.getAllUsers();
    return users.filter(u => u.moderatorId === moderatorId && !u.isAdmin);
  },

  assignUserToModerator: (userId: string, moderatorId: string | null): boolean => {
    const users = StorageService.getAllUsers();
    const target = users.find(u => u.id === userId);
    if (!target) return false;
    target.moderatorId = moderatorId ? moderatorId : undefined;
    StorageService.saveUser(target);
    return true;
  },

  setModeratorRole: (userId: string, isModerator: boolean): boolean => {
    const users = StorageService.getAllUsers();
    const target = users.find(u => u.id === userId);
    if (!target || target.isAdmin) return false;
    target.isModerator = isModerator;
    target.role = isModerator ? 'moderator' : 'user';
    if (isModerator) {
      target.moderatorId = undefined;
    }
    StorageService.saveUser(target);
    return true;
  },

  addModeratorByEmail: (
    email: string,
    name?: string,
    pin?: string
  ): { success: boolean; message: string; user?: User; isNew?: boolean } => {
    const users = StorageService.getAllUsers();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return { success: false, message: 'সঠিক ইমেইল এড্রেস প্রদান করুন।' };
    }

    if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
      return { success: false, message: 'কেন্দ্রীয় এডমিন একাউন্টটি মডারেটর হিসেবে যোগ করা যাবে না।' };
    }

    let existing = users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      if (existing.isAdmin) {
        return { success: false, message: 'এডমিন একাউন্টকে মডারেটর করা যাবে না।' };
      }
      existing.isModerator = true;
      existing.role = 'moderator';
      existing.moderatorId = undefined; // moderators don't have a moderator above them
      if (name && name.trim()) existing.name = name.trim();
      if (pin && pin.trim()) existing.pin = pin.trim();
      StorageService.saveUser(existing);
      return {
        success: true,
        message: `"${existing.name || existing.email}" সফলভাবে মডারেটর হিসেবে নিযুক্ত হয়েছেন!`,
        user: existing,
        isNew: false,
      };
    }

    const defaultName = name?.trim() || normalizedEmail.split('@')[0];
    const defaultPin = pin?.trim() || '1234';
    const newMod: User = {
      id: 'user-mod-' + Math.random().toString(36).substring(2, 8),
      email: normalizedEmail,
      name: defaultName,
      phone: '',
      pin: defaultPin,
      shopName: defaultName + ' জোন',
      shopCategory: 'মডারেটর জোন',
      createdAt: new Date().toISOString(),
      isAdmin: false,
      isModerator: true,
      role: 'moderator',
    };
    users.push(newMod);
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    return {
      success: true,
      message: `নতুন মডারেটর একাউন্ট তৈরি করা হয়েছে! (${normalizedEmail}) - লগইন পিন: ${defaultPin}`,
      user: newMod,
      isNew: true,
    };
  },

  addShopToModeratorByEmail: (
    moderatorId: string,
    shopEmail: string
  ): { success: boolean; message: string; user?: User; isNew?: boolean } => {
    const users = StorageService.getAllUsers();
    const normalizedEmail = shopEmail.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return { success: false, message: 'সঠিক ডিএসআর (DSR) ইমেইল এড্রেস প্রদান করুন।' };
    }

    const moderator = users.find(u => u.id === moderatorId);
    if (!moderator) {
      return { success: false, message: 'মডারেটর খুঁজে পাওয়া যায়নি।' };
    }

    if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
      return { success: false, message: 'কেন্দ্রীয় এডমিন একাউন্টকে মডারেটরের অধীনে ডিএসআর হিসেবে নেওয়া যাবে না।' };
    }

    if (normalizedEmail === moderator.email.toLowerCase()) {
      return { success: false, message: 'মডারেটর নিজের একাউন্টকে নিজের অধীনে ডিএসআর হিসেবে যুক্ত করতে পারবেন না।' };
    }

    let existing = users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      if (existing.isAdmin) {
        return { success: false, message: 'এডমিন একাউন্টকে মডারেটরের অধীনে ডিএসআর হিসেবে যুক্ত করা সম্ভব নয়।' };
      }
      if (existing.isModerator && existing.id !== moderatorId) {
        // If they are another moderator, convert or alert
        return { success: false, message: 'এই ইমেইলটি ইতিমধ্যে অন্য একজন মডারেটরের একাউন্ট।' };
      }
      if (existing.moderatorId === moderatorId) {
        return { success: false, message: `এই ডিএসআর (${existing.name || existing.shopName || existing.email}) ইতিমধ্যে আপনার অধীনে যুক্ত আছেন।` };
      }
      if (existing.moderatorId && existing.moderatorId !== moderatorId) {
        const otherMod = users.find(u => u.id === existing.moderatorId);
        const modTitle = otherMod ? `"${otherMod.name || otherMod.shopName}"` : 'অন্য একজন মডারেটরের';
        return { 
          success: false, 
          message: `এই ডিএসআর (${existing.name || existing.email}) ইতিমধ্যে ${modTitle} অধীনে আছেন! এক মডারেটরের ডিএসআর অন্য মডারেটর যুক্ত করতে পারবে না।` 
        };
      }
      existing.moderatorId = moderatorId;
      StorageService.saveUser(existing);
      return {
        success: true,
        message: `ডিএসআর "${existing.name || existing.shopName}" (${existing.email}) সফলভাবে আপনার মডারেটর তালিকায় যুক্ত করা হয়েছে!`,
        user: existing,
        isNew: false,
      };
    }

    // If user does not exist, auto-register this DSR under this moderator!
    const defaultDsrTitle = 'ডিএসআর - ' + normalizedEmail.split('@')[0];
    const newShopUser: User = {
      id: 'user-' + Math.random().toString(36).substring(2, 9),
      email: normalizedEmail,
      name: normalizedEmail.split('@')[0],
      phone: '',
      pin: '1234',
      shopName: defaultDsrTitle,
      shopCategory: 'ডিএসআর ফিল্ড খাতা',
      createdAt: new Date().toISOString(),
      moderatorId: moderatorId,
      isAdmin: false,
      isModerator: false,
      role: 'user',
      dsrCreditLimit: 50000,
    };
    users.push(newShopUser);
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));

    return {
      success: true,
      message: `নতুন ডিএসআর "${defaultDsrTitle}" তৈরি করে আপনার অধীনে যুক্ত করা হয়েছে! (লগইন পিন: 1234)`,
      user: newShopUser,
      isNew: true,
    };
  },

  addDsrToModeratorByEmail: (moderatorId: string, dsrEmail: string) => {
    return StorageService.addShopToModeratorByEmail(moderatorId, dsrEmail);
  },

  removeShopFromModerator: (shopUserId: string): boolean => {
    const users = StorageService.getAllUsers();
    const target = users.find(u => u.id === shopUserId);
    if (!target) return false;
    target.moderatorId = undefined;
    StorageService.saveUser(target);
    return true;
  },

  removeDsrFromModerator: (dsrUserId: string): boolean => {
    return StorageService.removeShopFromModerator(dsrUserId);
  },

  createModeratorUser: (data: {
    name: string;
    email: string;
    pin: string;
    phone?: string;
    shopName?: string;
  }): User => {
    const users = StorageService.getAllUsers();
    const normalizedEmail = data.email.trim().toLowerCase();
    let existing = users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      existing.isModerator = true;
      existing.role = 'moderator';
      existing.pin = data.pin.trim() || existing.pin;
      if (data.name) existing.name = data.name.trim();
      if (data.phone) existing.phone = data.phone.trim();
      if (data.shopName) existing.shopName = data.shopName.trim();
      StorageService.saveUser(existing);
      return existing;
    }

    const newMod: User = {
      id: 'user-mod-' + Math.random().toString(36).substring(2, 8),
      email: normalizedEmail,
      name: data.name.trim() || 'মডারেটর',
      phone: data.phone?.trim() || '',
      pin: data.pin.trim() || '1234',
      shopName: data.shopName?.trim() || 'মডারেটর মনিটরিং হাব',
      shopCategory: 'মডারেটর জোন',
      createdAt: new Date().toISOString(),
      isAdmin: false,
      isModerator: true,
      role: 'moderator',
    };
    users.push(newMod);
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    return newMod;
  },

  // Moderator Aggregated & Individual Summary
  getModeratorSummary: (moderatorId: string) => {
    const users = StorageService.getAllUsers();
    const moderator = users.find(u => u.id === moderatorId);
    if (!moderator) return null;

    const assignedUsers = users.filter(u => u.moderatorId === moderatorId && !u.isAdmin);
    const todayStr = new Date().toDateString();

    let totalCustomers = 0;
    let totalReceivable = 0;
    let totalPayable = 0;
    let totalTransactions = 0;
    let todayReceived = 0;
    let todayGiven = 0;
    let todaySales = 0;

    const userRecords = assignedUsers.map(u => {
      const customers = StorageService.getCustomers(u.id);
      const transactions = StorageService.getTransactions(u.id);

      const uReceivable = customers.reduce((sum, c) => sum + (c.totalReceivable || 0), 0);
      const uPayable = customers.reduce((sum, c) => sum + (c.totalPayable || 0), 0);
      const uNet = uReceivable - uPayable;

      totalCustomers += customers.length;
      totalReceivable += uReceivable;
      totalPayable += uPayable;
      totalTransactions += transactions.length;

      const todayTxs = transactions.filter(t => new Date(t.date).toDateString() === todayStr);
      todayReceived += todayTxs
        .filter(t => t.type === 'payment_received' || t.type === 'sale')
        .reduce((sum, t) => sum + t.amount, 0);

      todayGiven += todayTxs
        .filter(t => t.type === 'credit_given' || t.type === 'loan_given' || t.type === 'payment_given')
        .reduce((sum, t) => sum + t.amount, 0);

      todaySales += todayTxs
        .filter(t => t.type === 'credit_given' || t.type === 'sale')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        user: u,
        customerCount: customers.length,
        transactionCount: transactions.length,
        totalReceivable: uReceivable,
        totalPayable: uPayable,
        netBalance: uNet,
        customers,
        transactions,
        lastActive: transactions[0]?.date || u.createdAt,
      };
    });

    return {
      moderator,
      totalAssignedUsers: assignedUsers.length,
      totalCustomers,
      totalReceivable,
      totalPayable,
      totalTransactions,
      todayReceived,
      todayGiven,
      todaySales,
      userRecords,
    };
  },

  // Update DSR Credit Limit (Only by Moderator or Super Admin)
  updateDsrCreditLimit: (dsrUserId: string, limit: number): boolean => {
    const users = StorageService.getAllUsers();
    const target = users.find(u => u.id === dsrUserId);
    if (!target) return false;
    target.dsrCreditLimit = Math.max(0, limit);
    StorageService.saveUser(target);
    return true;
  },

  // Update Customer Credit Limit for a specific DSR customer (Set by Moderator)
  updateCustomerCreditLimit: (customerId: string, limit: number): boolean => {
    const raw = localStorage.getItem(STORAGE_CUSTOMERS_KEY);
    if (!raw) return false;
    const all: Customer[] = JSON.parse(raw);
    const idx = all.findIndex(c => c.id === customerId);
    if (idx === -1) return false;
    all[idx].creditLimit = Math.max(0, limit);
    localStorage.setItem(STORAGE_CUSTOMERS_KEY, JSON.stringify(all));
    return true;
  },

  // Toggle DSR Credit Lock / Status (Set by Moderator)
  toggleDsrCreditLock: (dsrUserId: string): { success: boolean; isLocked: boolean; message: string } => {
    const users = StorageService.getAllUsers();
    const target = users.find(u => u.id === dsrUserId);
    if (!target) return { success: false, isLocked: false, message: 'ডিএসআর পাওয়া যায়নি' };
    
    const newLockState = !target.isCreditLocked;
    target.isCreditLocked = newLockState;
    target.dsrStatus = newLockState ? 'suspended' : 'active';
    StorageService.saveUser(target);

    return {
      success: true,
      isLocked: newLockState,
      message: newLockState 
        ? `"${target.name || target.shopName}"-এর নতুন বাকি দেওয়া সাময়িকভাবে বন্ধ (লক) করা হয়েছে।` 
        : `"${target.name || target.shopName}"-এর বাকি দেওয়া পুনরায় সচল (অনুমোদিত) করা হয়েছে।`
    };
  },

  // Update DSR Profile (Name, Phone, PIN, ShopName, CreditLimit)
  updateDsrProfile: (dsrUserId: string, data: {
    name?: string;
    phone?: string;
    pin?: string;
    shopName?: string;
    shopCategory?: string;
    dsrCreditLimit?: number;
  }): boolean => {
    const users = StorageService.getAllUsers();
    const target = users.find(u => u.id === dsrUserId);
    if (!target) return false;

    if (data.name !== undefined) target.name = data.name.trim();
    if (data.phone !== undefined) target.phone = data.phone.trim();
    if (data.pin !== undefined && data.pin.trim()) target.pin = data.pin.trim();
    if (data.shopName !== undefined) target.shopName = data.shopName.trim();
    if (data.shopCategory !== undefined) target.shopCategory = data.shopCategory.trim();
    if (data.dsrCreditLimit !== undefined) target.dsrCreditLimit = Math.max(0, data.dsrCreditLimit);

    StorageService.saveUser(target);
    return true;
  },

  // Get users not currently assigned to any moderator (and not admin/moderator)
  getUnassignedUsers: (): User[] => {
    const users = StorageService.getAllUsers();
    return users.filter(u => !u.isAdmin && !u.isModerator && !u.moderatorId);
  },

  // Check if a user is super admin
  isAdminUser: (user: User | null | undefined): boolean => {
    if (!user) return false;
    return user.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
  },

  checkAdminPin: (pin: string): boolean => {
    const trimmed = pin.trim();
    return trimmed === ADMIN_PASSWORD || trimmed === STORAGE_ADMIN_PIN || trimmed === '7860';
  }
};

const getDefaultDescription = (type: TransactionType): string => {
  switch (type) {
    case 'credit_given': return 'বাকিতে পণ্য বিক্রয়';
    case 'credit_taken': return 'বাকিতে মালামাল ক্রয়';
    case 'loan_given': return 'ধার প্রদান';
    case 'loan_taken': return 'ধার গ্রহণ';
    case 'payment_received': return 'নগদ জমা / বাকি আদায়';
    case 'payment_given': return 'নগদ দেনা পরিশোধ';
    case 'sale': return 'নগদ বিক্রয়';
    case 'expense': return 'দোকানের খরচ';
    default: return 'লেনদেন';
  }
};
