#!/usr/bin/env node
/**
 * Remove seeded demo users/projects from MongoDB.
 *
 * Dry run (default): npm run cleanup:demo
 * Delete for real:    npm run cleanup:demo -- --confirm
 * Also remove courses seeded by seed:demo: npm run cleanup:demo -- --confirm --courses
 *
 * Uses MONGODB_URI from .env / backend/.env (same as production when pointed at Atlas).
 */
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: 'backend/.env' });

import mongoose from 'mongoose';
import User from '../backend/models/User.js';
import Profile from '../backend/models/Profile.js';
import Project from '../backend/models/Project.js';
import Post from '../backend/models/Post.js';
import Like from '../backend/models/Like.js';
import Comment from '../backend/models/Comment.js';
import Activity from '../backend/models/Activity.js';
import Message from '../backend/models/Message.js';
import Notification from '../backend/models/Notification.js';
import Invite from '../backend/models/Invite.js';
import StandupLog from '../backend/models/StandupLog.js';
import ProjectNote from '../backend/models/ProjectNote.js';
import AgentRun from '../backend/models/AgentRun.js';
import LinkHistory from '../backend/models/LinkHistory.js';
import Build from '../backend/models/Build.js';
import StartupBookmark from '../backend/models/StartupBookmark.js';
import StartupFollow from '../backend/models/StartupFollow.js';
import FriendRequest from '../backend/models/FriendRequest.js';
import IdeaValidation from '../backend/models/IdeaValidation.js';
import TestSession from '../backend/models/TestSession.js';
import CourseEnrollment from '../backend/models/CourseEnrollment.js';
import Course from '../backend/models/Course.js';
import Report from '../backend/models/Report.js';
import {
  DEMO_CONTACTS,
  DEMO_PROJECT_SLUGS,
  DEMO_CONTACT_PATTERN,
  isDemoContact,
} from './demo-data.mjs';

const args = process.argv.slice(2);
const confirm = args.includes('--confirm');
const removeCourses = args.includes('--courses');

function safeUri(uri) {
  return uri.replace(/:[^:@]+@/, ':****@');
}

function printAuthHelp() {
  console.error('\n✗ MongoDB authentication failed (bad auth)\n');
  console.error('  Your local password does not match Atlas. Production on Render may still work');
  console.error('  because Render has a different MONGODB_URI.\n');
  console.error('  Fix (pick one):\n');
  console.error('  1. Render → your API service → Environment → copy MONGODB_URI');
  console.error('     Paste into BOTH .env and backend/.env, then run cleanup again.\n');
  console.error('  2. Atlas → Database Access → edit user → reset password');
  console.error('     Update .env + Render env with the new connection string.\n');
  console.error('  3. One-off without editing files:');
  console.error('     MONGODB_URI="mongodb+srv://..." npm run cleanup:demo -- --confirm\n');
  console.error('  If the password has @ # : / etc., URL-encode it in the connection string.\n');
}

async function connectForCleanup(uri) {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ MongoDB Connected:', safeUri(uri));
  } catch (error) {
    const msg = String(error.message || error);
    if (/bad auth|authentication failed|Unauthorized/i.test(msg)) {
      printAuthHelp();
    } else {
      console.error('\n✗ MongoDB connection failed:', msg);
      console.error('  Check MONGODB_URI, Atlas IP allowlist (0.0.0.0/0 for dev), and network.\n');
    }
    process.exit(1);
  }
}

async function disconnectForCleanup() {
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
}

async function countByProjectIds(Model, projectIds, label) {
  if (!projectIds.length) return 0;
  const n = await Model.countDocuments({ projectId: { $in: projectIds } });
  if (n) console.log(`    ${label}: ${n}`);
  return n;
}

