'use client';

import { WIZARD_CATEGORIES } from '@/lib/constants';
import { CUSTOM_CATEGORY_ID } from '@/lib/categoryUtils';

interface CategoryPickerProps {
  selectedId: string;
  customLabel: string;
  onSelect: (id: string) => void;
  onCustomLabelChange: (value: string) => void;
  compact?: boolean;
}

export function CategoryPicker({
  selectedId,
  customLabel,
  onSelect,
  onCustomLabelChange,
  compact,
}: CategoryPickerProps) {
  const isCustom = selectedId === CUSTOM_CATEGORY_ID;

  return (
    <div className="space-y-3">
      <div
        className={`grid gap-2.5 ${
          compact ? 'grid-cols-2 sm:grid-cols-3 max-h-48 overflow-y-auto' : 'grid-cols-2 sm:grid-cols-3'
        }`}
      >
        {WIZARD_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={`text-left p-3 rounded-xl border-2 transition-all ${
              selectedId === cat.id
                ? 'border-[#0A66C2] bg-[#EEF3FB]'
                : 'border-[#d9d9d9] bg-white hover:border-[#0A66C2]/50 hover:bg-[#f8f9fa]'
            }`}
          >
            <p
              className={`font-semibold text-xs ${
                selectedId === cat.id ? 'text-[#0A66C2]' : 'text-[#1d2226]'
              }`}
            >
              {cat.title}
            </p>
            {!compact && (
              <p className="text-[10px] text-[#999] mt-0.5 line-clamp-1">{cat.blurb}</p>
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onSelect(CUSTOM_CATEGORY_ID)}
          className={`text-left p-3 rounded-xl border-2 border-dashed transition-all ${
            isCustom
              ? 'border-[#0A66C2] bg-[#EEF3FB]'
              : 'border-[#c8c8c8] bg-white hover:border-[#0A66C2]/50'
          }`}
        >
          <p className={`font-semibold text-xs ${isCustom ? 'text-[#0A66C2]' : 'text-[#1d2226]'}`}>
            Something else
          </p>
          <p className="text-[10px] text-[#999] mt-0.5">Type any field you want</p>
        </button>
      </div>

      {isCustom && (
        <div>
          <label htmlFor="custom-category" className="text-sm font-semibold text-[#1d2226] block mb-1.5">
            Your domain / category
          </label>
          <input
            id="custom-category"
            type="text"
            value={customLabel}
            onChange={(e) => onCustomLabelChange(e.target.value)}
            placeholder="e.g. Robotics, Fashion tech, Social enterprise, Podcast studio…"
            className="w-full px-4 py-2.5 bg-white border border-[#d9d9d9] rounded-lg text-[#1d2226] placeholder-[#aaa] text-sm focus:outline-none focus:border-[#0A66C2] focus:ring-2 focus:ring-[#0A66C2]/20"
          />
          <p className="text-[11px] text-[#666] mt-1.5">
            Pick anything — not limited to web dev or game dev. This label shows on your public project.
          </p>
        </div>
      )}
    </div>
  );
}
