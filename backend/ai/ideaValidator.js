import Groq from 'groq-sdk';
import { isGroqConfigured, GROQ_MODEL } from './cofounder.js';

const DEMO_REPORT = {
  marketOpportunity: { score: 72, summary: 'Solid niche with growing demand among Indian students and early founders.' },
  competition: {
    competitors: ['Existing project platforms', 'LinkedIn groups', 'Campus incubators'],
    saturation: 'Moderate — differentiation through verification and team-building is viable.',
    level: 'Medium',
  },
  risks: {
    technical: ['Scope creep before MVP', 'Integration complexity'],
    business: ['User acquisition cost', 'Retention without active projects'],
    execution: ['Solo founder burnout', 'Slow team formation'],
  },
  monetization: ['Freemium', 'SaaS subscription', 'Marketplace fees', 'Enterprise licensing'],
  viabilityScore: 68,
  summary: 'Promising idea with clear pain point. Focus on one vertical and validate with 20 user interviews before building advanced features.',
};

export async function validateIdeaWithAI(input) {
  const { ideaName, problemStatement, targetAudience, businessModel, industry } = input;

  if (!isGroqConfigured()) {
    return { ...DEMO_REPORT, demo: true };
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const prompt = `You are a startup advisor. Analyze this idea and respond ONLY with valid JSON (no markdown):

{
  "marketOpportunity": { "score": 0-100, "summary": "2 sentences" },
  "competition": { "competitors": ["..."], "saturation": "1 sentence", "level": "Low|Medium|High" },
  "risks": { "technical": ["..."], "business": ["..."], "execution": ["..."] },
  "monetization": ["Subscription", "Freemium", "..."],
  "viabilityScore": 0-100,
  "summary": "3 sentence verdict"
}

Idea: ${ideaName}
Problem: ${problemStatement}
Audience: ${targetAudience}
Business Model: ${businessModel}
Industry: ${industry}`;

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 1200,
  });

  const text = completion.choices[0]?.message?.content || '';
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    return { ...parsed, demo: false };
  } catch {
    return { ...DEMO_REPORT, summary: text.slice(0, 500), demo: true };
  }
}

export function reportToMarkdown(report, input) {
  return `# Idea Validation Report: ${input.ideaName}

## Market Opportunity — ${report.marketOpportunity?.score ?? 0}/100
${report.marketOpportunity?.summary || ''}

## Competition
- **Level:** ${report.competition?.level || 'N/A'}
- **Saturation:** ${report.competition?.saturation || ''}
- **Competitors:** ${(report.competition?.competitors || []).join(', ')}

## Risks
**Technical:** ${(report.risks?.technical || []).join('; ')}
**Business:** ${(report.risks?.business || []).join('; ')}
**Execution:** ${(report.risks?.execution || []).join('; ')}

## Monetization
${(report.monetization || []).map((m) => `- ${m}`).join('\n')}

## Startup Readiness Estimate — ${report.viabilityScore ?? 0}/100
${report.summary || ''}
`;
}
