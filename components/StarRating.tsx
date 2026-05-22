'use client';

interface StarRatingProps {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
  interactive?: boolean;
  onRate?: (stars: number) => void;
}

export function StarRating({
  value,
  count,
  size = 'sm',
  interactive = false,
  onRate,
}: StarRatingProps) {
  const stars = Math.max(0, Math.min(5, value));
  const text = size === 'md' ? 'text-lg' : 'text-sm';

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <div className="flex items-center gap-0.5" role={interactive ? 'group' : undefined}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onRate?.(n)}
            className={`${text} leading-none ${
              interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'
            } ${n <= Math.round(stars) ? 'text-amber-500' : 'text-[#d9d9d9]'}`}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            ★
          </button>
        ))}
      </div>
      <span className="text-xs text-[#666]">
        {stars > 0 ? stars.toFixed(1) : 'No ratings'}
        {count != null && count > 0 ? ` (${count})` : ''}
      </span>
    </div>
  );
}
