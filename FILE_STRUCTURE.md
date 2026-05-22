# Project File Structure Reference

## Complete Directory Tree

```
make-big/
├── app/
│   ├── globals.css              # Global styles, animations, reset
│   ├── layout.tsx               # Root layout with metadata
│   └── page.tsx                 # Home page
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx           # Reusable button component
│   │   ├── Input.tsx            # Form input with labels/errors
│   │   ├── Modal.tsx            # Modal dialog container
│   │   ├── Card.tsx             # Card container component
│   │   ├── Tabs.tsx             # Tab navigation
│   │   └── ProgressBar.tsx      # Progress indicator
│   │
│   ├── Navbar.tsx               # Top navigation bar
│   ├── AuthModal.tsx            # Sign in/up modal
│   ├── SplashScreen.tsx         # Animated splash intro
│   ├── ProjectWizard.tsx        # Multi-step wizard
│   ├── ProjectCard.tsx          # Project display card
│   ├── ProfileCard.tsx          # User profile card
│   ├── CategoryCard.tsx         # Category display
│   ├── EditProfileModal.tsx     # Profile editor
│   └── Dashboard.tsx            # Dashboard layout
│
├── lib/
│   ├── types.ts                 # TypeScript interfaces
│   ├── constants.ts             # Data constants
│   ├── utils.ts                 # Utility functions
│   ├── api.ts                   # API integration
│   └── hooks/
│       ├── useAuth.ts           # Auth state management
│       └── useWizard.ts         # Wizard state management
│
├── public/                       # Static assets (images, fonts)
│
├── .eslintrc.json               # ESLint configuration
├── .gitignore                   # Git ignore file
├── tailwind.config.ts           # Tailwind CSS config
├── tsconfig.json                # TypeScript config
├── next.config.js               # Next.js config
├── postcss.config.js            # PostCSS config
├── package.json                 # Dependencies & scripts
├── README.md                    # Main documentation
├── CONVERSION.md                # Conversion guide
│── FILE_STRUCTURE.md            # This file
│
├── server.js                    # Express API server (optional)
├── serverDb.js                  # Database utilities (optional)
└── db.json                      # JSON database (optional)
```

## File Descriptions

### Core Application Files

| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout, metadata, global providers |
| `app/page.tsx` | Home page with hero and categories |
| `app/globals.css` | Global styles, animations, CSS reset |

### Components by Category

**UI Components** (`/components/ui/`)
- `Button.tsx` - Customizable button with variants
- `Input.tsx` - Form input with select support
- `Modal.tsx` - Modal dialog with backdrop
- `Card.tsx` - Card container with hover effects
- `Tabs.tsx` - Tab navigation component
- `ProgressBar.tsx` - Multi-step progress indicator

**Layout Components** (`/components/`)
- `Navbar.tsx` - Navigation with user menu
- `Dashboard.tsx` - Dashboard layout containers
- `SplashScreen.tsx` - Animated intro screen

**Feature Components** (`/components/`)
- `AuthModal.tsx` - Authentication flow (sign in/up)
- `ProjectWizard.tsx` - Multi-step project creation
- `ProjectCard.tsx` - Display projects
- `ProfileCard.tsx` - Display user profiles
- `CategoryCard.tsx` - Display categories
- `EditProfileModal.tsx` - Edit user profile

### Library Files

| File | Purpose |
|------|---------|
| `lib/types.ts` | TypeScript interfaces & types |
| `lib/constants.ts` | Data constants (categories, skills, copy) |
| `lib/utils.ts` | Helper functions & utilities |
| `lib/api.ts` | API client functions |
| `lib/hooks/useAuth.ts` | Authentication hook |
| `lib/hooks/useWizard.ts` | Wizard state management hook |

### Configuration Files

| File | Purpose |
|------|---------|
| `tailwind.config.ts` | Tailwind CSS customization |
| `tsconfig.json` | TypeScript compiler options |
| `next.config.js` | Next.js configuration |
| `postcss.config.js` | PostCSS plugins (Tailwind, Autoprefixer) |
| `.eslintrc.json` | ESLint rules |
| `package.json` | Dependencies & scripts |

