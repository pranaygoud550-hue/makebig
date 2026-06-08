'use client';

import { useState } from 'react';
import { useReducedMotion } from '@/lib/useReducedMotion';

const ROW1 = [
  {
    quote:
      'Make Big helped our team actually finish a project for once.',
    name: 'Rahul',
    detail: 'CSE Final Year, Hyderabad',
    initial: 'R',
  },
  {
    quote:
      'The AI validator told us our idea had a real gap in the market. We pivoted in day 1 and saved weeks.',
    name: 'Sneha',
    detail: 'IT 3rd Year',
    initial: 'S',
  },
];

const ROW2 = [
  {
    quote: 'Found my entire 4-person team in 2 days using the skill filter.',
    name: 'Aditya',
    detail: 'ECE, Hyderabad',
    initial: 'A',
  },
  {
    quote: 'The standup feature alone fixed our team communication.',
    name: 'Priya',
    detail: 'MBA + Tech Co-founder',
    initial: 'P',
  },
];

function TestimonialCard({
  quote,
  name,
  detail,
  initial,
}: {
  quote: string;
  name: string;
  detail: string;
  initial: string;
}) {
  return (
    <div className="shrink-0 w-[min(340px,85vw)] rounded-2xl border border-white/[0.08] bg-[#0F0F1A] p-5 mx-3">
      <p className="text-sm text-white/80 leading-relaxed">&ldquo;{quote}&rdquo;</p>
      <div className="flex items-center gap-3 mt-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
          {initial}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{name}</p>
          <p className="text-xs text-white/45">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function MarqueeRow({
  items,
  reverse,
  paused,
}: {
  items: typeof ROW1;
  reverse?: boolean;
  paused: boolean;
}) {
  const reduced = useReducedMotion();
  const doubled = [...items, ...items, ...items];

  return (
    <div className="overflow-hidden py-2">
      <div
        className={`flex w-max ${reduced ? '' : reverse ? 'animate-marquee-reverse' : 'animate-marquee'} ${paused ? '[animation-play-state:paused]' : ''}`}
      >
        {doubled.map((item, i) => (
          <TestimonialCard key={`${item.name}-${i}`} {...item} />
        ))}
      </div>
    </div>
  );
}

export function TestimonialMarquee() {
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);

  return (
    <section className="bg-[#0A0A0F] py-16 sm:py-20 overflow-hidden border-y border-white/[0.06]">
      <h2 className="text-2xl sm:text-3xl font-black text-white text-center mb-10 px-4">
        What student founders are saying
      </h2>
      <div
        className={`space-y-4 ${reduced ? 'px-4 flex flex-col items-center gap-4' : ''}`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {reduced ? (
          [...ROW1, ...ROW2].map((item) => <TestimonialCard key={item.name} {...item} />)
        ) : (
          <>
            <MarqueeRow items={ROW1} paused={paused} />
            <MarqueeRow items={ROW2} reverse paused={paused} />
          </>
        )}
      </div>
    </section>
  );
}
