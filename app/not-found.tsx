import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f3f2ef] flex flex-col">
      <header className="bg-white border-b border-[#e0e0e0] px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <BrandLogo size="sm" href="/" />
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <p className="text-6xl font-black text-[#0A66C2]/20">404</p>
        <h1 className="text-2xl font-bold text-[#1d2226] mt-4">Page not found</h1>
        <p className="text-[#666] mt-2 max-w-md">
          This link may be outdated. Browse live student projects or return to the homepage.
        </p>
        <div className="flex flex-wrap gap-3 mt-8 justify-center">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-full bg-[#0A66C2] text-white text-sm font-semibold hover:bg-[#004182]"
          >
            Go home
          </Link>
          <Link
            href="/#discover"
            className="px-5 py-2.5 rounded-full border border-[#d9d9d9] text-[#666] text-sm font-semibold hover:border-[#0A66C2] hover:text-[#0A66C2]"
          >
            Explore projects
          </Link>
        </div>
      </main>
    </div>
  );
}
