import React from 'react';
import { 
  UserCheck, 
  Package, 
  Ban, 
  Star, 
  ShoppingBag, 
  Tag, 
  Plus
} from 'lucide-react';
import { getTagDefinition } from '../constants/customerTags';

interface CustomerTagBadgeProps {
  tagId: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: (e: React.MouseEvent) => void;
  showIcon?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}

export const CustomerTagBadge: React.FC<CustomerTagBadgeProps> = ({
  tagId,
  size = 'sm',
  onClick,
  showIcon = true,
  removable = false,
  onRemove,
}) => {
  const def = getTagDefinition(tagId);

  const renderIcon = () => {
    const iconClass = size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-3.5 h-3.5' : 'w-4 h-4';
    switch (def.iconType) {
      case 'regular':
        return <UserCheck className={`${iconClass} text-emerald-600 shrink-0`} />;
      case 'wholesale':
        return <Package className={`${iconClass} text-blue-600 shrink-0`} />;
      case 'blocked':
        return <Ban className={`${iconClass} text-red-600 shrink-0`} />;
      case 'vip':
        return <Star className={`${iconClass} text-amber-600 fill-amber-400 shrink-0`} />;
      case 'retail':
        return <ShoppingBag className={`${iconClass} text-purple-600 shrink-0`} />;
      default:
        return <Tag className={`${iconClass} text-slate-500 shrink-0`} />;
    }
  };

  const sizeClasses = size === 'sm' 
    ? 'text-[11px] px-2 py-0.5 gap-1 rounded-md' 
    : size === 'md' 
    ? 'text-xs px-2.5 py-1 gap-1.5 rounded-lg' 
    : 'text-sm px-3 py-1.5 gap-2 rounded-xl';

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center font-bold border transition shadow-2xs ${def.badgeClass} ${sizeClasses} ${
        onClick ? 'cursor-pointer hover:opacity-90 active:scale-95' : ''
      }`}
      title={def.description}
    >
      {showIcon && renderIcon()}
      <span className="whitespace-nowrap">{def.bnLabel || def.label}</span>
      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:bg-black/10 rounded-full w-3.5 h-3.5 flex items-center justify-center text-[10px] font-bold"
        >
          ×
        </button>
      )}
    </span>
  );
};

interface CustomerTagListProps {
  tags?: string[];
  onAddTagClick?: () => void;
  onTagClick?: (tagId: string) => void;
  maxDisplay?: number;
  size?: 'sm' | 'md';
}

export const CustomerTagList: React.FC<CustomerTagListProps> = ({
  tags = [],
  onAddTagClick,
  onTagClick,
  maxDisplay = 4,
  size = 'sm',
}) => {
  const visibleTags = tags.slice(0, maxDisplay);
  const remainingCount = tags.length - maxDisplay;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {visibleTags.map(tagId => (
        <CustomerTagBadge
          key={tagId}
          tagId={tagId}
          size={size}
          onClick={onTagClick ? (e) => {
            e.stopPropagation();
            onTagClick(tagId);
          } : undefined}
        />
      ))}

      {remainingCount > 0 && (
        <span 
          onClick={onAddTagClick}
          className="text-[10px] font-black text-slate-500 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded-md border border-slate-200 cursor-pointer"
        >
          +{remainingCount}
        </span>
      )}

      {onAddTagClick && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddTagClick();
          }}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-bold text-slate-500 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 border border-dashed border-slate-300 hover:border-emerald-300 transition cursor-pointer"
          title="কাস্টমারে ট্যাগ যুক্ত বা পরিবর্তন করুন"
        >
          <Plus className="w-3 h-3" />
          <span>ট্যাগ</span>
        </button>
      )}
    </div>
  );
};
