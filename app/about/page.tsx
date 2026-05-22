import Link from 'next/link';

export const metadata = {
  title: 'About — Make Big',
  description: 'Make Big helps college creators find teams and ship projects together.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      <header className="bg-white border-b border-[#e0e0e0] px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-black text-[#0A66C2]">
            Make Big
          </Link>
          <Link href="/" className="text-sm text-[#666] hover:text-[#0A66C2]">
            ← Home
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-[#1d2226]">About Make Big</h1>
        <p className="text-[#666] mt-4 leading-relaxed">
          Make Big is a collaboration platform built for college students — developers, filmmakers, designers,
          marketers, and founders — who want to find teammates, organize work, and ship real projects together.
        </p>
        <p className="text-[#666] mt-4 leading-relaxed">
          We combine project discovery, team matching, task boards, posts, and profiles in one place so you
          spend less time searching WhatsApp groups and more time building.
        </p>
      </main>
    </div>
  );
}
