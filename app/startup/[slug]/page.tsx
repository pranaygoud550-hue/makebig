import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StartupPageClient } from '@/components/ecosystem/StartupPageClient';
import { getApiOrigin } from '@/lib/apiBase';
import { SITE_URL } from '@/lib/site';

async function getStartup(slug: string) {
  try {
    const res = await fetch(`${getApiOrigin()}/api/startup/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const data = await getStartup(params.slug);
  if (!data) return { title: 'Startup | Make Big' };
  return {
    title: `${data.startup.name} — Startup Profile | Make Big`,
    description: data.startup.desc || `${data.startup.name} on Make Big`,
    alternates: { canonical: `${SITE_URL}/startup/${params.slug}` },
    openGraph: {
      title: data.startup.name,
      description: data.startup.desc,
      url: `${SITE_URL}/startup/${params.slug}`,
    },
  };
}

export default async function StartupPage({ params }: { params: { slug: string } }) {
  const data = await getStartup(params.slug);
  if (!data) notFound();

  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      <header className="sticky top-0 z-40 bg-white border-b border-[#d9d9d9] shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-black text-[#0A66C2] tracking-tight">
            Make Big
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/idea-validator" className="hidden sm:block text-sm text-[#666] hover:text-[#0A66C2]">
              Validate Idea
            </Link>
            <Link href="/explore" className="text-sm font-medium text-[#0A66C2]">
              Explore →
            </Link>
          </div>
        </div>
      </header>
      <StartupPageClient slug={params.slug} />
    </div>
  );
}
