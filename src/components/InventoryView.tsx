import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  RotateCcw, 
  Edit3, 
  Trash2, 
  Boxes, 
  ArrowDownLeft, 
  ArrowUpRight, 
  CheckCircle2, 
  History, 
  SlidersHorizontal, 
  Layers, 
  Tag, 
  Calendar, 
  DollarSign, 
  X,
  AlertCircle
} from 'lucide-react';
import { InventoryItem, StockMovementLog, User } from '../types';
import { StorageService } from '../services/storageService';

interface InventoryViewProps {
  user: User;
  onOpenAddTxWithProduct?: (item: InventoryItem) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ user, onOpenAddTxWithProduct }) => {
  const [items, setItems] = useState<InventoryItem[]>(() => StorageService.getInventory(user.id));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  
  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [adjustQuantity, setAdjustQuantity] = useState<string>('');
  const [adjustNote, setAdjustNote] = useState<string>('');
  
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [selectedItemForLogs, setSelectedItemForLogs] = useState<InventoryItem | null>(null);
  const [logs, setLogs] = useState<StockMovementLog[]>([]);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const refreshItems = () => {
    const updated = StorageService.getInventory(user.id);
    setItems(updated);
  };

  // Pre-fill / categories
  const categories = Array.from(new Set(items.map(i => i.category).filter(Boolean))) as string[];

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.code && item.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

    let matchesStock = true;
    const stock = Number(item.currentStock) || 0;
    const minAlert = Number(item.minStockAlert) || 5;

    if (stockFilter === 'in_stock') {
      matchesStock = stock > minAlert;
    } else if (stockFilter === 'low_stock') {
      matchesStock = stock > 0 && stock <= minAlert;
    } else if (stockFilter === 'out_of_stock') {
      matchesStock = stock === 0;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  // Calculate metrics
  const totalSku = items.length;
  const totalUnits = items.reduce((sum, i) => sum + (Number(i.currentStock) || 0), 0);
  const totalValuation = items.reduce((sum, i) => sum + ((Number(i.currentStock) || 0) * (Number(i.sellingPrice) || 0)), 0);
  const lowStockCount = items.filter(i => (Number(i.currentStock) || 0) <= (Number(i.minStockAlert) || 5) && (Number(i.currentStock) || 0) > 0).length;
  const outOfStockCount = items.filter(i => (Number(i.currentStock) || 0) === 0).length;

  // Handle Delete
  const handleDeleteItem = (item: InventoryItem) => {
    if (window.confirm(`আপনি কি নিশ্চিতভাবে "${item.name}" পণ্যটি স্টক তালিকা থেকে মুছে ফেলতে চান?`)) {
      StorageService.deleteInventoryItem(user.id, item.id);
      refreshItems();
      showNotification(`"${item.name}" সফলভাবে মুছে ফেলা হয়েছে!`);
    }
  };

  // Open Adjust Modal
  const openAdjustModal = (item: InventoryItem, defaultType: 'in' | 'out' | 'adjustment' = 'in') => {
    setAdjustingItem(item);
    setAdjustType(defaultType);
    setAdjustQuantity('');
    setAdjustNote('');
    setIsAdjustModalOpen(true);
  };

  // Submit Stock Adjustment
  const handleSaveStockAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;
    const qty = Number(adjustQuantity);
    if (isNaN(qty) || qty <= 0) {
      alert('সঠিক পরিমাণ সংখ্যা লিখুন');
      return;
    }

    const result = StorageService.adjustStock(
      user.id,
      adjustingItem.id,
      qty,
      adjustType,
      adjustNote.trim() || undefined
    );

    if (result.success) {
      refreshItems();
      setIsAdjustModalOpen(false);
      showNotification(`"${adjustingItem.name}" পণ্যের স্টক সফলভাবে আপডেট হয়েছে! নতুন স্টক: ${result.newStock} ${adjustingItem.unit}`);
    } else {
      alert(result.error || 'স্টক আপডেট করতে ব্যর্থ হয়েছে');
    }
  };

  // Open Logs Modal
  const openLogsModal = (item?: InventoryItem) => {
    const fetchedLogs = StorageService.getStockLogs(user.id, item ? item.id : undefined);
    setSelectedItemForLogs(item || null);
    setLogs(fetchedLogs);
    setIsLogsModalOpen(true);
  };

  // Handle Load Demo Inventory
  const handleLoadDemoInventory = () => {
    const seeded = StorageService.seedSampleInventory(user.id);
    setItems(seeded);
    showNotification('নমুনা ডেমো পণ্য তালিকা সফলভাবে লোড হয়েছে!');
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>পণ্য ইনভেন্টরি ও স্টক খাতা</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                DSR পণ্য মজুদ ট্র্যাক করুন • বাকি বিক্রির সাথে স্বয়ংক্রিয় স্টক কর্তন
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => openLogsModal()}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer active:scale-95"
            >
              <History className="w-4 h-4 text-slate-500" />
              <span>স্টক হিস্ট্রি লগ</span>
            </button>

            <button
              onClick={() => {
                setEditingItem(null);
                setIsAddEditModalOpen(true);
              }}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন পণ্য যোগ</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold">মোট পণ্য (SKU)</span>
              <Package className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {totalSku.toLocaleString('bn-BD')} টি
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              মোট মজুদ: {totalUnits.toLocaleString('bn-BD')} ইউনিট
            </div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5">
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-xs font-bold">মজুদ পণ্যের মূল্য</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-700">
              ৳ {totalValuation.toLocaleString('bn-BD')}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
              খুচরা বিক্রয় মূল্যের হিসেবে
            </div>
          </div>

          <div 
            onClick={() => setStockFilter(stockFilter === 'low_stock' ? 'all' : 'low_stock')}
            className={`border rounded-2xl p-3.5 cursor-pointer transition ${
              stockFilter === 'low_stock' 
                ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-400/40' 
                : 'bg-amber-50/70 border-amber-200/80 hover:bg-amber-100/50'
            }`}
          >
            <div className="flex items-center justify-between text-amber-700 mb-1">
              <span className="text-xs font-bold">লো-স্টক সতর্কতা</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-800">
              {lowStockCount.toLocaleString('bn-BD')} টি
            </div>
            <div className="text-[11px] text-amber-600 font-medium mt-0.5">
              সীমার নিচে পণ্য (রিস্টক করুন)
            </div>
          </div>

          <div 
            onClick={() => setStockFilter(stockFilter === 'out_of_stock' ? 'all' : 'out_of_stock')}
            className={`border rounded-2xl p-3.5 cursor-pointer transition ${
              stockFilter === 'out_of_stock' 
                ? 'bg-red-100 border-red-400 ring-2 ring-red-400/40' 
                : 'bg-red-50/70 border-red-200/80 hover:bg-red-100/50'
            }`}
          >
            <div className="flex items-center justify-between text-red-700 mb-1">
              <span className="text-xs font-bold">স্টক শেষ (০ ইউনিট)</span>
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-red-800">
              {outOfStockCount.toLocaleString('bn-BD')} টি
            </div>
            <div className="text-[11px] text-red-600 font-medium mt-0.5">
              বর্তমানে শূন্য মজুদ
            </div>
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between transition animate-fadeIn ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-300 text-emerald-800' 
            : 'bg-red-50 border border-red-300 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="পণ্যের নাম, বারকোড বা কোড দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Stock Filter Pills */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                stockFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              সব ({items.length})
            </button>
            <button
              onClick={() => setStockFilter('in_stock')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                stockFilter === 'in_stock'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
              }`}
            >
              মজুদ আছে
            </button>
            <button
              onClick={() => setStockFilter('low_stock')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                stockFilter === 'low_stock'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60'
              }`}
            >
              লো-স্টক ({lowStockCount})
            </button>
            <button
              onClick={() => setStockFilter('out_of_stock')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                stockFilter === 'out_of_stock'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200/60'
              }`}
            >
              স্টক শেষ ({outOfStockCount})
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 text-xs">
            <span className="text-slate-400 font-bold shrink-0 mr-1 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              ক্যাটাগরি:
            </span>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-md font-bold whitespace-nowrap cursor-pointer transition ${
                selectedCategory === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              সব ক্যাটাগরি
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md font-bold whitespace-nowrap cursor-pointer transition ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product List Cards */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Boxes className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800">
            কোনো পণ্য পাওয়া যায়নি
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-5">
            {searchQuery 
              ? 'আপনার অনুসন্ধানের সাথে কোনো পণ্যের নাম বা কোড মিলেনি।' 
              : 'আপনার তালিকায় কোনো পণ্য নেই। নতুন পণ্য যোগ করুন অথবা নমুনা তালিকা লোড করুন।'}
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setEditingItem(null);
                setIsAddEditModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন পণ্য যোগ করুন</span>
            </button>

            {items.length === 0 && (
              <button
                onClick={handleLoadDemoInventory}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
              >
                <Boxes className="w-4 h-4 text-emerald-600" />
                <span>নমুনা ডেমো পণ্য লোড করুন</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => {
            const stock = Number(item.currentStock) || 0;
            const minAlert = Number(item.minStockAlert) || 5;
            const isOutOfStock = stock === 0;
            const isLowStock = !isOutOfStock && stock <= minAlert;
            const stockValue = stock * (Number(item.sellingPrice) || 0);

            return (
              <div 
                key={item.id}
                className={`bg-white rounded-3xl p-5 border transition duration-150 flex flex-col justify-between shadow-xs hover:shadow-md ${
                  isOutOfStock 
                    ? 'border-red-300 bg-red-50/10' 
                    : isLowStock 
                    ? 'border-amber-300 bg-amber-50/10' 
                    : 'border-slate-200/80 hover:border-emerald-300'
                }`}
              >
                <div>
                  {/* Top Tags */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.category && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {item.category}
                        </span>
                      )}
                      {item.code && (
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                          #{item.code}
                        </span>
                      )}
                    </div>

                    {/* Stock Status Badge */}
                    {isOutOfStock ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-red-100 text-red-700 border border-red-200 flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        স্টক শেষ!
                      </span>
                    ) : isLowStock ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1 shrink-0">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        লো-স্টক ({stock} {item.unit})
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        মজুদ পর্যাপ্ত
                      </span>
                    )}
                  </div>

                  {/* Product Title */}
                  <h4 className="text-base font-bold text-slate-900 leading-snug line-clamp-2">
                    {item.name}
                  </h4>

                  {/* Stock Quantity Highlight */}
                  <div className="mt-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 block">
                        বর্তমান মজুদ (Stock)
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className={`text-2xl font-black ${
                          isOutOfStock 
                            ? 'text-red-600' 
                            : isLowStock 
                            ? 'text-amber-600' 
                            : 'text-slate-900'
                        }`}>
                          {stock.toLocaleString('bn-BD')}
                        </span>
                        <span className="text-xs font-bold text-slate-600">
                          {item.unit}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-500 block">
                        বিক্রয় দর
                      </span>
                      <span className="text-base font-black text-emerald-700">
                        ৳ {item.sellingPrice.toLocaleString('bn-BD')}
                      </span>
                      {item.costPrice && (
                        <span className="text-[10px] text-slate-400 block">
                          কেনা: ৳{item.costPrice}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stock Value info */}
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 px-1">
                    <span>মোট স্টক মূল্য: <strong>৳ {stockValue.toLocaleString('bn-BD')}</strong></span>
                    <span>সতর্কতা সীমা: {item.minStockAlert || 5} {item.unit}</span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => openAdjustModal(item, 'in')}
                    className="flex-1 inline-flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition border border-emerald-200/80 cursor-pointer active:scale-95"
                    title="স্টক বাড়ান বা কমান"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>± স্টক পরিবর্তন</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openLogsModal(item)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                    title="এই পণ্যের হিস্ট্রি লগ দেখুন"
                  >
                    <History className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(item);
                      setIsAddEditModalOpen(true);
                    }}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                    title="পণ্য এডিট করুন"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item)}
                    className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer"
                    title="পণ্য মুছুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================
          Add / Edit Product Modal
      ========================================================= */}
      {isAddEditModalOpen && (
        <AddEditProductModal
          isOpen={isAddEditModalOpen}
          onClose={() => {
            setIsAddEditModalOpen(false);
            setEditingItem(null);
          }}
          user={user}
          editingItem={editingItem}
          onSaved={(savedItem) => {
            refreshItems();
            setIsAddEditModalOpen(false);
            setEditingItem(null);
            showNotification(editingItem ? `"${savedItem.name}" তথ্য আপডেট হয়েছে!` : `"${savedItem.name}" নতুন পণ্য হিসেবে যোগ হয়েছে!`);
          }}
        />
      )}

      {/* =========================================================
          Stock Quick Adjust Modal
      ========================================================= */}
      {isAdjustModalOpen && adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden my-auto animate-scaleUp">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  স্টক সমন্বয় ও পরিবর্তন
                </h3>
                <p className="text-xs text-slate-500">
                  {adjustingItem.name}
                </p>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStockAdjustment} className="p-5 space-y-4">
              {/* Current Stock Banner */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">বর্তমান মজুদ:</span>
                <span className="text-sm font-black text-slate-900">
                  {adjustingItem.currentStock} {adjustingItem.unit}
                </span>
              </div>

              {/* Adjust Type Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  পরিবর্তনের ধরন
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('in')}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border cursor-pointer ${
                      adjustType === 'in'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>স্টক যোগ (+)</span>
                    <span className="text-[10px] font-normal opacity-80">রিস্টক/ক্রয়</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustType('out')}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border cursor-pointer ${
                      adjustType === 'out'
                        ? 'bg-red-600 text-white border-red-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>স্টক বাদ (-)</span>
                    <span className="text-[10px] font-normal opacity-80">নষ্ট/ফেরত</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustType('adjustment')}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border cursor-pointer ${
                      adjustType === 'adjustment'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>সরাসরি সেট</span>
                    <span className="text-[10px] font-normal opacity-80">ভৌত গণনা</span>
                  </button>
                </div>
              </div>

              {/* Quantity Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {adjustType === 'adjustment' ? 'সরাসরি নতুন মোট মজুদ সংখ্যা' : 'পরিমাণ'} ({adjustingItem.unit})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    required
                    autoFocus
                    min="0"
                    placeholder={`যেমন: ১০`}
                    value={adjustQuantity}
                    onChange={e => setAdjustQuantity(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    {adjustingItem.unit}
                  </span>
                </div>
              </div>

              {/* Result Preview */}
              {adjustQuantity && !isNaN(Number(adjustQuantity)) && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center justify-between">
                  <span>আপডেটের পর নতুন মজুদ হবে:</span>
                  <span className="text-sm font-black">
                    {adjustType === 'in' 
                      ? `${adjustingItem.currentStock + Number(adjustQuantity)} ${adjustingItem.unit}` 
                      : adjustType === 'out' 
                      ? `${Math.max(0, adjustingItem.currentStock - Number(adjustQuantity))} ${adjustingItem.unit}` 
                      : `${Number(adjustQuantity)} ${adjustingItem.unit}`}
                  </span>
                </div>
              )}

              {/* Note / Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  কারণ বা নোট (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder={adjustType === 'in' ? 'যেমন: কারখানা থেকে নতুন চালান রিস্টক' : adjustType === 'out' ? 'যেমন: ডেমেজ/প্যাকেট ছেঁড়া' : 'যেমন: মাস শেষের গোডাউন হিসাব'}
                  value={adjustNote}
                  onChange={e => setAdjustNote(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer active:scale-95"
                >
                  স্টক সেভ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          Stock Movement Logs Modal
      ========================================================= */}
      {isLogsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[90vh] flex flex-col animate-scaleUp">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    স্টক মুভমেন্ট ও অডিট হিস্ট্রি
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedItemForLogs ? `ফিল্টার: ${selectedItemForLogs.name}` : 'সকল পণ্যের স্টক লেনদেন ও বাকি বিক্রির কর্তন লগ'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLogsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {logs.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Boxes className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-semibold">কোনো স্টক মুভমেন্ট লগ রেকর্ড নেই</p>
                  <p className="text-xs text-slate-400 mt-1">বাকি বিক্রি বা স্টক সমন্বয় করলে এখানে স্বয়ংক্রিয়ভাবে অডিট ট্রেইল তৈরি হবে।</p>
                </div>
              ) : (
                logs.map(log => {
                  const isOut = log.type === 'out';
                  const isIn = log.type === 'in';

                  return (
                    <div 
                      key={log.id}
                      className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isOut 
                            ? 'bg-red-100 text-red-600' 
                            : isIn 
                            ? 'bg-emerald-100 text-emerald-600' 
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          {isOut ? <ArrowUpRight className="w-4 h-4" /> : isIn ? <ArrowDownLeft className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                        </div>

                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            {log.itemName}
                          </div>
                          <div className="text-slate-600 mt-0.5">
                            {log.note || (isOut ? 'পণ্য বিক্রি / কর্তন' : isIn ? 'রিস্টক' : 'স্টক সমন্বয়')}
                          </div>
                          {log.relatedCustomerName && (
                            <div className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                              ক্রেতা: {log.relatedCustomerName}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 mt-1">
                            {new Date(log.date).toLocaleString('bn-BD')}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`font-black text-sm ${
                          isOut ? 'text-red-600' : isIn ? 'text-emerald-600' : 'text-blue-600'
                        }`}>
                          {isOut ? `-${log.quantity}` : isIn ? `+${log.quantity}` : `${log.quantity}`}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          মজুদ: {log.previousStock} ➔ <strong>{log.newStock}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================
// Add or Edit Product Modal Component
// =========================================================
interface AddEditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  editingItem: InventoryItem | null;
  onSaved: (item: InventoryItem) => void;
}

const COMMON_CATEGORIES = ['মুদি ও খাদ্যশস্য', 'স্ন্যাক্স ও চিপস', 'পানীয় ও বেভারেজ', 'বেকারি ও বিস্কুট', 'কসমেটিকস ও সাবান', 'ডিটারজেন্ট ও ক্লিনার', 'তেল ও মশলা', 'অন্যান্য'];
const COMMON_UNITS = ['পিস', 'প্যাকেট', 'কার্টুন', 'বস্তা', 'কেজি', 'লিটার', 'বোতল', 'ডজন'];

const AddEditProductModal: React.FC<AddEditProductModalProps> = ({
  isOpen,
  onClose,
  user,
  editingItem,
  onSaved
}) => {
  const [name, setName] = useState(editingItem?.name || '');
  const [code, setCode] = useState(editingItem?.code || '');
  const [category, setCategory] = useState(editingItem?.category || 'মুদি ও খাদ্যশস্য');
  const [unit, setUnit] = useState(editingItem?.unit || 'প্যাকেট');
  const [sellingPrice, setSellingPrice] = useState(editingItem ? String(editingItem.sellingPrice) : '');
  const [costPrice, setCostPrice] = useState(editingItem?.costPrice ? String(editingItem.costPrice) : '');
  const [currentStock, setCurrentStock] = useState(editingItem ? String(editingItem.currentStock) : '0');
  const [minStockAlert, setMinStockAlert] = useState(editingItem?.minStockAlert ? String(editingItem.minStockAlert) : '5');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('পণ্যের নাম লিখুন');
      return;
    }
    const sellPriceNum = Number(sellingPrice);
    if (isNaN(sellPriceNum) || sellPriceNum < 0) {
      setErrorMsg('সঠিক বিক্রয় দর লিখুন');
      return;
    }

    const item: InventoryItem = {
      id: editingItem ? editingItem.id : 'prd-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      userId: user.id,
      name: name.trim(),
      code: code.trim() || undefined,
      category: category.trim() || undefined,
      unit: unit.trim() || 'পিস',
      sellingPrice: sellPriceNum,
      costPrice: costPrice ? Number(costPrice) : undefined,
      currentStock: Number(currentStock) || 0,
      minStockAlert: Number(minStockAlert) || 5,
      lastRestockedAt: editingItem?.lastRestockedAt || new Date().toISOString(),
      createdAt: editingItem?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    StorageService.saveInventoryItem(item);
    onSaved(item);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[95vh] flex flex-col animate-scaleUp">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">
              {editingItem ? 'পণ্য তথ্য পরিবর্তন করুন' : 'নতুন পণ্য যুক্ত করুন'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Product Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              পণ্যের নাম <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="যেমন: প্রাণ পটেটো ক্র্যাকার্স (৫০ গ্রাম)"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
            />
          </div>

          {/* Code and Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                বারকোড / প্রোডাক্ট কোড (ঐচ্ছিক)
              </label>
              <input
                type="text"
                placeholder="যেমন: PRD-101"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ক্যাটাগরি
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
              >
                {COMMON_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Unit and Opening Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                একক / ইউনিট (Unit)
              </label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
              >
                {COMMON_UNITS.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                বর্তমান মজুদ সংখ্যা (Opening Stock)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={currentStock}
                onChange={e => setCurrentStock(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                খুচরা বিক্রয় দর (৳) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                required
                min="0"
                placeholder="যেমন: ১৫"
                value={sellingPrice}
                onChange={e => setSellingPrice(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-black text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ক্রয় / পাইকারি দর (৳) (ঐচ্ছিক)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="যেমন: ১২"
                value={costPrice}
                onChange={e => setCostPrice(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Min Stock Alert */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              লো-স্টক সতর্কতা সীমা (Low Stock Alert Threshold)
            </label>
            <input
              type="number"
              min="1"
              placeholder="৫"
              value={minStockAlert}
              onChange={e => setMinStockAlert(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              মজুদ এই সংখ্যার নিচে নামলে তালিকায় হলুদ/লাল সতর্কবার্তা দেখাবে।
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer active:scale-95"
            >
              {editingItem ? 'আপডেট সংরক্ষণ করুন' : 'পণ্য যোগ করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
