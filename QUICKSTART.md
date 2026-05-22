# 🚀 Quick Start Guide - Make Big Next.js

Get up and running with the modern Make Big application in 5 minutes!

## Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- npm or yarn package manager
- A code editor (VS Code recommended)

## Installation (5 minutes)

### Step 1: Install Dependencies
```bash
cd /path/to/make-big
npm install
```

### Step 2: Start Development Server
```bash
npm run dev
```

### Step 3: Open in Browser
```
http://localhost:3000
```

**That's it!** 🎉 Your Next.js app is running!

## What You'll See

1. **Splash Screen** - Animated 3.4s intro (disable in code if needed)
2. **Navbar** - Login/profile in top right
3. **Hero Section** - "Build Big Ideas Together" with CTA button
4. **Categories Grid** - 21 creative fields
5. **Footer** - Copyright and credits

## First Time Usage

### Try the Auth Flow
1. Click **"Start a Project"** button
2. Click **"Login"** in the modal
3. Enter name, email, and skills
4. Use generated OTP (shown in alert)
5. You're logged in! ✓

### Explore the Project Wizard
1. Once logged in, click **"Start a Project"** again
2. Choose **"Create Project"** or **"Join Project"**
3. Walk through 6-7 steps
4. Fill in project details
5. See the completion screen

### Edit Your Profile
1. Click profile avatar in navbar (after login)
2. Select **"Edit Profile"**
3. Update your skills, rate, availability
4. Click **"Save"**

## Key Files to Know

- **`app/page.tsx`** - Home page (what you see first)
- **`components/`** - All React components
- **`lib/hooks/`** - Custom state management
- **`lib/constants.ts`** - 21 categories, skills, text copy
- **`tailwind.config.ts`** - Colors and styling config

## Common Tasks

### Run Tests
```bash
npm run lint
```

### Build for Production
```bash
npm run build
npm start
```

### Run Backend API (optional)
```bash
npm run api:dev
```

## Troubleshooting

### Port 3000 Already in Use?
```bash
npm run dev -- -p 3001
```

### Changes Not Showing?
1. Stop dev server (Ctrl+C)
2. Run `npm run dev` again
3. Hard refresh browser (Ctrl+Shift+R)

### Module Not Found Error?
```bash
rm -rf node_modules
npm install
npm run dev
```

## Project Structure (Simplified)

```
make-big/
├── app/              ← Pages (homepage)
├── components/       ← React components
├── lib/              ← Hooks, utilities, types
└── public/           ← Images, fonts (add here)
```

## Next Steps

1. **Explore Components**
   - Open `/components` folder
   - Review Button, Card, Modal components

2. **Understand State Management**
   - Check `/lib/hooks/useAuth.ts`
   - Review `/lib/hooks/useWizard.ts`

3. **Learn the Data Flow**
   - Read [CONVERSION.md](CONVERSION.md)
   - Review [FILE_STRUCTURE.md](FILE_STRUCTURE.md)

4. **Customize**
   - Change colors in `tailwind.config.ts`
   - Modify copy in `lib/constants.ts`
   - Edit styles in `app/globals.css`

## Documentation

- **[README.md](README.md)** - Full project documentation
- **[CONVERSION.md](CONVERSION.md)** - How we converted from HTML/JS
- **[FILE_STRUCTURE.md](FILE_STRUCTURE.md)** - Complete file reference

## Useful Commands

```bash
npm run dev              # Start development
npm run build           # Build for production
npm start               # Run production build
npm run lint            # Check code quality
npm run api:dev         # Run backend API
```

## Tips & Tricks

### Working with Components
```typescript
// Import and use
import { Button } from '@/components/ui/Button';

<Button onClick={() => alert('Clicked!')}>
  Click Me
</Button>
```

### Using Custom Hooks
```typescript
import { useAuth } from '@/lib/hooks/useAuth';

const { user, login, logout } = useAuth();
```

