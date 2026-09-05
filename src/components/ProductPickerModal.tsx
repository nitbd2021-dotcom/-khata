import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Minus, 
  Check, 
  AlertTriangle, 
  Package, 
  Boxes, 
  Trash2, 
  ShoppingBag,
  Info
} from 'lucide-react';
import { InventoryItem, TransactionItemDetail, User } from '../types';
import { StorageService } from '../services/storageService';

interface ProductPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  initialSelectedItems?: TransactionItemDetail[];
  onConfirm: (selectedItems: TransactionItemDetail[]) => void;
}

export const ProductPickerModal: React.FC<ProductPickerModalProps> = ({
  isOpen,
  onClose,
  user,
  initialSelectedItems = [],
  onConfirm,
}) => {
  const inventory = useMemo(() => StorageService.getInventory(user.id), [user.id]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Map of itemId -> quantity
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    initialSelectedItems.forEach(item => {
      map[item.itemId] = item.quantity;
    });
    return map;
  });

  // Map of custom unit prices if needed (defaults to item selling price)
  const [unitPrices, setUnitPrices] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    initialSelectedItems.forEach(item => {
      map[item.itemId] = item.unitPrice;
    });
    return map;
  });

  if (!isOpen) return null;

  const categories = Array.from(new Set(inventory.map(i => i.category).filter(Boolean))) as string[];

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.code && item.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleUpdateQty = (itemId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const handleSetExactQty = (itemId: string, val: string) => {
    const num = parseFloat(val);
    setQuantities(prev => {
      if (isNaN(num) || num <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: num };
    });
  };

  const handleSetUnitPrice = (itemId: string, val: string) => {
    const num = parseFloat(val);
    setUnitPrices(prev => {
      if (isNaN(num) || num < 0) return prev;
      return { ...prev, [itemId]: num };
    });
  };

  // Compile selected items details
  const selectedItemsList: TransactionItemDetail[] = Object.entries(quantities)
    .filter(([_, qty]) => Number(qty) > 0)
    .map(([itemId, qty]) => {
      const qtyNum = Number(qty);
      const invItem = inventory.find(i => i.id === itemId);
      const price = unitPrices[itemId] !== undefined 
        ? unitPrices[itemId] 
        : (invItem?.sellingPrice || 0);

      return {
        itemId,
        itemName: invItem?.name || 'অজানা পণ্য',
        quantity: qtyNum,
        unit: invItem?.unit || 'পিস',
        unitPrice: price,
        totalPrice: qtyNum * price,
      };
    });

  const totalItemCount = selectedItemsList.length;
  const totalUnits = selectedItemsList.reduce((sum, i) => sum + i.quantity, 0);
  const grandTotal = selectedItemsList.reduce((sum, i) => sum + i.totalPrice, 0);

  const handleSaveAndClose = () => {
    onConfirm(selectedItemsList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[95vh] flex flex-col animate-scaleUp">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                স্টক থেকে পণ্য নির্বাচন করুন
              </h3>
              <p className="text-xs text-slate-500">
                বাকি লেনদেনের সাথে নির্বাচিত পণ্যের মজুদ স্বয়ংক্রিয়ভাবে বাদ যাবে
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="পণ্য বা বারকোড খুঁজুন..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
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

          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-0.5">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap cursor-pointer transition ${
                  selectedCategory === 'all'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                সব পণ্য ({inventory.length})
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap cursor-pointer transition ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Items List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5 max-h-[50vh]">
          {filteredInventory.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold text-slate-600">কোনো পণ্য পাওয়া যায়নি</p>
              <p className="text-xs text-slate-400 mt-0.5">অনুসন্ধানের সাথে কোনো পণ্য মেলেনি।</p>
            </div>
          ) : (
            filteredInventory.map(item => {
              const qty = quantities[item.id] || 0;
              const unitPrice = unitPrices[item.id] !== undefined ? unitPrices[item.id] : item.sellingPrice;
              const subtotal = qty * unitPrice;
              const stock = Number(item.currentStock) || 0;
              const isLowStock = stock <= (item.minStockAlert || 5) && stock > 0;
              const isOutOfStock = stock === 0;
              const isSelected = qty > 0;
              const exceedsStock = qty > stock;

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-2xl border transition ${
                    isSelected
                      ? exceedsStock
                        ? 'border-amber-400 bg-amber-50/20'
                        : 'border-emerald-500/80 bg-emerald-50/20 shadow-2xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">
                          {item.name}
                        </span>
                        {item.code && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                            #{item.code}
                          </span>
                        )}
                      </div>

                      {/* Stock availability & unit price */}
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <span className="font-extrabold text-emerald-700">
                          দর: ৳{unitPrice}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className={`font-semibold flex items-center gap-1 ${
                          isOutOfStock 
                            ? 'text-red-600 font-bold' 
                            : isLowStock 
                            ? 'text-amber-600 font-bold' 
                            : 'text-slate-500'
                        }`}>
                          মজুদ: {stock} {item.unit}
                          {isOutOfStock && <span className="text-[10px] bg-red-100 px-1 rounded text-red-700 font-black">শেষ!</span>}
                        </span>
                      </div>

                      {/* Warning if requested qty exceeds stock */}
                      {exceedsStock && (
                        <div className="mt-1 text-[11px] font-bold text-amber-700 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>স্টকে মাত্র {stock} {item.unit} আছে (অতিরিক্ত দিলে স্টক নেগেটিভ হবে)</span>
                        </div>
                      )}
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSelected ? (
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.id, -1)}
                            className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shadow-2xs cursor-pointer active:scale-95"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={qty}
                            onChange={e => handleSetExactQty(item.id, e.target.value)}
                            className="w-12 text-center text-xs font-black bg-transparent focus:outline-none text-slate-900"
                          />

                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.id, 1)}
                            className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-2xs cursor-pointer active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, 1)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>যোগ করুন</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subtotal row when selected */}
                  {isSelected && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">
                        মোট: {qty} {item.unit} x ৳{unitPrice}
                      </span>
                      <span className="font-black text-emerald-800">
                        = ৳ {subtotal.toLocaleString('bn-BD')}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Persistent Bottom Bar */}
        <div className="p-4 border-t border-slate-200 bg-white shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 block font-medium">
                নির্বাচিত পণ্য ({totalItemCount} টি আইটেম, {totalUnits} ইউনিট)
              </span>
              <span className="text-lg font-black text-emerald-700">
                মোট বিল: ৳ {grandTotal.toLocaleString('bn-BD')}
              </span>
            </div>

            {totalItemCount > 0 && (
              <button
                type="button"
                onClick={() => setQuantities({})}
                className="text-xs text-red-600 hover:underline font-bold"
              >
                সব খালি করুন
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>
                {totalItemCount > 0 ? `হিসাবে যুক্ত করুন (৳ ${grandTotal.toLocaleString('bn-BD')})` : 'পণ্য ছাড়া সম্পন্ন করুন'}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
