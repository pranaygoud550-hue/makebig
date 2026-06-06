import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';

const SOCIAL = [
  { label: 'LinkedIn', href: 'https://linkedin.com', icon: 'in' },
  { label: 'X', href: 'https://x.com', icon: '𝕏' },
  { label: 'Instagram', href: 'https://instagram.com', icon: '◎' },
];

export function MarketingFooter({ onCheckDebug }: { onCheckDebug?: () => void }) {
  return (
    <footer className="bg-[#1d2226] text-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <BrandLogo size="md" href="/" className="brightness-0 invert" />
            <p className="text-sm text-white/60 mt-2 max-w-xs leading-relaxed">
              Where college creators, developers, filmmakers, and innovators build teams and ship projects together.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">Company</p>
            <ul className="space-y-2 text-sm text-white/75">
              <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">Legal</p>
            <ul className="space-y-2 text-sm text-white/75">
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">Connect</p>
            <div className="flex gap-3">
              {SOCIAL.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#0A66C2] flex items-center justify-center text-sm font-bold transition-colors"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-white/45">
          <p>© {new Date().getFullYear()} Make Big. Built for creators by creators.</p>
          {onCheckDebug && (
            <button
              type="button"
              onClick={onCheckDebug}
              className="px-2 py-1 border border-white/20 rounded hover:border-white/40 hover:text-white/70"
            >
              Debug
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
