import { ImageResponse } from 'next/og';
import { getPublicProjectBySlug } from '@/lib/publicProjects';

export const runtime = 'edge';
export const alt    = 'Make Big project card';
export const size   = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function fetchProject(slug: string) {
  const result = await getPublicProjectBySlug(slug);
  return result?.project ?? null;
}

const CAT_COLORS: Record<string, string> = {
  tech: '#2563EB', design: '#7C3AED', marketing: '#EA580C',
  content: '#DB2777', finance: '#16A34A', education: '#CA8A04',
  health: '#DC2626', social: '#0D9488', other: '#0A66C2',
};

export default async function Image({ params }: { params: { slug: string } }) {
  const project = await fetchProject(params.slug);

  const name     = project?.name      || 'Make Big Project';
  const desc     = project?.desc      || 'A project looking for collaborators';
  const city     = project?.city      || '';
  const catId    = project?.categoryId || 'other';
  const roles    = (project?.roles || []).slice(0, 4);
  const salaryMax = project?.salaryMax;
  const currency  = project?.currency || 'INR';
  const accent    = CAT_COLORS[catId] || '#0A66C2';

  const salaryStr = salaryMax
    ? (currency === 'INR'
        ? `₹${salaryMax >= 1000 ? Math.round(salaryMax / 1000) + 'K' : salaryMax}/mo`
        : `${currency} ${salaryMax}/mo`)
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#f3f2ef',
          fontFamily: 'system-ui, sans-serif',
          padding: 0,
        }}
      >
        {/* Top accent bar */}
        <div style={{ height: 8, background: accent, width: '100%' }} />

        <div style={{ display: 'flex', flex: 1, padding: '48px 60px', gap: 48 }}>

          {/* Left content */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 16 }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: 18 }}>M</div>
              <span style={{ color: accent, fontWeight: 900, fontSize: 20, letterSpacing: -0.5 }}>Make Big</span>
            </div>

            {/* Category pill */}
            <div style={{ display: 'flex' }}>
              <span style={{ background: accent + '20', color: accent, padding: '4px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700, border: `1px solid ${accent}40` }}>
                {catId.toUpperCase()}
              </span>
            </div>

            {/* Project name */}
            <div style={{ fontSize: 52, fontWeight: 900, color: '#1d2226', lineHeight: 1.1, maxWidth: 620 }}>
              {name.length > 45 ? name.slice(0, 45) + '…' : name}
            </div>

            {/* Description */}
            <div style={{ fontSize: 20, color: '#666', lineHeight: 1.4, maxWidth: 580, marginTop: 4 }}>
              {desc.length > 100 ? desc.slice(0, 100) + '…' : desc}
            </div>

            {/* Skills */}
            {roles.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {roles.map((r: string) => (
                  <span key={r} style={{ background: 'white', border: '1px solid #d9d9d9', color: '#666', padding: '4px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: 240, alignItems: 'flex-end', justifyContent: 'center' }}>
            {city && (
              <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: 16, padding: '16px 20px', width: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>Location</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#1d2226', marginTop: 4 }}>📍 {city}</div>
              </div>
            )}
            {salaryStr && (
              <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: 16, padding: '16px 20px', width: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>Monthly pay</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#16a34a', marginTop: 4 }}>{salaryStr}</div>
              </div>
            )}
            <div style={{ background: accent, borderRadius: 16, padding: '14px 20px', width: '100%', textAlign: 'center' }}>
              <div style={{ color: 'white', fontWeight: 800, fontSize: 15 }}>Apply to Join →</div>
              <div style={{ color: 'white', opacity: 0.8, fontSize: 11, marginTop: 2 }}>makebig.co</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
