'use client';

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary';
}

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actions = [],
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-[#d9d9d9] dark:border-gray-600 p-10 text-center animate-fadeIn ${className}`}
    >
      <p className="text-4xl mb-3">{icon}</p>
      <p className="font-semibold text-[#1d2226] dark:text-white text-lg">{title}</p>
      <p className="text-sm text-[#666] dark:text-gray-400 mt-2 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
      {actions.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {actions.map((action) => {
            const cls =
              action.variant === 'secondary'
                ? 'px-4 py-2 border border-[#0A66C2] text-[#0A66C2] dark:text-sky-400 dark:border-sky-400 text-sm font-semibold rounded-full hover:bg-[#EEF3FB] dark:hover:bg-gray-700 active:scale-95 transition-transform'
                : 'px-4 py-2 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#004182] active:scale-95 transition-transform';
            if (action.href) {
              return (
                <a key={action.label} href={action.href} className={cls}>
                  {action.label}
                </a>
              );
            }
            return (
              <button key={action.label} type="button" onClick={action.onClick} className={cls}>
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
