import { WIZARD_CATEGORIES } from '@/lib/constants';

/** Wizard sentinel — user types their own domain instead of picking a preset. */
export const CUSTOM_CATEGORY_ID = '__custom__';

export function slugifyCategoryLabel(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return slug || 'custom-project';
}

export function formatCategoryTitle(categoryId: string, customLabel?: string): string {
  if (customLabel?.trim()) return customLabel.trim();
  const preset = WIZARD_CATEGORIES.find((c) => c.id === categoryId);
  if (preset) return preset.title;
  if (!categoryId || categoryId === CUSTOM_CATEGORY_ID) return 'Project';
  return categoryId
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function resolveProjectCategory(
  categoryId: string,
  customLabel?: string
): { categoryId: string; categoryTitle: string } {
  if (categoryId === CUSTOM_CATEGORY_ID) {
    const label = customLabel?.trim() || '';
    return {
      categoryId: slugifyCategoryLabel(label),
      categoryTitle: label || 'Custom project',
    };
  }
  return {
    categoryId,
    categoryTitle: formatCategoryTitle(categoryId),
  };
}

export function isCustomCategorySelection(categoryId: string): boolean {
  return categoryId === CUSTOM_CATEGORY_ID;
}
