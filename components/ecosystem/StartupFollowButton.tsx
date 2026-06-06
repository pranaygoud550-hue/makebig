'use client';

import { useState } from 'react';

interface StartupFollowButtonProps {
  projectId: string;
}

export function StartupFollowButton({ projectId }: StartupFollowButtonProps) {
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    const token = localStorage.getItem('makebig_token');
    if (!token) {
      window.location.href = '/?auth=signup';
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/startups/${projectId}/follow`, {
        method: following ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setFollowing(!following);
        if (typeof data.data?.followerCount === 'number') setCount(data.data.followerCount);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`w-full py-2.5 rounded-full font-semibold text-sm border transition-colors ${
        following
          ? 'border-[#0A66C2] text-[#0A66C2] bg-[#EEF3FB]'
          : 'border-[#d9d9d9] text-[#666] hover:border-[#0A66C2]'
      }`}
    >
      {following ? '✓ Following' : '+ Follow startup'}
      {count !== null && <span className="ml-1 opacity-70">({count})</span>}
    </button>
  );
}
