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
import Profile from '../backend/models/Profile.js';
import Project from '../backend/models/Project.js';
import Post from '../backend/models/Post.js';
import Like from '../backend/models/Like.js';
import Comment from '../backend/models/Comment.js';
import Activity from '../backend/models/Activity.js';
import Course from '../backend/models/Course.js';
import { DEMO_USERS, DEMO_PROJECTS } from './demo-data.mjs';

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
    projectSlug: 'campusride-mobile-bangalore',
    lessons: [
      {
        title: 'Why campus food apps work',
        order: 1,
        content:
          'Students need fast, affordable food without leaving study spots. A campus food app connects canteens, tracks orders, and splits bills.\n\nKey features: menu browse, live order status, roommate bill split.',
        videoUrl: 'https://www.youtube.com/watch?v=0-S5a0eXPoc',
      },
      {
        title: 'Design your first screens',
        order: 2,
        content:
          'Sketch 3 screens: Home (restaurants), Menu, Cart.\n\nUse Figma or pen and paper. Focus on clarity — big tap targets, simple navigation.',
        videoUrl: 'https://www.youtube.com/watch?v=FTFaQHsqVa4',
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
        videoUrl: 'https://www.youtube.com/watch?v=7Tok22PX7N0',
      },
      {
        title: 'React components & state',
        order: 2,
        content: 'Break UI into components. Use useState for form inputs, lists, toggles.\n\nPractice: build a todo list in one file.',
        videoUrl: 'https://www.youtube.com/watch?v=SqcY0Gl0Pg4',
      },
      {
        title: 'REST APIs with Express',
        order: 3,
        content: 'Routes: GET /items, POST /items, PATCH /items/:id.\n\nConnect React fetch() to your local API on port 5001.',
        videoUrl: 'https://www.youtube.com/watch?v=L72fhGm1tfE',
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
        videoUrl: 'https://www.youtube.com/watch?v=aircAruvnKk',
      },
      {
        title: 'Your first prompt pipeline',
        order: 2,
        content: 'Input → prompt template → API call → parse response.\n\nTry Make Big AI Co-founder — it uses Groq under the hood.',
        videoUrl: 'https://www.youtube.com/watch?v=5sLYAQS9sEQ',
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
    projectSlug: 'healthtrack-campus-chennai',
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

const ALL_SECTORS = [
  { id: 'web', title: 'Web Development' },
  { id: 'mobile', title: 'Mobile App Development' },
  { id: 'game', title: 'Game Development' },
  { id: 'ai', title: 'AI & Machine Learning' },
  { id: 'security', title: 'Cybersecurity' },
  { id: 'cloud', title: 'Cloud Computing' },
  { id: 'devops', title: 'DevOps' },
  { id: 'data', title: 'Data Science' },
  { id: 'web3', title: 'Blockchain / Web3' },
  { id: 'embedded', title: 'Embedded Systems' },
  { id: 'arvr', title: 'AR / VR Development' },
  { id: 'film', title: 'Filmmaking' },
  { id: 'music', title: 'Music' },
  { id: 'writing', title: 'Writing' },
  { id: 'design', title: 'Design' },
  { id: 'content', title: 'Content Creation' },
  { id: 'photography', title: 'Photography' },
  { id: 'animation', title: 'Animation' },
  { id: 'marketing', title: 'Marketing' },
  { id: 'education', title: 'Education' },
  { id: 'health', title: 'Health & Wellness' },
];

const SECTOR_SKILLS = {
  game: ['Game Designer', 'Unity / Unreal Developer', '3D Artist'],
  security: ['Security Engineer', 'Penetration Tester', 'SOC Analyst'],
  cloud: ['Cloud Architect', 'AWS / Azure / GCP Engineer', 'Site Reliability Engineer'],
  devops: ['DevOps Engineer', 'CI/CD Specialist', 'Platform Engineer'],
  data: ['Data Scientist', 'Data Analyst', 'BI Developer'],
  web3: ['Smart Contract Developer', 'Web3 Frontend Developer', 'Blockchain Engineer'],
  embedded: ['Embedded Software Engineer', 'Firmware Developer', 'IoT Developer'],
  arvr: ['Unity Developer', '3D Artist', 'XR Interaction Designer'],
  film: ['Director', 'Cinematographer', 'Video Editor'],
  music: ['Music Producer', 'Sound Engineer', 'Composer'],
  writing: ['Screenwriter', 'Copywriter', 'Technical Writer'],
  content: ['Content Creator', 'Video Editor', 'Social Media Manager'],
  photography: ['Photographer', 'Photo Editor', 'Visual Storyteller'],
  animation: ['2D Animator', '3D Animator', 'Motion Designer'],
  marketing: ['Growth Marketer', 'Brand Strategist', 'SEO Specialist'],
  education: ['Instructional Designer', 'Course Creator', 'EdTech Developer'],
};

function makeSectorStarterCourse(sector) {
  const skills = SECTOR_SKILLS[sector.id] || ['Team Lead', 'Contributor', 'Designer'];
  return {
    title: `${sector.title} Starter Path`,
    slug: `${sector.id}-starter-path`,
    description: `Learn ${sector.title.toLowerCase()} fundamentals — watch lessons, track progress, then start a real project on Make Big.`,
    categoryId: sector.id,
    skills,
    level: 'beginner',
    hours: 3,
    coverImage: '',
    projectSlug: '',
    lessons: [
      {
        title: `Why ${sector.title}?`,
        order: 1,
        content: `${sector.title} is one of the sectors where Indian students can build portfolio projects instead of waiting for empty employment.\n\nPick one problem you care about and learn by doing.`,
      },
      {
        title: 'Core concepts & tools',
        order: 2,
        content: `Research the standard tools in ${sector.title.toLowerCase()}. Watch tutorials, take notes, and list 3 skills you want on your resume.`,
      },
      {
        title: 'Plan a mini project',
        order: 3,
        content: `Scope a 1–2 week project: one clear outcome, 2–4 teammates, weekly milestones.\n\nUse Make Big tasks and posts to stay accountable.`,
      },
      {
        title: 'Launch on Make Big',
        order: 4,
        content: `Finish this path, then create a ${sector.title} project on Make Big. Invite teammates from Explore or Friends.\n\nShip something real — that's what employers notice.`,
      },
    ],
  };
}

const COVERED_SECTORS = new Set(DEMO_COURSES.map((c) => c.categoryId));
const ALL_COURSES = [
  ...DEMO_COURSES,
  ...ALL_SECTORS.filter((s) => !COVERED_SECTORS.has(s.id)).map(makeSectorStarterCourse),
];

async function upsertUser(u) {
  return User.findOneAndUpdate(
    { contact: u.contact },
    {
      name: u.name,
      contact: u.contact,
      college: u.college,
      graduationYear: u.graduationYear || '',
      city: u.city,
      state: u.state,
      skills: u.skills,
      hobbies: u.hobbies || [],
      collegeEmailVerified: true,
      isLoggedIn: false,
      lastActive: new Date(),
    },
    { upsert: true, new: true }
  );
}

async function upsertProfile(u) {
  const p = u.profile;
  if (!p) return null;
  return Profile.findOneAndUpdate(
    { contact: u.contact },
    {
      contact: u.contact,
      role: p.role || 'member',
      tagline: p.tagline || '',
      bio: p.bio || '',
      categoryIds: p.categoryIds || [],
      skills: u.skills || [],
      rateMin: p.rateMin,
      rateMax: p.rateMax,
      currency: p.currency || 'INR',
      availableForInvites: p.availableForInvites ?? true,
      portfolio: p.portfolio || '',
    },
    { upsert: true, new: true }
  );
}

async function seed() {
  console.log('\n🌱 Seeding Make Big demo data...\n');
  await connectDB();

  for (const u of DEMO_USERS) {
    await upsertUser(u);
    await upsertProfile(u);
    console.log(`  ✓ user  ${u.contact} (+ profile)`);
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

    const journeyStage = spec.journeyStage || 'idea';
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
        demoDayReady: Boolean(spec.demoDayReady),
        demoDayPitch: spec.demoDayPitch || '',
        journey: {
          currentStage: journeyStage,
          configured: true,
          lastUpdated: new Date(),
        },
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
    for (const [i, p] of (spec.posts || []).entries()) {
      const post = await Post.create({
        projectId: project._id,
        authorId: p.author,
        body: p.body,
        imageUrl: p.image || '',
        createdAt: new Date(Date.now() - ((spec.posts || []).length - i) * 3600000 * 6),
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
  for (const spec of ALL_COURSES) {
    await Course.findOneAndUpdate(
      { slug: spec.slug },
      { $set: { ...spec, published: true } },
      { upsert: true, new: true }
    );
    courseCount += 1;
    console.log(`  ✓ course   ${spec.title}`);
  }

  console.log(`\n✅ Done — ${DEMO_USERS.length} users, ${DEMO_PROJECTS.length} projects, ${courseCount} courses, ${postCount} posts, ${likeCount} likes`);
  console.log('\nDemo accounts (sign in with OTP):');
  for (const u of DEMO_USERS.slice(0, 5)) {
    console.log(`  • ${u.contact}  (${u.name})`);
  }
  console.log('\nBrowse: Home → Explore, or open /learn for all course sectors.\n');

  await disconnectDB();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
