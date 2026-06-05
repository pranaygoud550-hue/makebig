import { getApiBase } from './apiBase';
import { isMongoBackendMode } from './backendMode';

/** AI co-founder status (GET). */
export function getAICofounderStatusUrl(): string {
  return isMongoBackendMode()
    ? `${getApiBase()}/ai/cofounder/status`
    : '/api/ai/cofounder/status';
}

/** AI co-founder streaming chat (POST, SSE). */
export function getAICofounderStreamUrl(): string {
  return isMongoBackendMode()
    ? `${getApiBase()}/ai/cofounder/stream`
    : '/api/ai/cofounder/stream';
}
