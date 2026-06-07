import { getAuthHeadersAsync } from '@/lib/api';
import { getApiOrigin } from '@/lib/apiBase';
import type { AgentRunRecord, AgentType } from '@/lib/agentTypes';

export async function startAgentRun(
  projectId: string,
  agentType: AgentType,
  goal: string
): Promise<{ runId: string; goal: string; agentType: AgentType }> {
  const headers = await getAuthHeadersAsync();
  const res = await fetch(`${getApiOrigin()}/api/ai/agent`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, agentType, goal }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Could not start agent');
  return data.data;
}

export async function cancelAgentRunApi(runId: string): Promise<void> {
  const headers = await getAuthHeadersAsync();
  const res = await fetch(`${getApiOrigin()}/api/ai/agent/${runId}/cancel`, {
    method: 'POST',
    headers,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Could not cancel agent');
}

export async function fetchAgentRuns(projectId: string): Promise<AgentRunRecord[]> {
  const headers = await getAuthHeadersAsync();
  const res = await fetch(`${getApiOrigin()}/api/projects/${projectId}/agent-runs`, { headers });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Could not load agent history');
  return data.data.runs;
}

export async function undoAgentRunApi(projectId: string, runId: string): Promise<void> {
  const headers = await getAuthHeadersAsync();
  const res = await fetch(
    `${getApiOrigin()}/api/projects/${projectId}/agent-runs/${runId}/undo`,
    { method: 'POST', headers }
  );
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Could not undo agent run');
}

export async function fetchLatestBuild(projectId: string): Promise<{
  html: string;
  css: string;
  js: string;
  title: string;
} | null> {
  const headers = await getAuthHeadersAsync();
  const res = await fetch(`${getApiOrigin()}/api/projects/${projectId}/builds/latest`, { headers });
  const data = await res.json();
  if (!data.success || !data.data?.build) return null;
  return data.data.build;
}
