import Image from 'next/image';
import Link from 'next/link';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  href?: string | null;
  className?: string;
  priority?: boolean;
}

const sizeClass = {
  sm: 'h-8 w-auto max-w-[140px]',
  md: 'h-10 w-auto max-w-[180px]',
  lg: 'h-12 w-auto max-w-[220px]',
};

export function BrandLogo({
  size = 'md',
  href = '/',
  className = '',
  priority = false,
}: BrandLogoProps) {
  const img = (
    <Image
      src="/make-big-logo.png"
      alt="Make Big"
      width={220}
      height={48}
      priority={priority}
      className={`object-contain object-left ${sizeClass[size]} ${className}`}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center shrink-0">
        {img}
      </Link>
    );
  }

  return <span className="inline-flex items-center shrink-0">{img}</span>;
}
