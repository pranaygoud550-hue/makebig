#!/usr/bin/env node
/**
 * Seed demo users, projects, posts (with photos), tasks, likes & comments.
 * Run: npm run seed:demo
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../backend/db/connection.js';
import User from '../backend/models/User.js';
import Project from '../backend/models/Project.js';
import Post from '../backend/models/Post.js';
import Like from '../backend/models/Like.js';
import Comment from '../backend/models/Comment.js';
import Activity from '../backend/models/Activity.js';
import Course from '../backend/models/Course.js';

const DEMO_COURSES = [
  {
    title: 'Build a Campus Food App',
    slug: 'build-campus-food-app',
    description:
      'Learn mobile app basics by building a campus food delivery product — the same idea as our demo Campus Food project.',
    categoryId: 'mobile',
    skills: ['React Native Developer', 'Backend Developer', 'UI/UX Designer'],
    level: 'beginner',
    hours: 4,
    coverImage: '/demo/campus-food.svg',
    projectSlug: 'campus-food-delivery-hyderabad',
    lessons: [
      {
        title: 'Why campus food apps work',
        order: 1,
        content:
          'Students need fast, affordable food without leaving study spots. A campus food app connects canteens, tracks orders, and splits bills.\n\nKey features: menu browse, live order status, roommate bill split.',
      },
      {
        title: 'Design your first screens',
        order: 2,
        content:
          'Sketch 3 screens: Home (restaurants), Menu, Cart.\n\nUse Figma or pen and paper. Focus on clarity — big tap targets, simple navigation.',
      },
      {
        title: 'Pick your mobile stack',
        order: 3,
        content:
          'React Native + Expo is great for college teams — one codebase for iOS and Android.\n\nBackend: Node.js + MongoDB (same stack as Make Big).',
        videoUrl: 'https://www.youtube.com/watch?v=0-S5a0eXPoc',
      },
      {
        title: 'Build an MVP in a week',
        order: 4,
        content:
          'Week plan:\n• Day 1–2: Auth + restaurant list\n• Day 3–4: Cart + checkout\n• Day 5: Order status\n• Day 6–7: Polish + demo\n\nShip something small, then iterate with teammates.',
      },
      {
        title: 'Launch on Make Big',
        order: 5,
        content:
          'Finish this course, then start a Mobile App project on Make Big. Invite a backend dev and designer from Friends or Explore.\n\nYour course progress shows you are ready to lead.',
      },
    ],
  },
  {
    title: 'Full-Stack Web Fundamentals',
    slug: 'full-stack-web-fundamentals',
    description: 'HTML → React → API → deploy. Everything you need before joining a web project team.',
    categoryId: 'web',
    skills: ['Frontend Developer', 'Backend Developer', 'Full Stack Developer'],
    level: 'beginner',
    hours: 6,
    coverImage: '/demo/make-big.svg',
    projectSlug: '',
    lessons: [
      {
        title: 'How the web works',
        order: 1,
        content: 'Browser sends HTTP request → server responds with HTML/JSON → browser renders.\n\nLearn DevTools Network tab — your best friend for debugging.',
      },
      {
        title: 'React components & state',
        order: 2,
        content: 'Break UI into components. Use useState for form inputs, lists, toggles.\n\nPractice: build a todo list in one file.',
      },
      {
        title: 'REST APIs with Express',
        order: 3,
        content: 'Routes: GET /items, POST /items, PATCH /items/:id.\n\nConnect React fetch() to your local API on port 5001.',
      },
      {
        title: 'Auth & sessions',
        order: 4,
        content: 'JWT tokens in Authorization header. Never store passwords in plain text.\n\nMake Big uses OTP + JWT — same pattern many startups use.',
      },
      {
        title: 'Ship with a team',
        order: 5,
        content: 'Split work: one person on UI, one on API, one on design review.\n\nUse Make Big tasks + posts to stay aligned.',
      },
    ],
  },
  {
    title: 'Intro to AI & Machine Learning',
    slug: 'intro-ai-machine-learning',
    description: 'Understand ML without a PhD — then join an AI project with confidence.',
    categoryId: 'ai',
    skills: ['ML Engineer', 'LLM Application Developer', 'Data Engineer'],
    level: 'intermediate',
    hours: 5,
    coverImage: '',
    projectSlug: '',
    lessons: [
      {
        title: 'AI vs ML vs LLMs',
        order: 1,
        content: 'AI = broad field. ML = learn from data. LLMs = large language models (ChatGPT, Groq, etc.).\n\nMost student projects use APIs, not training from scratch.',
      },
      {
        title: 'Your first prompt pipeline',
        order: 2,
        content: 'Input → prompt template → API call → parse response.\n\nTry Make Big AI Co-founder — it uses Groq under the hood.',
      },
      {
        title: 'Data you actually need',
        order: 3,
        content: 'Start with 50–100 good examples, not millions of rows.\n\nLabel clearly. Garbage in = garbage out.',
      },
      {
        title: 'Build an AI feature',
        order: 4,
        content: 'Pick one feature: smart search, task suggestions, or pitch generator.\n\nScope small — one endpoint, one UI button.',
      },
    ],
  },
  {
    title: 'UI/UX for Student Products',
    slug: 'ui-ux-student-products',
    description: 'Design apps classmates actually want to use — fast, mobile-first, accessible.',
    categoryId: 'design',
    skills: ['UI/UX Designer', 'Product Designer'],
    level: 'beginner',
    hours: 3,
    coverImage: '',
    projectSlug: '',
    lessons: [
      {
        title: 'Talk to 5 users',
        order: 1,
        content: 'Before pixels: ask 5 classmates what frustrates them. Write exact quotes.\n\nProblem first, mockups second.',
      },
      {
        title: 'Mobile-first layout',
        order: 2,
        content: 'Design for 375px width. Thumb-friendly buttons (min 44px). High contrast text.',
      },
      {
        title: 'Design system basics',
        order: 3,
        content: 'Pick 1 primary color (Make Big uses #0A66C2), 2 font sizes, consistent spacing (4/8/16px).',
      },
      {
        title: 'Hand off to developers',
        order: 4,
        content: 'Export assets, note spacing, link Figma. Join a Design category project on Make Big to practice real handoffs.',
      },
    ],
  },
  {
    title: 'Health Tech Basics',
    slug: 'health-tech-basics',
    description: 'Build responsible health products — inspired by our Blood Bank Network demo project.',
    categoryId: 'health',
    skills: ['Full Stack Developer', 'Security Engineer'],
    level: 'intermediate',
    hours: 4,
    coverImage: '/demo/blood-bank.svg',
    projectSlug: 'blood-bank-network-bangalore',
    lessons: [
      {
        title: 'Health data sensitivity',
        order: 1,
        content: 'Treat all health info as sensitive. Minimize collection. Encrypt in transit (HTTPS).\n\nNever share patient data in public project posts.',
      },
      {
        title: 'Blood bank use case',
        order: 2,
        content: 'Match donors to blood type + location. Notify via SMS/email. Track inventory at centers.\n\nSee the Blood Bank Network project on Explore.',
      },
      {
        title: 'Maps & geolocation',
        order: 3,
        content: 'Use city/state filters first (like Make Big Explore). Add maps later — start with list + search.',
      },
      {
        title: 'Team roles for health projects',
        order: 4,
        content: 'You need: backend dev, mobile/web dev, someone who understands the domain (medic/n NGO contact).\n\nPost roles in the project wizard.',
      },
    ],
  },
];

const DEMO_USERS = [
  {
    name: 'Priya Sharma',
    contact: 'priya@demo.makebig.in',
    college: 'JNTU Hyderabad',
    city: 'Hyderabad',
    state: 'Telangana',
    skills: ['react', 'node.js', 'ui design'],
  },
  {
    name: 'Arjun Reddy',
    contact: 'arjun@demo.makebig.in',
    college: 'RV College Bangalore',
    city: 'Bangalore',
    state: 'Karnataka',
    skills: ['python', 'mongodb', 'healthtech'],
  },
  {
    name: 'Make Big Team',
    contact: 'team@demo.makebig.in',
    college: 'Make Big HQ',
    city: 'Hyderabad',
    state: 'Telangana',
    skills: ['next.js', 'product', 'collaboration'],
  },
  {
    name: 'Sneha Patel',
    contact: 'sneha@demo.makebig.in',
    college: 'JNTU Hyderabad',
    city: 'Hyderabad',
    state: 'Telangana',
    skills: ['flutter', 'firebase'],
  },
  {
    name: 'Rahul Kumar',
    contact: 'rahul@demo.makebig.in',
    college: 'RV College Bangalore',
    city: 'Bangalore',
    state: 'Karnataka',
    skills: ['java', 'spring boot'],
  },
];

const DEMO_PROJECTS = [
  {
    name: 'Campus Food Delivery',
    slug: 'campus-food-delivery-hyderabad',
    desc: 'Order from campus canteens, track delivery live, and split bills with roommates. Built for college students who want fast, affordable food without leaving the library.',
    categoryId: 'mobile',
    projectPurpose: 'college',
    roles: ['React Native Dev', 'Backend Dev', 'UI Designer'],
    ownerContact: 'priya@demo.makebig.in',
    city: 'Hyderabad',
    state: 'Telangana',
    currency: 'INR',
    salaryMin: 8000,
    salaryMax: 15000,
    team: [
      { contact: 'priya@demo.makebig.in', role: 'owner' },
      { contact: 'sneha@demo.makebig.in', role: 'mobile dev' },
    ],
    image: '/demo/campus-food.svg',
    posts: [
      {
        author: 'priya@demo.makebig.in',
        body: 'Week 1 demo is live! Students can browse canteen menus and place orders from one app. Next up: live order tracking.',
        image: '/demo/campus-food.svg',
      },
      {
        author: 'sneha@demo.makebig.in',
        body: 'Mobile checkout flow wired up — UPI + card payments tested on Android emulator.',
      },
      {
        author: 'priya@demo.makebig.in',
        body: 'Looking for one more backend dev to help with order routing API. DM if interested!',
      },
    ],
    tasks: [
      { title: 'Design checkout screens', status: 'done', priority: 'high', assignee: 'sneha@demo.makebig.in' },
      { title: 'Build order API', status: 'in-progress', priority: 'high', assignee: 'priya@demo.makebig.in' },
      { title: 'Add live delivery map', status: 'todo', priority: 'medium', assignee: 'sneha@demo.makebig.in' },
    ],
  },
  {
    name: 'Blood Bank Network',
    slug: 'blood-bank-network-bangalore',
    desc: 'Connect blood donors with hospitals in real time. Emergency alerts, donor profiles, and a simple dashboard for college blood drives.',
    categoryId: 'web',
    projectPurpose: 'community',
    roles: ['Full-stack Dev', 'Data Analyst', 'Outreach Lead'],
    ownerContact: 'arjun@demo.makebig.in',
    city: 'Bangalore',
    state: 'Karnataka',
    currency: 'INR',
    salaryMin: 0,
    salaryMax: 0,
    team: [
      { contact: 'arjun@demo.makebig.in', role: 'owner' },
      { contact: 'rahul@demo.makebig.in', role: 'backend dev' },
    ],
    image: '/demo/blood-bank.svg',
    posts: [
      {
        author: 'arjun@demo.makebig.in',
        body: 'Campus blood drive this Saturday — 24 donors registered so far! Share with friends.',
        image: '/demo/blood-bank.svg',
      },
      {
        author: 'rahul@demo.makebig.in',
        body: 'Donor matching algorithm v1 done. O+ requests now route to nearest available donors within 5 km.',
      },
    ],
    tasks: [
      { title: 'Donor registration form', status: 'done', priority: 'high', assignee: 'arjun@demo.makebig.in' },
      { title: 'SMS alert integration', status: 'in-progress', priority: 'high', assignee: 'rahul@demo.makebig.in' },
      { title: 'Hospital dashboard', status: 'todo', priority: 'medium', assignee: 'arjun@demo.makebig.in' },
    ],
  },
  {
    name: 'Make Big Platform',
    slug: 'make-big-platform-hyderabad',
    desc: 'The collaboration hub for college project teams — tasks, posts, team chat, co-founder matching, and AI coding help. No unemployment in India after graduation.',
    categoryId: 'web',
    projectPurpose: 'employment',
    roles: ['Full-stack Dev', 'Product Designer', 'DevOps'],
    ownerContact: 'team@demo.makebig.in',
    city: 'Hyderabad',
    state: 'Telangana',
    currency: 'INR',
    salaryMin: 12000,
    salaryMax: 25000,
    team: [
      { contact: 'team@demo.makebig.in', role: 'owner' },
      { contact: 'priya@demo.makebig.in', role: 'frontend' },
      { contact: 'arjun@demo.makebig.in', role: 'backend' },
    ],
    image: '/demo/make-big.svg',
    posts: [
      {
        author: 'team@demo.makebig.in',
        body: 'Make Big is live for demo! Create a project, invite teammates, post updates with photos, and track tasks on the kanban board — all in real time.',
        image: '/demo/make-big.svg',
      },
      {
        author: 'priya@demo.makebig.in',
        body: 'Just shipped live notifications and socket updates. Try creating a task in one tab and watch it appear in another!',
      },
      {
        author: 'arjun@demo.makebig.in',
        body: 'MongoDB Atlas connected. Ready for real student teams to join and collaborate.',
      },
    ],
    tasks: [
      { title: 'Fix notification panel', status: 'done', priority: 'high', assignee: 'priya@demo.makebig.in' },
      { title: 'Wire live socket updates', status: 'done', priority: 'high', assignee: 'arjun@demo.makebig.in' },
      { title: 'Seed demo data', status: 'done', priority: 'medium', assignee: 'team@demo.makebig.in' },
      { title: 'Deploy to production', status: 'todo', priority: 'high', assignee: 'team@demo.makebig.in' },
    ],
  },
];

async function upsertUser(u) {
  return User.findOneAndUpdate(
    { contact: u.contact },
    {
      name: u.name,
      contact: u.contact,
      college: u.college,
      city: u.city,
      state: u.state,
      skills: u.skills,
      isLoggedIn: false,
      lastActive: new Date(),
    },
    { upsert: true, new: true }
  );
}

async function seed() {
  console.log('\n🌱 Seeding Make Big demo data...\n');
  await connectDB();

  for (const u of DEMO_USERS) {
    await upsertUser(u);
    console.log(`  ✓ user  ${u.contact}`);
  }

  let postCount = 0;
  let likeCount = 0;

  for (const spec of DEMO_PROJECTS) {
    const teamMembers = spec.team.map((m) => ({
      contact: m.contact,
      role: m.role,
      status: 'joined',
      joinedAt: new Date(Date.now() - Math.random() * 7 * 86400000),
    }));

    const tasks = spec.tasks.map((t) => ({
      title: t.title,
      description: '',
      status: t.status,
      priority: t.priority,
      assignee: t.assignee,
      createdBy: spec.ownerContact,
      createdAt: new Date(Date.now() - Math.random() * 5 * 86400000),
    }));

    const project = await Project.findOneAndUpdate(
      { slug: spec.slug },
      {
        name: spec.name,
        slug: spec.slug,
        desc: spec.desc,
        categoryId: spec.categoryId,
        projectPurpose: spec.projectPurpose,
        roles: spec.roles,
        ownerContact: spec.ownerContact,
        status: 'published',
        visibility: 'public',
        city: spec.city,
        state: spec.state,
        currency: spec.currency,
        salaryMin: spec.salaryMin,
        salaryMax: spec.salaryMax,
        teamMembers,
        tasks,
        maxTeamSize: 10,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`  ✓ project  ${spec.name} (${spec.slug})`);

    const oldPostIds = (await Post.find({ projectId: project._id }).select('_id')).map((p) => p._id);
    if (oldPostIds.length) {
      await Like.deleteMany({ postId: { $in: oldPostIds } });
      await Comment.deleteMany({ postId: { $in: oldPostIds } });
    }
    await Post.deleteMany({ projectId: project._id });
    await Activity.deleteMany({ projectId: project._id });

    const createdPosts = [];
    for (const [i, p] of spec.posts.entries()) {
      const post = await Post.create({
        projectId: project._id,
        authorId: p.author,
        body: p.body,
        imageUrl: p.image || '',
        createdAt: new Date(Date.now() - (spec.posts.length - i) * 3600000 * 6),
      });
      createdPosts.push(post);
      postCount += 1;
    }

    for (const post of createdPosts) {
      const likers = DEMO_USERS.filter((u) => u.contact !== post.authorId).slice(0, 3);
      for (const liker of likers) {
        await Like.create({ postId: post._id, userId: liker.contact });
        likeCount += 1;
      }
      await Comment.create({
        postId: post._id,
        authorId: spec.ownerContact,
        body: 'Great update — keep it going! 🙌',
        createdAt: new Date(post.createdAt.getTime() + 3600000),
      });
    }

    await Activity.create({
      projectId: project._id,
      userId: spec.ownerContact,
      type: 'project_published',
      description: `${spec.name} is now live on Make Big`,
      createdAt: new Date(Date.now() - 86400000 * 3),
    });

    for (const t of spec.tasks.filter((x) => x.status === 'done')) {
      await Activity.create({
        projectId: project._id,
        userId: t.assignee,
        type: 'task_updated',
        description: `Task "${t.title}" moved to done`,
        createdAt: new Date(Date.now() - 86400000),
      });
    }
  }

  console.log('\nSeeding courses…');
  let courseCount = 0;
  for (const spec of DEMO_COURSES) {
    await Course.findOneAndUpdate(
      { slug: spec.slug },
      { $set: { ...spec, published: true } },
      { upsert: true, new: true }
    );
    courseCount += 1;
    console.log(`  ✓ course   ${spec.title}`);
  }

  console.log(`\n✅ Done — ${DEMO_USERS.length} users, ${DEMO_PROJECTS.length} projects, ${courseCount} courses, ${postCount} posts, ${likeCount} likes`);
  console.log('\nDemo accounts (sign in with OTP — use any email, or these contacts):');
  for (const u of DEMO_USERS.slice(0, 3)) {
    console.log(`  • ${u.contact}  (${u.name})`);
  }
  console.log('\nBrowse: Home → Explore or Courses tab, or open Posts for the global feed.\n');

  await disconnectDB();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
