import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';

export const metadata = {
  title: 'About — Make Big',
  description:
    'Make Big helps college students find teammates, verify skills, and ship real projects — from web apps to films and healthtech.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      <header className="bg-white border-b border-[#e0e0e0] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <BrandLogo size="sm" href="/" />
          <nav className="flex gap-4 text-sm font-semibold text-[#666]">
            <Link href="/#discover" className="hover:text-[#0A66C2]">
              Explore
            </Link>
            <Link href="/learn" className="hover:text-[#0A66C2]">
              Learn
            </Link>
            <Link href="/contact" className="hover:text-[#0A66C2]">
              Contact
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        <section>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1d2226]">About Make Big</h1>
          <p className="text-[#666] mt-4 leading-relaxed text-lg">
            Make Big is a collaboration platform built for Indian college students — developers,
            designers, filmmakers, marketers, and founders — who want to find teammates, organize
            work, and ship real projects together.
          </p>
          <p className="text-[#666] mt-4 leading-relaxed">
            Instead of scattered WhatsApp groups and lost resumes, teams get project discovery,
            skill-verified profiles, task boards, team posts, AI cofounder guidance, and public
            startup pages — all in one place.
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-[#e0e0e0] p-6 space-y-4">
          <h2 className="text-xl font-bold text-[#1d2226]">What you can do</h2>
          <ul className="grid sm:grid-cols-2 gap-3 text-sm text-[#666]">
            <li className="rounded-xl bg-[#f8f9fa] px-4 py-3">Create or join projects by domain &amp; skill</li>
            <li className="rounded-xl bg-[#f8f9fa] px-4 py-3">Take proctored skill tests with verified badges</li>
            <li className="rounded-xl bg-[#f8f9fa] px-4 py-3">Run tasks, posts, and team chat in one workspace</li>
            <li className="rounded-xl bg-[#f8f9fa] px-4 py-3">Track startup journey from idea to launch</li>
            <li className="rounded-xl bg-[#f8f9fa] px-4 py-3">Browse mentors, courses, and live project feed</li>
            <li className="rounded-xl bg-[#f8f9fa] px-4 py-3">Publish a public profile recruiters can view</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-[#1d2226]">Built by students, for students</h2>
          <p className="text-[#666] mt-3 leading-relaxed">
            Make Big was created to solve a problem we lived: talented classmates with great ideas
            but no way to find the right teammate at the right time. The platform is production-deployed
            on modern infrastructure (Next.js, MongoDB, real-time chat) and designed for campuses
            across India.
          </p>
          <p className="text-[#666] mt-3 leading-relaxed">
            Live demo:{' '}
            <a
              href="https://makebig.vercel.app"
              className="text-[#0A66C2] font-semibold hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              makebig.vercel.app
            </a>
          </p>
        </section>

        <section className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-full bg-[#0A66C2] text-white text-sm font-semibold hover:bg-[#004182]"
          >
            Start a project
          </Link>
          <Link
            href="/#discover"
            className="px-5 py-2.5 rounded-full border border-[#d9d9d9] text-[#666] text-sm font-semibold hover:border-[#0A66C2] hover:text-[#0A66C2]"
          >
            Browse projects
          </Link>
        </section>
      </main>
    </div>
  );
}
