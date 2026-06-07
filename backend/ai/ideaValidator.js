import Groq from 'groq-sdk';
import { isGroqConfigured, GROQ_MODEL } from './cofounder.js';

const DEMO_QUESTIONS = [
  'Who exactly feels this problem most acutely, and how often?',
  'What would users do today if your product did not exist?',
  'How will you reach your first 100 users in India?',
  'What is the smallest version you can ship in 2 weeks?',
  'Why are you the right team to build this now?',
];

export async function generateClarifyingQuestions(ideaDescription) {
  if (!isGroqConfigured()) {
    return DEMO_QUESTIONS;
  }
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      {
        role: 'user',
        content: `A student founder described this startup idea: "${ideaDescription.slice(0, 1500)}"

Return ONLY a JSON array of exactly 5 short clarifying questions (strings) to validate the idea. No markdown.`,
      },
    ],
    temperature: 0.5,
    max_tokens: 500,
  });
  const text = completion.choices[0]?.message?.content || '';
  try {
    const match = text.match(/\[[\s\S]*\]/);
    const arr = JSON.parse(match ? match[0] : text);
    if (Array.isArray(arr) && arr.length >= 3) return arr.slice(0, 5).map(String);
  } catch {
    /* fallback */
  }
  return DEMO_QUESTIONS;
}

export async function generateFullValidationReport(ideaDescription, answers) {
  const qaBlock = answers
    .map((a, i) => `Q${i + 1}: ${a.question}\nA: ${a.answer}`)
    .join('\n\n');

  const demo = {
    problemClarity: 7,
    marketSize: '₹500–800 Cr addressable in India student/edtech segment (estimate)',
    similarSolutions: ['Existing campus incubators', 'LinkedIn groups', 'No-code hackathon tools'],
    advantages: ['Verified skills matching', 'Built-in team workspace', 'Student-first pricing'],
    risks: ['Slow initial user growth', 'Teams disband after college', 'Competition from generic tools'],
    nextSteps: ['Interview 15 target users', 'Ship a 2-week MVP', 'Get 1 team to complete a sprint'],
    verdict: 'Worth building as an MVP if you validate demand with real student teams in the next 30 days.',
    worthBuilding: true,
    demo: true,
  };

  if (!isGroqConfigured()) return demo;

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      {
        role: 'user',
        content: `You are a blunt but supportive startup mentor. Analyze this idea and Q&A.

Idea: ${ideaDescription}
${qaBlock}

Respond ONLY with valid JSON:
{
  "problemClarity": 0-10,
  "marketSize": "1-2 sentence estimate",
  "similarSolutions": ["...", "...", "..."],
  "advantages": ["...", "...", "..."],
  "risks": ["...", "...", "..."],
  "nextSteps": ["...", "...", "..."],
  "verdict": "2-3 sentence honest verdict answering Is this worth building?",
  "worthBuilding": true|false
}`,
      },
    ],
    temperature: 0.4,
    max_tokens: 1200,
  });
  const text = completion.choices[0]?.message?.content || '';
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return { ...demo, ...JSON.parse(match ? match[0] : text), demo: false };
  } catch {
    return { ...demo, verdict: text.slice(0, 400), demo: true };
  }
}

export async function generatePitchDeckOutline(project, teamMembers = []) {
  const teamList = teamMembers
    .map((m) => `${m.name || m.contact} (${m.role || 'member'})`)
    .join(', ');
  const tasksDone = (project.tasks || []).filter((t) => t.status === 'done').length;
  const tasksTotal = (project.tasks || []).length;
  const traction = `${tasksDone}/${tasksTotal} tasks done · ${(project.teamMembers || []).filter((m) => m.status === 'joined').length} team members on Make Big`;

  const demoSlides = buildDeckSlides(project, teamList, traction);

  if (!isGroqConfigured()) return demoSlides;

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      {
        role: 'user',
        content: `Generate a 10-slide investor pitch deck outline as JSON array:
[{ "title": "Problem", "bullets": ["..."] }, ...]
Slides: Problem, Solution, Market size, Product demo, Business model, Traction, Team, Competition, Financials, Ask.
Use this project data:
Name: ${project.name}
Description: ${project.desc || project.description || ''}
Category: ${project.categoryId}
Traction: ${traction}
Team: ${teamList}
Return ONLY JSON array.`,
      },
    ],
    temperature: 0.4,
    max_tokens: 2000,
  });
  const text = completion.choices[0]?.message?.content || '';
  try {
    const match = text.match(/\[[\s\S]*\]/);
    const slides = JSON.parse(match ? match[0] : text);
    if (Array.isArray(slides) && slides.length >= 5) return slides;
  } catch {
    /* fallback */
  }
  return demoSlides;
}

function buildDeckSlides(project, teamList, traction) {
  return [
    { title: 'Problem', bullets: [`Students struggle to ${project.desc?.slice(0, 80) || 'find teammates and ship real products'}`] },
    { title: 'Solution', bullets: [project.name, project.desc || 'A collaborative workspace for student founders'] },
    { title: 'Market size', bullets: ['India: 40M+ higher-ed students', 'Growing student startup ecosystem'] },
    { title: 'Product demo', bullets: ['Screenshots from Make Big workspace', 'Live project dashboard & team chat'] },
    { title: 'Business model', bullets: ['Freemium teams', 'Pro workspace subscription', 'Future marketplace fees'] },
    { title: 'Traction', bullets: [traction, `Category: ${project.categoryId}`, project.city ? `Based in ${project.city}` : 'Remote-first'] },
    { title: 'Team', bullets: teamList ? teamList.split(', ').slice(0, 5) : ['Founding team on Make Big'] },
    { title: 'Competition', bullets: ['Generic project tools', 'Social networks', 'Campus-only groups'] },
    { title: 'Financials', bullets: ['Pre-revenue / early stage', '12-month runway target', 'Unit economics TBD'] },
    { title: 'Ask', bullets: ['Seeking mentors & early believers', '₹10–25L pre-seed to scale to 50 teams', 'Intros to college incubators'] },
  ];
}

export function pitchDeckToText(slides) {
  return slides
    .map((s, i) => `Slide ${i + 1}: ${s.title}\n${(s.bullets || []).map((b) => `• ${b}`).join('\n')}`)
    .join('\n\n');
}

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
