'use client';

import { useState } from 'react';
import Link from 'next/link';
import { User } from '@/lib/types';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { BrandLogo } from '@/components/BrandLogo';

interface NavbarProps {
  user: User | null;
  profileImage?: string | null;
  onAuthClick: () => void;
  onProfileClick: () => void;
  onLogout: () => void;
  onProjectClick: () => void;
}

export function Navbar({
  user,
  profileImage,
  onAuthClick,
  onProfileClick,
  onLogout,
  onProjectClick,
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-[#d9d9d9] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <BrandLogo size="md" priority />

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm text-[#666] hover:text-[#0A66C2] font-medium transition-colors">Home</Link>
            <Link href="/learn" className="text-sm text-[#666] hover:text-[#0A66C2] font-medium transition-colors">Learn</Link>
            <Link href="/explore" className="text-sm text-[#666] hover:text-[#0A66C2] font-medium transition-colors">Explore</Link>
            <Link href="/pricing" className="text-sm text-[#666] hover:text-[#0A66C2] font-medium transition-colors">Pricing</Link>
            <Link href="/#discover" className="text-sm text-[#666] hover:text-[#0A66C2] font-medium transition-colors">Projects</Link>
          </div>

          {/* Auth */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-[#f3f2ef] transition-colors"
                >
                  <ProfileAvatar name={user.name} imageUrl={profileImage} size="sm" />
                  <span className="hidden sm:block text-sm font-semibold text-[#1d2226]">
                    {user.name.split(' ')[0]}
                  </span>
                  <span className="text-[#666] text-xs">▾</span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white border border-[#d9d9d9] rounded-xl shadow-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#e0e0e0] bg-[#f8f9fa]">
                      <p className="text-sm font-bold text-[#1d2226]">{user.name}</p>
                      <p className="text-xs text-[#666] truncate">{user.contact}</p>
                      {user.college && (
                        <p className="text-xs text-[#0A66C2] mt-0.5 truncate">{user.college}</p>
                      )}
                    </div>
                    <button
                      onClick={() => { onProfileClick(); setMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#1d2226] hover:bg-[#f3f2ef] transition-colors"
                    >
                      My profile
                    </button>
                    <Link
                      href="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="block w-full text-left px-4 py-2.5 text-sm text-[#1d2226] hover:bg-[#f3f2ef] transition-colors"
                    >
                      Full profile page
                    </Link>
                    <button
                      onClick={() => { onProjectClick(); setMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#1d2226] hover:bg-[#f3f2ef] transition-colors"
                    >
                      My Projects
                    </button>
                    <Link
                      href="/pricing"
                      onClick={() => setMenuOpen(false)}
                      className="block w-full text-left px-4 py-2.5 text-sm text-[#1d2226] hover:bg-[#f3f2ef] transition-colors"
                    >
                      Pricing
                    </Link>
                    <button
                      onClick={() => { onLogout(); setMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-[#e0e0e0]"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onAuthClick}
                  className="px-4 py-1.5 text-sm font-semibold text-[#0A66C2] border border-[#0A66C2] rounded-full hover:bg-[#EEF3FB] transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={onAuthClick}
                  className="px-4 py-1.5 text-sm font-semibold text-white bg-[#0A66C2] rounded-full hover:bg-[#004182] transition-colors"
                >
                  Join Now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
