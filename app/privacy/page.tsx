import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — Make Big',
};

export default function PrivacyPage() {
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
      <main className="max-w-3xl mx-auto px-4 py-12 prose prose-sm max-w-none">
        <h1 className="text-3xl font-bold text-[#1d2226]">Privacy Policy</h1>
        <p className="text-[#666] mt-2 text-sm">Last updated: May 2026</p>
        <div className="mt-8 space-y-4 text-sm text-[#666] leading-relaxed">
          <p>
            Make Big collects information you provide when you sign up (name, email or phone, college, skills)
            and when you use the platform (projects, posts, tasks, profile data).
          </p>
          <p>
            We use this data to operate the service, match teammates, and improve the product. We do not sell
            your personal information to third parties.
          </p>
          <p>
            Data is stored securely on our servers. You may request deletion of your account by contacting us
            at hello@makebig.app.
          </p>
          <p>
            This policy may be updated as we add features. Contact hello@makebig.app with any privacy questions.
          </p>
        </div>
      </main>
    </div>
  );
}
