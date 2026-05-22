'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface CategoryCardProps {
  id: string;
  title: string;
  description: string;
}

export function CategoryCard({ id, title, description }: CategoryCardProps) {
  return (
    <Card hoverable className="text-center p-8">
      <h3 className="text-lg font-semibold text-sky-400">{title}</h3>
      <p className="text-sm text-slate-400 mt-2">{description}</p>
    </Card>
  );
}
