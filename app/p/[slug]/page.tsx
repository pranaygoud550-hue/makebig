import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPublicProjectBySlug, getPublishedSlugs } from '@/lib/publicProjects';
import { SITE_URL, projectPublicUrl } from '@/lib/site';
import { ShareProject } from '@/components/ShareProject';

interface ProjectPageData {
  id: string;
  name: string;
  desc: string;
  categoryId: string;
  roles: string[];
  city: string;
  state: string;
  slug: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  createdAt?: string;
  teamSize?: number;
}

interface PostData {
  id: string;
  body: string;
  imageUrl?: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs();
  return slugs
    .map((s) => (typeof s === 'string' ? s : (s as { slug?: string }).slug))
    .filter((slug): slug is string => typeof slug === 'string' && slug.length > 0)
    .map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const result = await getPublicProjectBySlug(params.slug);
  if (!result) return { title: 'Project Not Found | Make Big' };

  const { project } = result;
  const cityPart = project.city ? ` in ${project.city}` : '';
  const catTitles: Record<string, string> = {
    tech: 'Tech Startup',
    design: 'Design Project',
    marketing: 'Marketing',
    content: 'Content',
    finance: 'Fintech',
    education: 'EdTech',
    health: 'HealthTech',
    social: 'Social Impact',
    other: 'Project',
  };
  const catLabel = catTitles[project.categoryId] || 'Project';
  const pageUrl = projectPublicUrl(project.slug);
  const ogImage = `${SITE_URL}/p/${project.slug}/opengraph-image`;

