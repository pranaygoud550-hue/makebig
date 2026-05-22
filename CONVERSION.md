# Next.js + React Conversion Guide

## 🔄 What Was Converted

This document explains the conversion from static HTML/CSS/JS to a modern Next.js + React application.

### Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| **Framework** | Vanilla JS + HTML | Next.js 14 + React 18 |
| **Language** | JavaScript | TypeScript |
| **Styling** | Inline CSS + HTML styles | Tailwind CSS |
| **State Management** | localStorage + global vars | React Hooks + Custom Hooks |
| **Components** | None (HTML functions) | Reusable React Components |
| **Build System** | Express server | Next.js with App Router |
| **Type Safety** | None | Full TypeScript support |

## 📦 Component Mapping

### Old HTML → New React Components

```
<div class="navbar">              → <Navbar />
<div class="auth-modal">          → <AuthModal />
<div id="splash">                 → <SplashScreen />
<div class="modal" (project)>     → <ProjectWizard />
<div class="hero">                → Home page hero section
<div class="skills">              → Category cards grid
<div class="dashboard-root">      → Dashboard page (future)
```

### Old JS Functions → New React Patterns

```javascript
// Before: Global function
function openAuth() {
  const modal = document.getElementById('authModal');
  modal.classList.add('active');
}

// After: React component with state
export function Home() {
  const [showAuth, setShowAuth] = useState(false);
  return <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
}
```

## 🎨 Styling Conversion

### CSS Classes → Tailwind Utilities

```css
/* Before */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 30px;
  background: #020617;
}

/* After */
<nav className="flex justify-between items-center px-8 py-4 bg-slate-950">
```

### Custom Animations

All CSS animations migrated to `globals.css`:
- `assemble` - for splash screen letters
- `fadeIn` - for modal transitions
- `slideUp` - for modal content
- `floatParticle` - for completion screen
- `quotePulse` - for quote rotator

## 🔐 Authentication Flow

### Old Approach
```javascript
// Global state
let currentUser = null;

function handleSignin(event) {
  event.preventDefault();
  const user = { name, contact, isLoggedIn: true };
  localStorage.setItem('user', JSON.stringify(user));
  currentUser = user;
}
```

### New Approach (React Hook)
```typescript
// Custom hook
const { user, login, logout, checkAuth } = useAuth();

// Usage in component
<button onClick={() => login(name, contact)}>Login</button>
{user && <span>Welcome {user.name}</span>}
```

## 📊 Project Structure Details

### `/app` - Pages & Layouts
- **layout.tsx** - Root layout (metadata, styles, fonts)
- **page.tsx** - Home page with hero, categories, CTA
- **globals.css** - Global styles, animations, reset CSS

