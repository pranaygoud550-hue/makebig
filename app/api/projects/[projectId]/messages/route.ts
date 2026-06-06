import { NextResponse } from 'next/server';
import { connectMongoServer } from '@/lib/mongoServer';
import { verifyAuthFromRequest } from '@/lib/verifyAuthToken';
import { isProjectMember } from '@/backend/middleware/security.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toClientMessage(doc: Record<string, unknown>) {
  return {
    id: String(doc._id || doc.id),
    senderId: doc.senderId,
    senderName: doc.senderName,
    content: doc.content,
    type: doc.type || 'text',
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : doc.createdAt,
  };
}

export async function GET(
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
    const Message = (await import('@/backend/models/Message.js')).default;

    const project = await Project.findById(params.projectId).lean();
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }
    if (!isProjectMember(project, auth.contact)) {
      return NextResponse.json(
        { success: false, error: 'You must join this project first' },
        { status: 403 }
      );
    }

    const messages = await Message.find({ projectId: params.projectId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({
      success: true,
      data: { messages: messages.map((m) => toClientMessage(m as Record<string, unknown>)) },
    });
  } catch (e) {
    console.error('messages GET error:', e);
    return NextResponse.json({ success: false, error: 'Could not load messages' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const auth = await verifyAuthFromRequest(req);
    if (!auth?.contact) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const content = String(body.content || '').trim();
    if (!content) {
      return NextResponse.json({ success: false, error: 'Message cannot be empty' }, { status: 400 });
    }

    await connectMongoServer();
    const Project = (await import('@/backend/models/Project.js')).default;
    const Message = (await import('@/backend/models/Message.js')).default;
    const Activity = (await import('@/backend/models/Activity.js')).default;
    const User = (await import('@/backend/models/User.js')).default;

    const project = await Project.findById(params.projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }
    if (!isProjectMember(project, auth.contact)) {
      return NextResponse.json(
        { success: false, error: 'You must join this project first' },
        { status: 403 }
      );
    }

    const profile = await User.findOne({ contact: auth.contact }).lean();
    const senderName = profile?.name || auth.contact;
    const senderId = auth.userId || auth.contact;

    const message = await Message.create({
      projectId: params.projectId,
      senderId,
      senderName,
      content: content.slice(0, 2000),
      type: 'text',
    });

    const preview =
      content.length > 50 ? `${content.slice(0, 50)}…` : content;
    await Activity.create({
      projectId: params.projectId,
      userId: senderId,
      type: 'team_message',
      description: `${senderName}: ${preview}`,
    });

    return NextResponse.json({
      success: true,
      data: { message: toClientMessage(message.toObject() as Record<string, unknown>) },
    });
  } catch (e) {
    console.error('messages POST error:', e);
    return NextResponse.json({ success: false, error: 'Could not send message' }, { status: 500 });
  }
}
