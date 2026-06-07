import { describe, it, expect } from 'vitest';
import { validateLinkUrl, parseGitHubUrl } from '../backend/ai/linkReader.js';

describe('validateLinkUrl', () => {
  it('accepts valid https URLs', () => {
    const result = validateLinkUrl('https://example.com/page');
    expect(result.ok).toBe(true);
    expect(result.url).toBe('https://example.com/page');
  });

  it('rejects localhost', () => {
    const result = validateLinkUrl('http://localhost:3000');
    expect(result.ok).toBe(false);
  });

  it('rejects file URLs', () => {
    const result = validateLinkUrl('file:///etc/passwd');
    expect(result.ok).toBe(false);
  });

  it('rejects private IPs', () => {
    expect(validateLinkUrl('http://192.168.1.1').ok).toBe(false);
    expect(validateLinkUrl('http://10.0.0.5').ok).toBe(false);
  });

  it('rejects URLs over 500 chars', () => {
    const result = validateLinkUrl(`https://example.com/${'a'.repeat(500)}`);
    expect(result.ok).toBe(false);
  });
});

describe('parseGitHubUrl', () => {
  it('parses github repo URLs', () => {
    const gh = parseGitHubUrl('https://github.com/facebook/react');
    expect(gh).toEqual({ owner: 'facebook', repo: 'react', readmePath: null });
  });

  it('parses README.md paths', () => {
    const gh = parseGitHubUrl('https://github.com/vercel/next.js/blob/canary/README.md');
    expect(gh?.owner).toBe('vercel');
    expect(gh?.repo).toBe('next.js');
  });
});
