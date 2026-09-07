import React, { useState, useEffect } from 'react';
import { 
  X, 
  Tag, 
  Check, 
  Plus, 
  AlertTriangle, 
  UserCheck, 
  Package, 
  Ban, 
  Star, 
  ShoppingBag,
  Info
} from 'lucide-react';
import { Customer } from '../types';
import { PRESET_CUSTOMER_TAGS, getTagDefinition } from '../constants/customerTags';
import { CustomerTagBadge } from './CustomerTagBadge';
import { StorageService } from '../services/storageService';

interface CustomerTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSaveTags: (customerId: string, updatedTags: string[]) => void;
}

export const CustomerTagModal: React.FC<CustomerTagModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSaveTags,
}) => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [userCustomTags, setUserCustomTags] = useState<string[]>([]);

  useEffect(() => {
    if (customer) {
      setSelectedTags(customer.tags || []);
      const pool = StorageService.getCustomTags(customer.userId || '');
      setUserCustomTags(pool);
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  const toggleTag = (tagId: string) => {
    const norm = tagId.trim().toLowerCase();
    setSelectedTags(prev => {
      const exists = prev.some(t => t.toLowerCase() === norm);
      if (exists) {
        return prev.filter(t => t.toLowerCase() !== norm);
      } else {
        return [...prev, tagId.trim()];
      }
    });
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customTagInput.trim();
    if (!clean) return;

    const lower = clean.toLowerCase();
    if (!selectedTags.some(t => t.toLowerCase() === lower)) {
      setSelectedTags(prev => [...prev, clean]);
    }
    if (customer.userId) {
      StorageService.addCustomTag(customer.userId, clean);
      setUserCustomTags(StorageService.getCustomTags(customer.userId));
    }
    setCustomTagInput('');
    setIsAddingCustom(false);
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tagId));
  };

  const handleSave = () => {
    onSaveTags(customer.id, selectedTags);
    onClose();
  };

  const isBlocked = selectedTags.includes('blocked');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                কাস্টমার ট্যাগ ও ক্যাটাগরি
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {customer.name} {customer.code ? `[${customer.code}]` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-200 border border-slate-200 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* Blocked Warning */}
          {isBlocked && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-900 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-extrabold block">সতর্কতা: ব্লকড / স্থগিত ট্যাগ নির্বাচিত</span>
                <span className="text-red-700 text-[11px] leading-relaxed">
                  এই কাস্টমারকে ব্লকড চিহ্নিত করলে তালিকায় লাল সতর্কতা দেখাবে এবং নতুন বাকি দেওয়ার ক্ষেত্রে নোটিশ প্রদর্শিত হবে।
                </span>
              </div>
            </div>
          )}

          {/* Active Tags Preview */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              বর্তমানে নির্বাচিত ট্যাগ ({selectedTags.length}টি):
            </label>
            {selectedTags.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-1">
                কোনো ট্যাগ নির্বাচিত নেই। নিচের তালিকা থেকে ক্যাটাগরি বাছাই করুন।
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
                {selectedTags.map(tagId => (
                  <CustomerTagBadge
                    key={tagId}
                    tagId={tagId}
                    size="md"
                    removable
                    onRemove={() => handleRemoveTag(tagId)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Preset Tags Grid */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              স্ট্যান্ডার্ড ট্যাগসমূহ (ক্লিক করে চালু/বন্ধ করুন):
            </label>
            <div className="grid grid-cols-1 gap-2">
              {PRESET_CUSTOMER_TAGS.map(preset => {
                const isSelected = selectedTags.includes(preset.id);
                
                const renderPresetIcon = () => {
                  switch (preset.iconType) {
                    case 'regular':
                      return <UserCheck className="w-4 h-4 text-emerald-600" />;
                    case 'wholesale':
                      return <Package className="w-4 h-4 text-blue-600" />;
                    case 'blocked':
                      return <Ban className="w-4 h-4 text-red-600" />;
                    case 'vip':
                      return <Star className="w-4 h-4 text-amber-600 fill-amber-400" />;
                    case 'retail':
                      return <ShoppingBag className="w-4 h-4 text-purple-600" />;
                    default:
                      return <Tag className="w-4 h-4 text-slate-600" />;
                  }
                };

                return (
                  <div
                    key={preset.id}
                    onClick={() => toggleTag(preset.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer ${
                      isSelected
                        ? `${preset.badgeClass} ring-2 ring-emerald-500/20 shadow-xs font-bold`
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        isSelected ? 'bg-white shadow-2xs' : 'bg-slate-100'
                      }`}>
                        {renderPresetIcon()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{preset.bnLabel}</span>
                          <span className="text-[10px] font-mono uppercase text-slate-500">
                            ({preset.label})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">{preset.description}</p>
                      </div>
                    </div>

                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition ${
                      isSelected
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 bg-white text-transparent'
                    }`}>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* User's Custom Tags Section (if any defined) */}
          {userCustomTags.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 block mb-2">
                আপনার নিজস্ব ট্যাগসমূহ:
              </label>
              <div className="flex flex-wrap gap-2">
                {userCustomTags.map(tag => {
                  const norm = tag.trim().toLowerCase();
                  const isSelected = selectedTags.some(t => t.toLowerCase() === norm);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Tag className="w-3 h-3" />
                      <span>{tag}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Tag Section */}
          <div className="pt-2 border-t border-slate-100">
            {isAddingCustom ? (
              <form onSubmit={handleAddCustomTag} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="নতুন ট্যাগের নাম (যেমন: হোটেল, কর্পোরেট, ফ্রিল্যান্সার)..."
                  value={customTagInput}
                  onChange={e => setCustomTagInput(e.target.value)}
                  autoFocus
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
                <button
                  type="submit"
                  disabled={!customTagInput.trim()}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  যুক্ত করুন
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCustom(false);
                    setCustomTagInput('');
                  }}
                  className="px-2.5 py-2 text-xs text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  বাতিল
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingCustom(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 cursor-pointer py-1"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>+ নিজস্ব কাস্টম ট্যাগ তৈরি করুন</span>
              </button>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            বাতিল
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>ট্যাগ সংরক্ষণ করুন</span>
          </button>
        </div>
      </div>
    </div>
  );
};
