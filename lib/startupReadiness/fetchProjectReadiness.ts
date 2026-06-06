import { connectMongoServer } from '@/lib/mongoServer';
import { computeStartupReadiness } from './compute';
import type { StartupReadinessScores } from './types';

export async function fetchAndComputeProjectReadiness(
  projectId: string
): Promise<{ scores: StartupReadinessScores; projectId: string } | null> {
  await connectMongoServer();
  const Project = (await import('@/backend/models/Project.js')).default;
  const User = (await import('@/backend/models/User.js')).default;
  const Post = (await import('@/backend/models/Post.js')).default;
  const Activity = (await import('@/backend/models/Activity.js')).default;

  const project = await Project.findById(projectId).lean();
  if (!project) return null;

  const joined = (project.teamMembers || []).filter(
    (m: { status?: string }) => m.status === 'joined'
  );
  const contacts = [
    project.ownerContact,
    ...joined.map((m: { contact?: string }) => m.contact),
  ]
    .filter((c): c is string => Boolean(c))
    .map((c) => c.toLowerCase());

  const users = await User.find({ contact: { $in: contacts } }).lean();
  const postsCount = await Post.countDocuments({ projectId: project._id.toString() });
  const activitiesCount = await Activity.countDocuments({ projectId: project._id });

  const scores = computeStartupReadiness({
    name: project.name,
    desc: project.desc || '',
    categoryId: project.categoryId,
    status: project.status,
    roles: project.roles || [],
    maxTeamSize: project.maxTeamSize,
    tasks: project.tasks || [],
    teamMembers: project.teamMembers || [],
    ownerContact: project.ownerContact,
    validation: project.validation || {},
    postsCount,
    activitiesCount,
    teamUsers: users.map((u) => ({
      verifiedSkills: u.verifiedSkills || [],
      skills: u.skills || [],
    })),
  });

  await Project.findByIdAndUpdate(projectId, { startupReadiness: scores });

  return { projectId, scores };
}
