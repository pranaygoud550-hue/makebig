const PROBLEM_KEYWORDS = ['problem', 'pain', 'challenge', 'issue', 'struggle', 'need'];
const AUDIENCE_KEYWORDS = ['users', 'customers', 'students', 'audience', 'market', 'target'];
const COMPETITION_KEYWORDS = ['competitor', 'alternative', 'existing', 'versus', 'compared'];
const SOLUTION_KEYWORDS = ['solution', 'platform', 'product', 'app', 'service', 'tool'];

function clamp(n) {
  return Math.round(Math.max(0, Math.min(100, n)));
}

function textScore(text, keywords, weight) {
  const lower = text.toLowerCase();
  const hits = keywords.filter((k) => lower.includes(k)).length;
  return Math.min(weight, hits * (weight / Math.max(2, keywords.length / 2)));
}

export function computeTeamScore(input) {
  const joined = (input.teamMembers || []).filter((m) => m.status === 'joined');
  const teamSize = joined.length + (input.ownerContact ? 1 : 0);
  const maxSize = input.maxTeamSize || 10;
  const sizeScore = Math.min(40, (teamSize / Math.max(1, maxSize)) * 40);

  const allSkills = new Set();
  let verifiedCount = 0;
  let totalMembers = 0;

  for (const u of input.teamUsers || []) {
    totalMembers += 1;
    (u.skills || []).forEach((s) => allSkills.add(s.toLowerCase()));
    const verified = (u.verifiedSkills || []).filter((s) => (s.score ?? 0) >= 50);
    if (verified.length) verifiedCount += 1;
    verified.forEach((s) => allSkills.add((s.skillId || '').replace(/_/g, ' ')));
  }

  const diversityScore = Math.min(35, allSkills.size * 5);
  const verifiedRatio = totalMembers ? verifiedCount / totalMembers : 0;
  const verifiedScore = verifiedRatio * 25;

  return clamp(sizeScore + diversityScore + verifiedScore);
}

export function computeMarketScore(input) {
  const text = `${input.name} ${input.desc} ${(input.roles || []).join(' ')}`;
  let score = 20;
  score += textScore(text, PROBLEM_KEYWORDS, 25);
  score += textScore(text, AUDIENCE_KEYWORDS, 25);
  score += textScore(text, COMPETITION_KEYWORDS, 15);
  score += textScore(text, SOLUTION_KEYWORDS, 15);

  const categoryBoost = { tech: 8, health: 6, finance: 6, education: 5, social: 5 };
  score += categoryBoost[input.categoryId] || 3;
  if (text.length > 120) score += 5;
  if (text.length > 300) score += 5;

  return clamp(score);
}

export function computeValidationScore(input) {
  const v = input.validation || {};
  const interviews = Math.min(30, (v.usersInterviewed || 0) * 6);
  const surveys = Math.min(25, (v.surveyResults || 0) * 5);
  const mvp = v.mvpExists ? 25 : input.status === 'in-progress' ? 12 : 0;
  const feedback = Math.min(20, (v.customerFeedback || 0) * 4);
  let score = interviews + surveys + mvp + feedback;
  if (input.status === 'published') score += 5;
  return clamp(score);
}

export function computeProgressScore(input) {
  const tasks = input.tasks || [];
  const done = tasks.filter((t) => t.status === 'done').length;
  const total = tasks.length || 1;
  const taskScore = (done / total) * 40;
  const statusScore = { draft: 5, published: 15, 'in-progress': 25, completed: 35, closed: 20 };
  const milestoneScore = statusScore[input.status] ?? 10;
  const postsScore = Math.min(15, (input.postsCount || 0) * 3);
  const activityScore = Math.min(10, (input.activitiesCount || 0) * 2);
  return clamp(taskScore + milestoneScore + postsScore + activityScore);
}

export function computeStartupReadiness(input) {
  const team = computeTeamScore(input);
  const market = computeMarketScore(input);
  const validation = computeValidationScore(input);
  const progress = computeProgressScore(input);
  const overall = clamp((team + market + validation + progress) / 4);
  return { team, market, validation, progress, overall, computedAt: new Date().toISOString() };
}

const LEADERBOARD_SKILLS = {
  developers: ['frontend_developer', 'backend_developer'],
  designers: ['ui_ux_designer'],
  ai_engineers: ['ai_ml_engineer'],
  marketers: ['marketing_specialist', 'content_writer', 'video_editor'],
};

export async function topVerifiedByCategory(User, limit = 10) {
  const data = {};
  for (const [key, skillIds] of Object.entries(LEADERBOARD_SKILLS)) {
    const users = await User.find({ 'verifiedSkills.skillId': { $in: skillIds } })
      .select('name contact college verifiedSkills')
      .lean();
    const rows = [];
    for (const u of users) {
      for (const vs of u.verifiedSkills || []) {
        if (!skillIds.includes(vs.skillId) || (vs.score ?? 0) < 50) continue;
        rows.push({
          name: u.name,
          contact: u.contact,
          college: u.college || '',
          skillName: vs.skillName,
          score: vs.score,
          badge: vs.badgeLabel || vs.badge,
          badgeIcon: vs.badgeIcon || '🏅',
        });
      }
    }
    rows.sort((a, b) => b.score - a.score);
    data[key] = rows.slice(0, limit);
  }
  return data;
}

export async function computeProjectReadiness(Project, User, Post, Activity, projectId) {
  const project = await Project.findById(projectId).lean();
  if (!project) return null;

  const joined = (project.teamMembers || []).filter((m) => m.status === 'joined');
  const contacts = [project.ownerContact, ...joined.map((m) => m.contact)]
    .filter(Boolean)
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
  return scores;
}