async function cleanup() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
  if (!uri) {
    console.error('\n✗ MONGODB_URI not set. Add it to .env or backend/.env\n');
    process.exit(1);
  }

  const isAtlas = uri.includes('mongodb.net') || uri.includes('mongodb+srv');
  console.log('\n🧹 Make Big — demo data cleanup\n');
  console.log(`  Database: ${isAtlas ? 'Atlas / remote' : 'local or custom'}`);
  console.log(`  Mode: ${confirm ? 'DELETE (--confirm)' : 'DRY RUN (pass --confirm to delete)'}`);
  if (removeCourses) console.log('  Courses: will remove seed:demo courses');
  console.log('');

  await connectForCleanup(uri);

  const demoProjects = await Project.find({
    $or: [{ slug: { $in: DEMO_PROJECT_SLUGS } }, { ownerContact: DEMO_CONTACT_PATTERN }],
  }).select('_id name slug ownerContact');

  const projectIds = demoProjects.map((p) => p._id);
  const demoUsers = await User.find({ contact: { $in: DEMO_CONTACTS } }).select('contact name');
  const extraDemoUsers = await User.find({ contact: DEMO_CONTACT_PATTERN }).select('contact name');
  const allDemoContacts = [
    ...new Set([...DEMO_CONTACTS, ...extraDemoUsers.map((u) => u.contact)]),
  ];

  console.log('Will remove:');
  for (const p of demoProjects) {
    console.log(`  • project  ${p.name} (${p.slug}) — ${p.ownerContact}`);
  }
  for (const u of demoUsers.length ? demoUsers : extraDemoUsers) {
    console.log(`  • user     ${u.contact} (${u.name})`);
  }
  if (!demoProjects.length && !allDemoContacts.length) {
    console.log('  (nothing found — demo data may already be cleared)');
  }

  if (projectIds.length) {
    console.log('\n  Related records:');
    await countByProjectIds(Post, projectIds, 'posts');
    await countByProjectIds(Activity, projectIds, 'activities');
    await countByProjectIds(Message, projectIds, 'messages');
    await countByProjectIds(StandupLog, projectIds, 'standup logs');
    await countByProjectIds(ProjectNote, projectIds, 'notes');
    await countByProjectIds(AgentRun, projectIds, 'agent runs');
    await countByProjectIds(LinkHistory, projectIds, 'link history');
    await countByProjectIds(Build, projectIds, 'builds');
    await countByProjectIds(Invite, projectIds, 'invites');
    await countByProjectIds(StartupBookmark, projectIds, 'bookmarks');
    await countByProjectIds(StartupFollow, projectIds, 'follows');
    await countByProjectIds(Notification, projectIds, 'notifications (by project)');
    const postIds = (await Post.find({ projectId: { $in: projectIds } }).select('_id')).map((p) => p._id);
    if (postIds.length) {
      const likes = await Like.countDocuments({ postId: { $in: postIds } });
      const comments = await Comment.countDocuments({ postId: { $in: postIds } });
      if (likes) console.log(`    likes: ${likes}`);
      if (comments) console.log(`    comments: ${comments}`);
    }
  }

  if (allDemoContacts.length) {
    const fr = await FriendRequest.countDocuments({
      $or: [{ fromContact: { $in: allDemoContacts } }, { toContact: { $in: allDemoContacts } }],
    });
    const notif = await Notification.countDocuments({ contact: { $in: allDemoContacts } });
    const ideas = await IdeaValidation.countDocuments({ contact: { $in: allDemoContacts } });
    const tests = await TestSession.countDocuments({ contact: { $in: allDemoContacts } });
    const enroll = await CourseEnrollment.countDocuments({ contact: { $in: allDemoContacts } });
    const profiles = await Profile.countDocuments({ contact: { $in: allDemoContacts } });
    const reports = await Report.countDocuments({
      $or: [{ reportedContact: { $in: allDemoContacts } }, { reportedBy: { $in: allDemoContacts } }],
    });
    if (fr) console.log(`    friend requests: ${fr}`);
    if (notif) console.log(`    user notifications: ${notif}`);
    if (ideas) console.log(`    idea validations: ${ideas}`);
    if (tests) console.log(`    skill test sessions: ${tests}`);
    if (enroll) console.log(`    course enrollments: ${enroll}`);
    if (profiles) console.log(`    profiles: ${profiles}`);
    if (reports) console.log(`    reports: ${reports}`);
  }

  if (removeCourses) {
    const courseCount = await Course.countDocuments({
      $or: [
        { projectSlug: { $in: DEMO_PROJECT_SLUGS } },
        { coverImage: /^\/demo\// },
        { slug: 'build-campus-food-app' },
      ],
    });
    if (courseCount) console.log(`    seeded courses: ${courseCount}`);
  }

  if (!confirm) {
    console.log('\n⚠ Dry run only — no data deleted.');
    console.log('  To delete: npm run cleanup:demo -- --confirm');
    console.log('  Never run seed:demo against production again.\n');
    await disconnectForCleanup();
    return;
  }

  if (isAtlas) {
    console.log('\n⚠ Deleting from remote Atlas database in 3 seconds… (Ctrl+C to cancel)');
    await new Promise((r) => setTimeout(r, 3000));
  }

  let deleted = { projects: 0, users: 0, courses: 0 };

  if (projectIds.length) {
    const postIds = (await Post.find({ projectId: { $in: projectIds } }).select('_id')).map((p) => p._id);
    if (postIds.length) {
      await Like.deleteMany({ postId: { $in: postIds } });
      await Comment.deleteMany({ postId: { $in: postIds } });
    }
    await Post.deleteMany({ projectId: { $in: projectIds } });
    await Activity.deleteMany({ projectId: { $in: projectIds } });
    await Message.deleteMany({ projectId: { $in: projectIds } });
    await StandupLog.deleteMany({ projectId: { $in: projectIds } });
    await ProjectNote.deleteMany({ projectId: { $in: projectIds } });
    await AgentRun.deleteMany({ projectId: { $in: projectIds } });
    await LinkHistory.deleteMany({ projectId: { $in: projectIds } });
    await Build.deleteMany({ projectId: { $in: projectIds } });
    await Invite.deleteMany({ projectId: { $in: projectIds } });
    await StartupBookmark.deleteMany({ projectId: { $in: projectIds } });
    await StartupFollow.deleteMany({ projectId: { $in: projectIds } });
    await Notification.deleteMany({ projectId: { $in: projectIds } });
    const pr = await Project.deleteMany({ _id: { $in: projectIds } });
    deleted.projects = pr.deletedCount || 0;
  }

  if (allDemoContacts.length) {
    await FriendRequest.deleteMany({
      $or: [{ fromContact: { $in: allDemoContacts } }, { toContact: { $in: allDemoContacts } }],
    });
    await Notification.deleteMany({ contact: { $in: allDemoContacts } });
    await IdeaValidation.deleteMany({ contact: { $in: allDemoContacts } });
    await TestSession.deleteMany({ contact: { $in: allDemoContacts } });
    await CourseEnrollment.deleteMany({ contact: { $in: allDemoContacts } });
    await Report.deleteMany({
      $or: [{ reportedContact: { $in: allDemoContacts } }, { reportedBy: { $in: allDemoContacts } }],
    });
    await Profile.deleteMany({ contact: { $in: allDemoContacts } });
    const ur = await User.deleteMany({ contact: DEMO_CONTACT_PATTERN });
    deleted.users = ur.deletedCount || 0;
  }

  if (removeCourses) {
    const cr = await Course.deleteMany({
      $or: [
        { projectSlug: { $in: DEMO_PROJECT_SLUGS } },
        { coverImage: /^\/demo\// },
        { slug: 'build-campus-food-app' },
      ],
    });
    deleted.courses = cr.deletedCount || 0;
  }

  console.log(`\n✅ Done — removed ${deleted.projects} projects, ${deleted.users} users` +
    (removeCourses ? `, ${deleted.courses} courses` : ''));
  console.log('  Public explore/showcase will no longer show @demo.makebig.in data.\n');

  await disconnectForCleanup();
}

cleanup().catch((err) => {
  console.error('Cleanup failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
