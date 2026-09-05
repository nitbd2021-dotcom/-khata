import React, { useState } from 'react';
import { X, Check, Receipt } from 'lucide-react';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: string, amount: number, description: string) => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [category, setCategory] = useState('বিদ্যুৎ বিল');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return;

    onSave(category, parsedAmount, description);
    setAmount('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">দোকানের খরচ যোগ করুন</h3>
              <p className="text-xs text-slate-500">ভাড়া, বিদ্যুৎ বিল, কর্মচারীর বেতন ইত্যাদি</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">খরচের খাত / ক্যাটাগরি</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
            >
              <option value="দোকান ভাড়া">দোকান ভাড়া</option>
              <option value="বিদ্যুৎ বিল">বিদ্যুৎ বিল</option>
              <option value="কর্মচারী বেতন">কর্মচারী বেতন</option>
              <option value="পরিবহন">পরিবহন খরচ</option>
              <option value="পণ্য ক্রয়">পণ্য ক্রয় / প্যাকিং</option>
              <option value="খাবার ও নাস্তা">খাবার ও নাস্তা</option>
              <option value="মেরামত">মেরামত ও রক্ষণাবেক্ষণ</option>
              <option value="অন্যান্য">অন্যান্য খরচ</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">টাকার পরিমাণ (৳)</label>
            <input
              type="number"
              placeholder="যেমন: 650"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">বিবরণ (ঐচ্ছিক)</label>
            <input
              type="text"
              placeholder="যেমন: চলতি মাসের বিদ্যুৎ বিল"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              খরচ সংরক্ষণ করুন
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
