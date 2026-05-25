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

  console.log(`\n✅ Done — ${DEMO_USERS.length} users, ${DEMO_PROJECTS.length} projects, ${postCount} posts, ${likeCount} likes`);
  console.log('\nDemo accounts (sign in with OTP — use any email, or these contacts):');
  for (const u of DEMO_USERS.slice(0, 3)) {
    console.log(`  • ${u.contact}  (${u.name})`);
  }
  console.log('\nBrowse: Home → Explore, or open Posts tab for the global feed.\n');

  await disconnectDB();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