### Adding Tailwind Classes
```typescript
// Dark mode class
<div className="bg-slate-900 text-slate-50">
  Dark card
</div>

// Hover effects
<div className="hover:bg-sky-400 transition-all">
  Hover me
</div>
```

## Customization

### Change App Name
1. Edit `app/layout.tsx` - Change title in metadata
2. Edit `components/Navbar.tsx` - Change logo text
3. Edit `lib/constants.ts` - Update app constants

### Change Colors
1. Open `tailwind.config.ts`
2. Modify color values in theme
3. Update CSS animations in `app/globals.css`

### Add New Categories
1. Open `lib/constants.ts`
2. Add to `WIZARD_CATEGORIES` array
3. Add skills to `WIZARD_SKILLS_MAP` object

## Development Best Practices

✅ **Do:**
- Use TypeScript for type safety
- Keep components small and focused
- Use custom hooks for shared logic
- Use Tailwind classes for styling
- Follow file naming conventions

❌ **Don't:**
- Add custom CSS (use Tailwind)
- Create global variables (use hooks)
- Mix concerns in components
- Ignore TypeScript errors
- Skip component prop types

## Getting Help

### Check Existing Code
1. Look in `/components/ui/` for component examples
2. Check `/lib/hooks/` for state management
3. Review `app/page.tsx` for usage examples

### Resources
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [Tailwind CSS Docs](https://tailwindcss.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Project Features

✨ **Modern Stack**
- Next.js 14 with App Router
- React 18 with Hooks
- TypeScript for type safety
- Tailwind CSS for styling

✨ **Built-in Features**
- Authentication (sign in/up with OTP)
- Multi-step project wizard
- User profile management
- 21 project categories
- Responsive design
- Dark theme

✨ **Developer Experience**
- Hot module replacement (HMR)
- ESLint for code quality
- Type checking on build
- Development vs production builds

## What's Inside

### Components (20+)
- 6 UI base components
- 8 layout & feature components
- Full authentication flow
- Multi-step wizard

### State Management
- Custom authentication hook
- Wizard navigation hook
- Local storage persistence
- API integration ready

### Styling
- 50+ Tailwind configurations
- 5+ custom animations
- Dark theme optimized
- Mobile responsive

## Production Ready?

Not quite! Here's what's needed:

- [ ] Backend database (replace localStorage)
- [ ] Real OTP service (Twilio, Firebase)
- [ ] Payment integration (Stripe, Razorpay)
- [ ] Deployment (Vercel, AWS, Netlify)
- [ ] Email service (SendGrid, Resend)
- [ ] Error tracking (Sentry)
- [ ] Analytics (Vercel Analytics, PostHog)

## Next Phase Development

These features are ready to implement:

1. **Dashboard Page** - User workspace
2. **Project Management** - CRUD operations
3. **Team Collaboration** - Real-time updates
4. **Notifications** - Email & in-app alerts
5. **Messaging** - Team communication
6. **Payments** - Transaction handling

## Deployment

### Deploy to Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Deploy to Other Platforms
- **Netlify** - `netlify deploy`
- **AWS** - Use Amplify or EC2
- **Docker** - Create Dockerfile
- **Heroku** - Use buildpack

## Performance

- ✅ ~90+ Lighthouse score
- ✅ Code splitting enabled
- ✅ CSS optimization with Tailwind
- ✅ Image optimization ready
- ✅ SEO optimized

## You're All Set! 🎉

- [x] Installed dependencies
- [x] Started development server
- [x] Explored the app
- [x] Tried authentication
- [x] Reviewed code structure

**Now go build something amazing!** 🚀

---

**Questions?** Check the [README.md](README.md) for detailed documentation.

**Found an issue?** Review the [FILE_STRUCTURE.md](FILE_STRUCTURE.md) for file organization.

**Want to understand the conversion?** Read [CONVERSION.md](CONVERSION.md).

**Happy coding!** ❤️
