import { NextResponse } from 'next/server';
import { connectMongoServer } from '@/lib/mongoServer';
import { journeyTimeline } from '@/lib/ecosystem/journey';
import type { JourneyStageId } from '@/lib/ecosystem/constants';
import { verifyAuthFromRequest } from '@/lib/verifyAuthToken';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    await connectMongoServer();
    const Project = (await import('@/backend/models/Project.js')).default;
    const project = await Project.findById(params.projectId).lean();
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }
    const journey = project.journey || {
      currentStage: 'idea',
      completionPercent: 0,
      stageNotes: [],
    };
    const j = journey as { currentStage?: string; completionPercent?: number; lastUpdated?: Date | string; stageNotes?: unknown[]; nextMilestone?: string };
    const lastUpdated =
      j.lastUpdated instanceof Date
        ? j.lastUpdated.toISOString()
        : j.lastUpdated
          ? String(j.lastUpdated)
          : undefined;
    return NextResponse.json({
      success: true,
      data: {
        journey: { ...j, lastUpdated },
        timeline: journeyTimeline((j.currentStage || 'idea') as JourneyStageId),
      },
    });
  } catch (e) {
    console.error('journey GET error:', e);
    return NextResponse.json({ success: false, error: 'Could not load journey' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const auth = await verifyAuthFromRequest(req);
    if (!auth?.contact) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongoServer();
    const Project = (await import('@/backend/models/Project.js')).default;
    const Activity = (await import('@/backend/models/Activity.js')).default;
    const project = await Project.findById(params.projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }
    if (project.ownerContact?.toLowerCase() !== auth.contact.toLowerCase()) {
      return NextResponse.json({ success: false, error: 'Owner only' }, { status: 403 });
    }

    const body = await req.json();
    const prevStage = project.journey?.currentStage || 'idea';
    if (!project.journey) {
      project.journey = {
        currentStage: 'idea',
        completionPercent: 0,
        nextMilestone: 'Complete problem research',
        lastUpdated: new Date(),
        stageNotes: [],
      };
    }

    if (body.currentStage) {
      project.journey.currentStage = String(body.currentStage).slice(0, 32) as JourneyStageId;
    }
    if (typeof body.completionPercent === 'number') {
      project.journey.completionPercent = Math.max(0, Math.min(100, body.completionPercent));
    }
    if (body.nextMilestone) project.journey.nextMilestone = String(body.nextMilestone).slice(0, 200);
    project.journey.lastUpdated = new Date();

    if (body.note) {
      project.journey.stageNotes = project.journey.stageNotes || [];
      project.journey.stageNotes.push({
        stage: project.journey.currentStage,
        note: String(body.note).slice(0, 1000),
        screenshotUrl: body.screenshotUrl || '',
        createdAt: new Date(),
        createdBy: auth.contact,
      });
    }

    await project.save();

    if (body.currentStage && body.currentStage !== prevStage) {
      await Activity.create({
        projectId: project._id,
        userId: auth.contact,
        type: 'journey_stage_changed',
        description: `Reached ${body.currentStage} stage`,
        metadata: { stage: body.currentStage },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        journey: project.journey,
        timeline: journeyTimeline(project.journey.currentStage),
      },
    });
  } catch (e) {
    console.error('journey PUT error:', e);
    return NextResponse.json({ success: false, error: 'Could not update journey' }, { status: 500 });
  }
}
