import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — Make Big',
};

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-[#1d2226]">Terms of Service</h1>
        <p className="text-[#666] mt-2 text-sm">Last updated: May 2026</p>
        <div className="mt-8 space-y-4 text-sm text-[#666] leading-relaxed">
          <p>
            By using Make Big, you agree to use the platform responsibly and only for lawful college and
            professional collaboration purposes.
          </p>
          <p>
            You are responsible for content you post (projects, messages, images). Do not harass others,
            post spam, or share illegal material.
          </p>
          <p>
            Make Big is provided as-is during beta. We may change or discontinue features without notice.
            Paid plans, if offered, are subject to separate billing terms.
          </p>
          <p>
            Questions: <a href="mailto:hello@makebig.app" className="text-[#0A66C2] hover:underline">hello@makebig.app</a>
          </p>
        </div>
      </main>
    </div>
  );
}
