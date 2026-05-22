# Make Big - Modern Next.js + React Project

A modern, production-ready project collaboration platform built with Next.js 14, React 18, TypeScript, and Tailwind CSS.

## 🎯 Features

- **Next.js App Router** - Modern server and client components
- **React 18** - Latest React with hooks and concurrent features
- **TypeScript** - Full type safety across the codebase
- **Tailwind CSS** - Utility-first CSS framework for responsive design
- **Reusable Components** - Well-organized, composable React components
- **Custom Hooks** - Authentication, wizard state management
- **Modern Styling** - Dark theme with Tailwind utilities
- **Mobile Responsive** - Fully responsive design for all devices
- **Production Ready** - Clean code structure, best practices applied

## 📁 Project Structure

```
/app                 # Next.js app directory (routes and layouts)
  /layout.tsx        # Root layout with metadata
  /page.tsx          # Home page
  /globals.css       # Global styles
  
/components          # Reusable React components
  /ui               # Base UI components (Button, Input, Modal, Card, etc.)
  /Navbar.tsx       # Navigation bar
  /AuthModal.tsx    # Authentication modal
  /SplashScreen.tsx # Splash screen
  /ProjectWizard.tsx # Multi-step project wizard
  /ProjectCard.tsx  # Project display card
  /ProfileCard.tsx  # User profile card
  /CategoryCard.tsx # Category display card
  
/lib                # Utility functions, types, and hooks
  /types.ts         # TypeScript interfaces
  /constants.ts     # Constants and data
  /utils.ts         # Helper utility functions
  /api.ts           # API integration functions
  /hooks            # Custom React hooks
    /useAuth.ts     # Authentication state management
    /useWizard.ts   # Wizard state management

/styles            # Additional stylesheet (if needed)
```

## 🚀 Getting Started

### Installation

```bash
npm install
# or
yarn install
```

### Development

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

### Run API Server (optional)

```bash
npm run api:dev
```

The API server will run on port 3000 (or configured port).

## 🏗️ Key Components

### UI Components (`/components/ui`)
- **Button** - Configurable button with variants (primary, secondary, ghost, outline)
- **Input** - Form input with labels and error states
- **Modal** - Reusable modal dialog
- **Card** - Card container with hover effects
- **Tabs** - Tab navigation component
- **ProgressBar** - Progress indicator for multi-step flows

### Layout Components
- **Navbar** - Top navigation with user menu
- **AuthModal** - Sign in / Sign up modal
- **SplashScreen** - Animated splash screen
- **ProjectWizard** - Multi-step project creation wizard

### Feature Components
- **ProjectCard** - Display projects with details
- **ProfileCard** - Show user profile information
- **CategoryCard** - Display project categories

## 🎨 Styling

### Tailwind CSS Configuration
- Custom color palette (slate, sky, cyan)
- Custom animations (fadeIn, slideUp)
- Dark theme optimized
- Responsive breakpoints (mobile first)

### CSS Classes Usage
All styling uses Tailwind utility classes. No custom CSS except animations in `globals.css`.

## 🔐 Authentication

The app uses local storage for authentication (development). Replace with your backend:

```typescript
// useAuth hook provides:
- login(name, contact)
- logout()
- updateProfile(profile)
- checkAuth()
- user state
- profile state
```

## 📱 Responsive Design

- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Flexible grid layouts
- Touch-friendly interactive elements

## 🔄 State Management

### Custom Hooks

**useAuth** - Authentication state
```typescript
const { user, profile, login, logout, updateProfile } = useAuth();
```

**useWizard** - Multi-step form state
```typescript
const { state, selectEntry, selectCategory, toggleSkill, next, prev } = useWizard();
```

## 🌐 API Integration

API functions in `/lib/api.ts`:
- `apiGetSeed()` - Fetch seed data
- `apiUpsertUser()` - Create/update user
- `apiGetProfile()` - Get user profile
- `apiUpsertProfile()` - Update profile
- `apiPublishProject()` - Publish new project
- `apiGetNotifications()` - Fetch notifications

## 📚 Type Safety

Full TypeScript support with interfaces in `/lib/types.ts`:
- User, Profile, Project, Person
- Category, WizardState, AppState
- And more...

## 🎯 Future Enhancements

- [ ] Dashboard page with project management
- [ ] User profiles and portfolios
- [ ] Project matching algorithm
- [ ] Notifications system
- [ ] Team collaboration features
- [ ] Real-time updates with WebSockets
- [ ] Payment integration
- [ ] Advanced search and filtering
- [ ] Social features (comments, likes)
- [ ] Analytics and reporting

## 🛠️ Development Tips

1. **Components** - Keep components small and focused
2. **Hooks** - Use custom hooks for shared logic
3. **Types** - Always define TypeScript interfaces
4. **Styles** - Use Tailwind utilities, avoid custom CSS
5. **API** - Centralize API calls in `/lib/api.ts`
6. **State** - Use React hooks for local state

## 📝 Code Examples

### Using the Auth Hook
```typescript
'use client';
import { useAuth } from '@/lib/hooks/useAuth';

export function MyComponent() {
  const { user, login, logout } = useAuth();
  
  return (
    <button onClick={() => login('John Doe', 'john@example.com')}>
      {user ? `Welcome ${user.name}` : 'Login'}
    </button>
  );
}
```

### Creating a Reusable Component
```typescript
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface MyCardProps {
  title: string;
  onAction: () => void;
}

export function MyCard({ title, onAction }: MyCardProps) {
  return (
    <Card hoverable>
      <h3 className="text-lg font-bold text-sky-400">{title}</h3>
      <Button onClick={onAction} className="mt-4">
        Take Action
      </Button>
    </Card>
  );
}
```

## 📄 License

MIT License - Build Big projects together!

---

Built with ❤️ for creators by creators. (dynamic local backend)

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:5173`.

## What became “dynamic”

- Users are saved via `POST /api/users/upsert`
- People + open projects come from `GET /api/seed` (persisted in `db.json`)
- Invites are stored via `POST /api/invites`

This is a simple file-backed backend (good for local + prototype). For production, we’d swap `db.json` for a real DB (Postgres/Supabase/Firebase).

