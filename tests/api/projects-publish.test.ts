import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/projects/[projectId]/publish/route';

const verifyAuthFromRequest = vi.fn();
const dbPublishProject = vi.fn();

const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('@/lib/verifyAuthToken', () => ({
  verifyAuthFromRequest: (...args: unknown[]) => verifyAuthFromRequest(...args),
}));

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock('@/lib/supabase-data', () => ({
  dbPublishProject: (...args: unknown[]) => dbPublishProject(...args),
}));

function makeRequest(token?: string) {
  const headers = new Headers();
  if (token) headers.set('authorization', `Bearer ${token}`);
  return new Request('http://localhost/api/projects/proj-1/publish', {
    method: 'POST',
    headers,
  });
}

describe('POST /api/projects/[projectId]/publish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyAuthFromRequest.mockResolvedValue({ contact: 'owner@example.com', userId: 'u1' });
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'proj-1', owner_contact: 'owner@example.com' },
      error: null,
    });
    dbPublishProject.mockResolvedValue({
      id: 'proj-1',
      name: 'Test Project',
      status: 'published',
      slug: 'test-project',
    });
  });

  it('returns 401 when not authenticated', async () => {
    verifyAuthFromRequest.mockResolvedValue(null);

    const res = await POST(makeRequest(), { params: Promise.resolve({ projectId: 'proj-1' }) });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/Unauthorized/i);
    expect(dbPublishProject).not.toHaveBeenCalled();
  });

  it('returns 404 when project does not exist', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await POST(makeRequest('token'), {
      params: Promise.resolve({ projectId: 'missing' }),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toMatch(/not found/i);
    expect(dbPublishProject).not.toHaveBeenCalled();
  });

  it('returns 403 when user is not the owner', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'proj-1', owner_contact: 'other@example.com' },
      error: null,
    });

    const res = await POST(makeRequest('token'), {
      params: Promise.resolve({ projectId: 'proj-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toMatch(/your own projects/i);
    expect(dbPublishProject).not.toHaveBeenCalled();
  });

  it('publishes successfully for project owner', async () => {
    const res = await POST(makeRequest('token'), {
      params: Promise.resolve({ projectId: 'proj-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({ id: 'proj-1', status: 'published' });
    expect(dbPublishProject).toHaveBeenCalledWith('proj-1');
  });

  it('returns 500 when dbPublishProject throws', async () => {
    dbPublishProject.mockRejectedValue(new Error('Database connection failed'));

    const res = await POST(makeRequest('token'), {
      params: Promise.resolve({ projectId: 'proj-1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Database connection failed');
  });
});
