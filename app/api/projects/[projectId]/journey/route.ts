import { NextResponse } from 'next/server';
import { connectMongoServer } from '@/lib/mongoServer';
import { journeyTimeline, sanitizeJourneyForApi } from '@/lib/ecosystem/journey';
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
    const { journey, configured } = sanitizeJourneyForApi(project.journey as never);
    return NextResponse.json({
      success: true,
      data: {
        configured,
        journey,
        timeline: journeyTimeline((journey?.currentStage || 'idea') as JourneyStageId),
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
    project.journey.configured = true;
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

    const savedJourney = { ...(project.journey as Record<string, unknown>) };
    const lastUpdatedRaw = savedJourney.lastUpdated as Date | string | undefined;
    const journeyForApi = {
      ...savedJourney,
      lastUpdated:
        lastUpdatedRaw instanceof Date
          ? lastUpdatedRaw.toISOString()
          : lastUpdatedRaw,
    };

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
        ...sanitizeJourneyForApi(journeyForApi),
        timeline: journeyTimeline((project.journey.currentStage || 'idea') as JourneyStageId),
      },
    });
  } catch (e) {
    console.error('journey PUT error:', e);
    return NextResponse.json({ success: false, error: 'Could not update journey' }, { status: 500 });
  }
}