### `/components` - React Components
- **ui/** - Reusable base components
  - Button, Input, Modal, Card, Tabs, ProgressBar
- **Navbar.tsx** - Top navigation with user menu
- **AuthModal.tsx** - Sign in/up with OTP
- **SplashScreen.tsx** - Animated intro screen
- **ProjectWizard.tsx** - Multi-step project creation
- **ProjectCard.tsx** - Project display component
- **ProfileCard.tsx** - User profile component
- **CategoryCard.tsx** - Category display component
- **EditProfileModal.tsx** - Profile editing
- **Dashboard.tsx** - Dashboard layout components

### `/lib` - Logic & Utilities

**Types** (`types.ts`)
```typescript
- User, Profile, Project, Person
- Category, WizardState, AppState
- ProjectMatch
```

**Constants** (`constants.ts`)
- WIZARD_CATEGORIES - 21 project categories
- WIZARD_SKILLS_MAP - Skills per category
- WIZARD_COPY - Step titles and subtitles
- QUOTES - Inspirational quotes

**Utilities** (`utils.ts`)
- formatSalaryBand()
- generateOTP()
- normalizeContact()
- budgetBandOverlapScore()
- skillAlignmentForInvite()
- extractInviteKeywords()
- getInitials()
- cn() - Class name utility

**API** (`api.ts`)
- apiGetSeed()
- apiUpsertUser()
- apiGetProfile()
- apiUpsertProfile()
- apiPublishProject()
- apiGetNotifications()

**Hooks** (`hooks/`)
- useAuth() - Authentication state
- useWizard() - Multi-step form state

## 🎯 Key Features Preserved

✅ **Authentication System**
- Sign in with OTP
- Sign up with profile creation
- Logout functionality
- Profile management

✅ **Project Wizard**
- Multi-step flow (7 steps)
- Category selection
- Skills selection
- Project details
- Budget configuration
- Join vs Create modes

✅ **Responsive Design**
- Mobile-first approach
- Tailwind breakpoints
- Touch-friendly interactive elements

✅ **Dark Theme**
- All colors converted to Tailwind palette
- Consistent throughout app

## 🆕 New Features

✨ **Type Safety** - Full TypeScript support
✨ **Better Organization** - Clear separation of concerns
✨ **Reusable Components** - DRY principle applied
✨ **Custom Hooks** - Shared logic extraction
✨ **Modern Tooling** - ESLint, better dev experience
✨ **Performance** - Next.js optimizations

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

### 3. Open in Browser
```
http://localhost:3000
```

### 4. Explore Components
- Components in `/components`
- Types in `/lib/types.ts`
- Hooks in `/lib/hooks/`

## 📝 Common Tasks

### Add a New Component
```typescript
// 1. Create file: /components/MyComponent.tsx
'use client';

export function MyComponent() {
  return <div>Hello</div>;
}

// 2. Use in page or other component
import { MyComponent } from '@/components/MyComponent';

export default function Page() {
  return <MyComponent />;
}
```

### Add a New Hook
```typescript
// 1. Create file: /lib/hooks/useMyHook.ts
'use client';

import { useState } from 'react';

export function useMyHook() {
  const [state, setState] = useState(null);
  return { state, setState };
}

// 2. Use in component
'use client';
import { useMyHook } from '@/lib/hooks/useMyHook';

export function MyComponent() {
  const { state } = useMyHook();
  return <div>{state}</div>;
}
```

### Style a Component
```typescript
// Use Tailwind classes directly
<div className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:shadow-lg transition-all">
  Content
</div>

// Or use cn() utility for conditional classes
import { cn } from '@/lib/utils';

<button className={cn(
  'px-4 py-2 rounded-lg',
  variant === 'primary' && 'bg-sky-400 text-slate-950'
)}>
  Click me
</button>
```

## 🔗 Integration Points

### Connect to Backend API
```typescript
// lib/api.ts - Already set up for /api routes
const res = await fetch('/api/health');
const data = await res.json();

// Or use helper functions
const user = await apiUpsertUser({ name, contact });
const profile = await apiGetProfile(contact);
```

### Add More Pages
```typescript
// app/dashboard/page.tsx
export default function DashboardPage() {
  return <Dashboard>Content</Dashboard>;
}
```

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## ✅ Conversion Checklist

- [x] Project structure set up
- [x] Tailwind CSS configured
- [x] TypeScript configured
- [x] Base UI components created
- [x] Authentication hook implemented
- [x] Wizard hook implemented
- [x] Home page created
- [x] Components converted and organized
- [ ] Dashboard pages (future)
- [ ] Project management features (future)
- [ ] Team collaboration features (future)

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Use a different port
npm run dev -- -p 3001
```

### Module Not Found
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### TypeScript Errors
```bash
# Check TypeScript configuration
npm run build
```

## 📞 Support

For questions or issues:
1. Check the [README.md](README.md)
2. Review component examples in `/components`
3. Check hook implementations in `/lib/hooks`

---

**Happy coding!** 🚀 Build Big ideas with this modern Next.js + React foundation!
