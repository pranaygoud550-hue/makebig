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
  variant?: 'default' | 'landing';
}

export function Navbar({
  user,
  profileImage,
  onAuthClick,
  onProfileClick,
  onLogout,
  onProjectClick,
  variant = 'default',
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isLanding = variant === 'landing';

  return (
    <nav
      className={
        isLanding
          ? 'fixed top-0 left-0 right-0 z-50 bg-[#0A0A0F]/80 backdrop-blur-md border-b border-white/[0.06]'
          : 'sticky top-0 z-40 bg-white border-b border-[#d9d9d9] shadow-sm'
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <BrandLogo size="md" priority />

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors ${isLanding ? 'text-white/60 hover:text-white' : 'text-[#666] hover:text-[#0A66C2]'}`}
            >
              Home
            </Link>
            <Link
              href="/learn"
              className={`text-sm font-medium transition-colors ${isLanding ? 'text-white/60 hover:text-white' : 'text-[#666] hover:text-[#0A66C2]'}`}
            >
              Learn
            </Link>
            <Link
              href="/explore"
              data-tour="explore"
              className={`text-sm font-medium transition-colors ${isLanding ? 'text-white/60 hover:text-white' : 'text-[#666] hover:text-[#0A66C2]'}`}
            >
              Explore
            </Link>
            <Link
              href="/pricing"
              className={`text-sm font-medium transition-colors ${isLanding ? 'text-white/60 hover:text-white' : 'text-[#666] hover:text-[#0A66C2]'}`}
            >
              Pricing
            </Link>
            <Link
              href="/#discover"
              className={`text-sm font-medium transition-colors ${isLanding ? 'text-white/60 hover:text-white' : 'text-[#666] hover:text-[#0A66C2]'}`}
            >
              Projects
            </Link>
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
                  type="button"
                  data-tour="profile"
                  onClick={onAuthClick}
                  className={
                    isLanding
                      ? 'px-4 py-1.5 text-sm font-semibold text-white/80 border border-white/20 rounded-full hover:bg-white/5 transition-colors'
                      : 'px-4 py-1.5 text-sm font-semibold text-[#0A66C2] border border-[#0A66C2] rounded-full hover:bg-[#EEF3FB] transition-colors'
                  }
                >
                  Sign In
                </button>
                <button
                  type="button"
                  data-tour="signup"
                  onClick={onAuthClick}
                  className={
                    isLanding
                      ? 'px-4 py-1.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-full hover:opacity-90 transition-opacity'
                      : 'px-4 py-1.5 text-sm font-semibold text-white bg-[#0A66C2] rounded-full hover:bg-[#004182] transition-colors'
                  }
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