### Documentation

| File | Purpose |
|------|---------|
| `README.md` | Main project documentation |
| `CONVERSION.md` | Migration guide from HTML to Next.js |
| `FILE_STRUCTURE.md` | This file - directory structure reference |

## Component Tree

```
Home (page.tsx)
├── SplashScreen
├── Navbar
│   └── Menu (profile dropdown)
├── AuthModal
│   └── Tabs (Sign In / Sign Up)
├── ProjectWizard
│   ├── Step 1: Entry Selection
│   ├── Step 2: Category Selection
│   ├── Step 3: Skills Selection
│   └── Step 4-7: Details, Vision, Budget, Complete
├── Hero Section
├── Categories Grid
│   └── CategoryCard (×21)
└── Footer
```

## API Integration Structure

```
app/ (Frontend)
  └── Components use hooks
      └── Hooks call API functions
          └── lib/api.ts
              └── Fetch /api/* routes
                  └── server.js (Express backend)
                      └── serverDb.js (DB layer)
                          └── db.json (Data)
```

## Styling Architecture

```
globals.css (Global styles)
├── Base styles (reset, body, inputs)
├── CSS animations
│   ├── assemble (splash)
│   ├── fadeIn (modals)
│   ├── slideUp (modal content)
│   ├── floatParticle (particles)
│   └── quotePulse (quotes)
└── Scrollbar styling

Tailwind Config (tailwind.config.ts)
├── Color palette
├── Custom animations
├── Breakpoints
└── Theme extensions

Component Classes
└── Tailwind utilities (no custom CSS in components)
```

## State Management Flow

```
App Component (page.tsx)
├── useAuth() hook
│   ├── user state
│   ├── profile state
│   ├── login()
│   ├── logout()
│   └── updateProfile()
│
├── useWizard() hook
│   ├── step state
│   ├── entry state
│   ├── category state
│   ├── skills state
│   └── navigation functions
│
└── Local state (React.useState)
    ├── showAuth
    ├── showWizard
    └── showSplash
```

## Data Flow Examples

### Authentication Flow
```
User clicks Login
  ↓
AuthModal opens (showAuth state)
  ↓
User enters contact & OTP
  ↓
onSignIn callback
  ↓
auth.login(name, contact) from useAuth
  ↓
User state updated
  ↓
localStorage.setItem('user', ...)
  ↓
Navbar updates with user info
```

### Project Creation Flow
```
User clicks "Start Project"
  ↓
ProjectWizard opens (showWizard state)
  ↓
User goes through steps (useWizard hook)
  ↓
Validate each step
  ↓
On complete: onComplete callback
  ↓
apiPublishProject() called
  ↓
Success: close wizard, show notification
```

## Environment Variables (Future)

Create `.env.local` for backend connection:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Make Big
```

## Build Output

```
npm run build
  ↓
.next/ (generated)
├── static/
│   ├── chunks/ (JS code)
│   └── css/ (compiled CSS)
├── server/ (server components)
└── [other optimized files]
```

## Performance Considerations

- **Code Splitting** - Next.js auto-splits by route
- **CSS Optimization** - Tailwind purges unused CSS
- **Image Optimization** - Use Next.js `<Image />`
- **Lazy Loading** - Components load on demand
- **Type Safety** - Catch errors at build time

## Development Tips

1. **Add new pages** in `/app/` directory
2. **Add components** in `/components/` directory
3. **Add hooks** in `/lib/hooks/` directory
4. **Add types** to `/lib/types.ts`
5. **Add constants** to `/lib/constants.ts`
6. **Always use TypeScript** (.ts/.tsx files)
7. **Use Tailwind classes** for styling

## File Naming Conventions

- **Components**: PascalCase (Button.tsx, AuthModal.tsx)
- **Hooks**: camelCase with 'use' prefix (useAuth.ts, useWizard.ts)
- **Utilities**: camelCase (utils.ts, api.ts, constants.ts)
- **Types**: types.ts (all interfaces together)
- **Styles**: Inline Tailwind classes (no .module.css files)

---

For more information, see [README.md](README.md) and [CONVERSION.md](CONVERSION.md)