  return {
    title: `${project.name} | Find Co-founder${cityPart} | Make Big`,
    description:
      project.desc ||
      `Join ${project.name} — a ${catLabel} looking for talented collaborators${cityPart}.`,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: pageUrl },
    openGraph: {
      title: `${project.name} | Make Big`,
      description: project.desc || `Looking for teammates to build ${project.name}.`,
      url: pageUrl,
      siteName: 'Make Big',
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: project.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${project.name} | Make Big`,
      description: project.desc || `Looking for teammates to build ${project.name}.`,
      images: [ogImage],
    },
    keywords: [
      project.name,
      ...(project.roles || []),
      project.city,
      project.state,
      'Make Big',
      'co-founder',
      catLabel,
    ].filter(Boolean),
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  tech: 'bg-blue-50 text-blue-700 border-blue-200',
  design: 'bg-purple-50 text-purple-700 border-purple-200',
  marketing: 'bg-orange-50 text-orange-700 border-orange-200',
  content: 'bg-pink-50 text-pink-700 border-pink-200',
  finance: 'bg-green-50 text-green-700 border-green-200',
  education: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  health: 'bg-red-50 text-red-700 border-red-200',
  social: 'bg-teal-50 text-teal-700 border-teal-200',
};

const CATEGORY_LABELS: Record<string, string> = {
  tech: 'Tech',
  design: 'Design',
  marketing: 'Marketing',
  content: 'Content',
  finance: 'Finance',
  education: 'Education',
  health: 'Health',
  social: 'Social',
  other: 'Other',
};

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatSalary(amount: number | undefined, currency = 'INR') {
  if (!amount) return null;
  const sym: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };
  if (amount >= 100000) return `${sym[currency] || currency}${(amount / 100000).toFixed(1)}L/mo`;
  if (amount >= 1000) return `${sym[currency] || currency}${(amount / 1000).toFixed(0)}K/mo`;
  return `${sym[currency] || currency}${amount}/mo`;
}

export default async function ProjectPage({ params }: { params: { slug: string } }) {
  const result = await getPublicProjectBySlug(params.slug);
  if (!result) notFound();

  const { project, posts } = result;
  const catColor =
    CATEGORY_COLORS[project.categoryId] || 'bg-[#EEF3FB] text-[#0A66C2] border-[#0A66C2]/20';
  const salaryLabel = project.salaryMax
    ? `${formatSalary(project.salaryMin, project.currency)} – ${formatSalary(project.salaryMax, project.currency)}`
    : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: project.name,
    description: project.desc,
    datePosted: project.createdAt,
    hiringOrganization: { '@type': 'Organization', name: 'Make Big' },
    jobLocation: project.city
      ? {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressLocality: project.city,
            addressRegion: project.state || 'India',
            addressCountry: 'IN',
          },
        }
      : undefined,
    skills: project.roles?.join(', '),
    url: projectPublicUrl(project.slug),
  };

  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="sticky top-0 z-40 bg-white border-b border-[#d9d9d9] shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-black text-[#0A66C2] tracking-tight">
            Make Big
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/explore"
              className="hidden sm:block text-sm font-medium text-[#666] hover:text-[#0A66C2]"
            >
              Explore
            </Link>
            <Link
              href={`/?join=${project.slug}`}
              className="px-4 py-1.5 border border-[#0A66C2] text-[#0A66C2] text-sm font-semibold rounded-full hover:bg-[#EEF3FB] transition-colors"
            >
              Join / Sign In →
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl border border-[#e0e0e0] overflow-hidden">
              <div className="h-2 bg-[#0A66C2]" />
              <div className="p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <span
                      className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border mb-2 ${catColor}`}
                    >
                      {CATEGORY_LABELS[project.categoryId] || project.categoryId}
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black text-[#1d2226] leading-tight">
                      {project.name}
                    </h1>
                    {(project.city || project.state) && (
                      <p className="text-sm text-[#666] mt-1 flex items-center gap-1">
                        📍 {[project.city, project.state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                {project.desc && (
                  <p className="text-[#1d2226] text-base leading-relaxed">{project.desc}</p>
                )}

                {(project.roles || []).length > 0 && (
                  <div className="mt-5">
                    <p className="text-xs font-semibold text-[#666] uppercase tracking-wide mb-2">
                      Skills needed
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {project.roles.map((r) => (
                        <span
                          key={r}
                          className="px-3 py-1 bg-[#EEF3FB] text-[#0A66C2] border border-[#0A66C2]/20 rounded-full text-xs font-semibold"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-4 mt-5 pt-5 border-t border-[#f0f0f0]">
                  {salaryLabel && (
                    <div>
                      <p className="text-[10px] text-[#999] uppercase tracking-wide">Monthly pay</p>
                      <p className="text-sm font-bold text-green-700">{salaryLabel}</p>
                    </div>
                  )}
                  {(project.teamSize ?? 0) > 0 && (
                    <div>
                      <p className="text-[10px] text-[#999] uppercase tracking-wide">Team members</p>
                      <p className="text-sm font-bold text-[#1d2226]">{project.teamSize}</p>
                    </div>
                  )}
                  {project.createdAt && (
                    <div>
                      <p className="text-[10px] text-[#999] uppercase tracking-wide">Posted</p>
                      <p className="text-sm font-bold text-[#1d2226]">
                        {formatDate(project.createdAt)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {posts.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-[#1d2226]">Project Updates</h2>
                {posts.map((post: PostData) => (
                  <div key={post.id} className="bg-white rounded-2xl border border-[#e0e0e0] p-5">
                    <p className="text-[#1d2226] text-sm leading-relaxed whitespace-pre-line">
                      {post.body}
                    </p>
                    {post.imageUrl && (
                      <img
                        src={post.imageUrl}
                        alt="Post"
                        className="mt-3 rounded-xl w-full object-cover max-h-64"
                      />
                    )}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#f0f0f0] text-xs text-[#999]">
                      <span>👍 {post.likeCount}</span>
                      <span>💬 {post.commentCount}</span>
                      <span className="ml-auto">{formatDate(post.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#e0e0e0] p-6 sticky top-20">
              <h2 className="text-lg font-bold text-[#1d2226] mb-1">Interested?</h2>
              <p className="text-sm text-[#666] mb-4">
                Join Make Big to apply for this project and collaborate with the team.
              </p>
              <Link
                href={`/?join=${project.slug}`}
                className="block w-full py-2.5 bg-[#0A66C2] text-white text-center font-bold rounded-full hover:bg-[#004182] transition-colors text-sm"
              >
                Join now →
              </Link>
              <Link
                href="/explore"
                className="block w-full py-2.5 border border-[#d9d9d9] text-[#666] text-center font-semibold rounded-full hover:border-[#0A66C2] hover:text-[#0A66C2] transition-colors text-sm mt-2"
              >
                Browse all projects
              </Link>
            </div>

            <ShareProject slug={project.slug} projectName={project.name} />

            <div className="bg-[#EEF3FB] rounded-2xl border border-[#0A66C2]/15 p-4">
              <p className="text-xs font-semibold text-[#0A66C2] mb-1">About Make Big</p>
              <p className="text-xs text-[#666] leading-relaxed">
                Make Big is India&apos;s student collaboration platform. Find co-founders, build
                projects, and launch real products.
                {project.city ? ` Join projects near ${project.city} today.` : ''}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
