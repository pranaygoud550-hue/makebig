import { NextResponse } from 'next/server';
import { connectMongoServer } from '@/lib/mongoServer';
import { computeHealthScore, buildHeatmap } from '@/lib/ecosystem/health';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    await connectMongoServer();
    const Project = (await import('@/backend/models/Project.js')).default;
    const Post = (await import('@/backend/models/Post.js')).default;
    const Activity = (await import('@/backend/models/Activity.js')).default;

    const project = await Project.findById(params.projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const [postsThisWeek, activitiesThisWeek, recentActivities] = await Promise.all([
      Post.countDocuments({ projectId: project._id, createdAt: { $gte: weekAgo } }),
      Activity.countDocuments({ projectId: project._id, createdAt: { $gte: weekAgo } }),
      Activity.find({ projectId: project._id }).sort({ createdAt: -1 }).limit(500).lean(),
    ]);

    const joinRequestsPending = (project.teamMembers || []).filter(
      (m: { status?: string }) => m.status === 'pending'
    ).length;

    const health = computeHealthScore({
      tasks: project.tasks,
      teamMembers: project.teamMembers,
      postsThisWeek,
      activitiesThisWeek,
      joinRequestsPending,
      lastActivityAt: recentActivities[0]?.createdAt || project.updatedAt,
      journeyCompletion: project.journey?.completionPercent ?? 0,
      heatmap: buildHeatmap(recentActivities),
    });

    await Project.findByIdAndUpdate(params.projectId, {
      $set: {
        health: {
          score: health.score,
          activity: health.activity,
          engagement: health.engagement,
          progress: health.progress,
          taskCompletion: health.taskCompletion,
          metrics: {
            ...health.metrics,
            lastActivityAt: health.metrics.lastActivityAt
              ? new Date(health.metrics.lastActivityAt)
              : undefined,
          },
          heatmap: health.heatmap,
          computedAt: new Date(),
        },
      },
    });

    return NextResponse.json({ success: true, data: health });
  } catch (e) {
    console.error('health GET error:', e);
    return NextResponse.json({ success: false, error: 'Could not compute health' }, { status: 500 });
  }
}
