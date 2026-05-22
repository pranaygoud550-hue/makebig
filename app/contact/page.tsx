import Link from 'next/link';

export const metadata = {
  title: 'Contact — Make Big',
};

export default function ContactPage() {
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
        <h1 className="text-3xl font-bold text-[#1d2226]">Contact</h1>
        <p className="text-[#666] mt-4 leading-relaxed">
          Questions, feedback, or partnership ideas? We&apos;d love to hear from you.
        </p>
        <div className="mt-8 bg-white border border-[#e0e0e0] rounded-2xl p-6 space-y-3">
          <p className="text-sm text-[#1d2226]">
            <strong>Email:</strong>{' '}
            <a href="mailto:hello@makebig.app" className="text-[#0A66C2] hover:underline">
              hello@makebig.app
            </a>
          </p>
          <p className="text-sm text-[#666]">
            For beta feedback, include your college name and what you were trying to do on the platform.
          </p>
        </div>
      </main>
    </div>
  );
}
