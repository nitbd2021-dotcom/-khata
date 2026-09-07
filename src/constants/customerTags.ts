export interface CustomerTagDef {
  id: string;
  label: string;
  bnLabel: string;
  description: string;
  badgeClass: string;
  activeFilterClass: string;
  hoverClass: string;
  dotColor: string;
  iconType: 'regular' | 'wholesale' | 'blocked' | 'vip' | 'retail' | 'custom';
}

export const PRESET_CUSTOMER_TAGS: CustomerTagDef[] = [
  {
    id: 'regular',
    label: 'Regular',
    bnLabel: 'নিয়মিত (Regular)',
    description: 'নিয়মিত ও বিশ্বস্ত খদ্দের',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    activeFilterClass: 'bg-emerald-600 text-white shadow-xs border-emerald-600',
    hoverClass: 'hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300',
    dotColor: 'bg-emerald-500',
    iconType: 'regular',
  },
  {
    id: 'wholesale',
    label: 'Wholesale',
    bnLabel: 'পাইকারি (Wholesale)',
    description: 'পাইকারি বা বাল্ক ক্রেতা',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    activeFilterClass: 'bg-blue-600 text-white shadow-xs border-blue-600',
    hoverClass: 'hover:bg-blue-50 hover:text-blue-800 hover:border-blue-300',
    dotColor: 'bg-blue-500',
    iconType: 'wholesale',
  },
  {
    id: 'blocked',
    label: 'Blocked',
    bnLabel: 'ব্লকড / স্থগিত (Blocked)',
    description: 'বাকি স্থগিত বা ঝুঁকিপূর্ণ খদ্দের',
    badgeClass: 'bg-red-50 text-red-800 border-red-200 ring-1 ring-red-300/60',
    activeFilterClass: 'bg-red-600 text-white shadow-xs border-red-600',
    hoverClass: 'hover:bg-red-50 hover:text-red-800 hover:border-red-300',
    dotColor: 'bg-red-500',
    iconType: 'blocked',
  },
  {
    id: 'vip',
    label: 'VIP',
    bnLabel: 'ভিআইপি (VIP)',
    description: 'বিশেষ অগ্রাধিকার প্রাপ্ত খদ্দের',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
    activeFilterClass: 'bg-amber-500 text-slate-950 shadow-xs border-amber-500 font-black',
    hoverClass: 'hover:bg-amber-50 hover:text-amber-900 hover:border-amber-400',
    dotColor: 'bg-amber-500',
    iconType: 'vip',
  },
  {
    id: 'retail',
    label: 'Retail',
    bnLabel: 'খুচরা (Retail)',
    description: 'সাধারণ খুচরা ক্রেতা',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    activeFilterClass: 'bg-purple-600 text-white shadow-xs border-purple-600',
    hoverClass: 'hover:bg-purple-50 hover:text-purple-800 hover:border-purple-300',
    dotColor: 'bg-purple-500',
    iconType: 'retail',
  },
];

// Look up tag definition or build dynamic one for custom tags
export const getTagDefinition = (tagId: string): CustomerTagDef => {
  const normalized = (tagId || '').trim().toLowerCase();
  const preset = PRESET_CUSTOMER_TAGS.find(t => t.id === normalized || t.label.toLowerCase() === normalized);
  if (preset) return preset;

  // Generate pleasant dynamic styling for any custom user tags
  return {
    id: normalized,
    label: tagId,
    bnLabel: tagId,
    description: `${tagId} ক্যাটাগরি`,
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    activeFilterClass: 'bg-slate-800 text-white shadow-xs border-slate-800',
    hoverClass: 'hover:bg-slate-100 hover:text-slate-900 hover:border-slate-400',
    dotColor: 'bg-slate-600',
    iconType: 'custom',
  };
};
