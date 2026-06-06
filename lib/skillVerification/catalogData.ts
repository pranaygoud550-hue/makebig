import type { PracticalQuestion, SkillDefinition, SkillQuestion } from './types';

function mcq(
  id: string,
  question: string,
  options: string[],
  correctIndex: number,
  difficulty: SkillQuestion['difficulty'] = 'intermediate'
): SkillQuestion {
  return { id, question, options, correctIndex, difficulty };
}

function practical(
  id: string,
  question: string,
  prompt: string,
  options: string[],
  correctIndex: number
): PracticalQuestion {
  return { id, question, prompt, options, correctIndex };
}

export const SKILL_CATALOG: SkillDefinition[] = [
  {
    id: 'frontend_developer',
    name: 'Frontend Developer',
    description: 'HTML, CSS, JavaScript, React, and responsive UI engineering.',
    mcq: [
      mcq('fe-1', 'What does the Virtual DOM primarily help React optimize?', ['Network requests', 'DOM update batching and diffing', 'Database queries', 'Image compression'], 1, 'beginner'),
      mcq('fe-2', 'Which hook runs after every render including the first?', ['useMemo', 'useEffect', 'useRef', 'useId'], 1, 'beginner'),
      mcq('fe-3', 'Best practice for list rendering in React?', ['Use array index as key always', 'Use stable unique keys', 'Never use keys', 'Use Math.random() as key'], 1, 'intermediate'),
      mcq('fe-4', 'CSS Flexbox property aligns items along the cross axis?', ['justify-content', 'align-items', 'flex-direction', 'order'], 1, 'beginner'),
      mcq('fe-5', 'What is hydration in Next.js?', ['Deleting cache', 'Attaching client JS to server HTML', 'Compressing assets', 'Prefetching fonts'], 1, 'advanced'),
      mcq('fe-6', 'Which reduces unnecessary re-renders?', ['Inline object props every render', 'React.memo + stable callbacks', 'More useState calls', 'Removing keys'], 1, 'intermediate'),
      mcq('fe-7', 'Accessible button must include?', ['role="div"', 'Discernible name or aria-label', 'tabindex="-1" always', 'onclick on span only'], 1, 'intermediate'),
      mcq('fe-8', 'Core Web Vitals include LCP which measures?', ['Largest Contentful Paint', 'Longest CSS Parse', 'Lazy Component Paint', 'Local Cache Policy'], 0, 'advanced'),
      mcq('fe-9', 'useCallback memoizes?', ['Component trees', 'Function references', 'DOM nodes', 'API responses'], 1, 'intermediate'),
      mcq('fe-10', 'Mobile-first CSS means?', ['Design desktop first', 'Start with small screens then scale up', 'Disable media queries', 'Use only pixels'], 1, 'beginner'),
    ],
    practical: [
      practical('fe-p1', 'Responsive navbar', 'Navbar overlaps on mobile. Best fix?', ['Hide nav on mobile', 'Use flex-wrap, hamburger menu, and breakpoint styles', 'Remove CSS', 'Use tables for layout'], 1),
      practical('fe-p2', 'Buggy React component', 'Component re-renders infinitely after setState in useEffect without deps. Fix?', ['Remove useEffect', 'Add correct dependency array or move logic', 'Use var', 'Disable strict mode'], 1),
      practical('fe-p3', 'API integration', 'Fetch user data on mount with loading/error states. Best pattern?', ['Fetch in render body', 'useEffect + abort controller + typed fetch', 'window.onload only', 'Sync XMLHttpRequest'], 1),
    ],
  },
  {
    id: 'backend_developer',
    name: 'Backend Developer',
    description: 'REST APIs, authentication, databases, and server-side architecture.',
    mcq: [
      mcq('be-1', 'REST GET should be?', ['Idempotent and safe', 'Always create resources', 'Used for passwords', 'Non-cacheable always'], 0, 'beginner'),
      mcq('be-2', 'JWT access tokens should be stored where in SPAs?', ['localStorage only always', 'HttpOnly cookies or secure memory patterns', 'URL query params', 'HTML comments'], 1, 'intermediate'),
      mcq('be-3', 'HTTP 401 means?', ['Validation error', 'Unauthorized', 'Server crash', 'Redirect'], 1, 'beginner'),
      mcq('be-4', 'Database index primarily speeds up?', ['Inserts only', 'Read/query lookups', 'File uploads', 'Email sending'], 1, 'intermediate'),
      mcq('be-5', 'Idempotency keys help with?', ['CSS', 'Prevent duplicate charges/operations on retry', 'Image CDN', 'UI theming'], 1, 'advanced'),
      mcq('be-6', 'SQL injection prevented by?', ['String concat in queries', 'Parameterized queries/ORM', 'More comments', 'Bigger servers'], 1, 'beginner'),
      mcq('be-7', 'Rate limiting protects against?', ['Better UX', 'Abuse and brute force', 'Schema migrations', 'Logging'], 1, 'intermediate'),
      mcq('be-8', 'Microservice vs monolith tradeoff?', ['Microservices always simpler locally', 'Monolith simpler early; services help scale teams/domains', 'No difference', 'Monolith cannot scale'], 1, 'advanced'),
      mcq('be-9', 'MongoDB ObjectId best used as?', ['Public slug', 'Internal document identifier', 'Password hash', 'JWT secret'], 1, 'intermediate'),
      mcq('be-10', 'CORS controls?', ['Database joins', 'Cross-origin browser requests', 'CPU usage', 'SMTP'], 1, 'intermediate'),
    ],
    practical: [
      practical('be-p1', 'REST endpoint', 'Create POST /api/projects with auth. Required checks?', ['No validation', 'Auth middleware, input validation, owner rules', 'Public open POST', 'Only logging'], 1),
      practical('be-p2', 'Auth issue', 'Users access others data via IDOR on /users/:id. Fix?', ['Hide UI button', 'Authorize resource ownership on every route', 'Change color scheme', 'Add favicon'], 1),
      practical('be-p3', 'Slow query', 'Project list query scans full collection. First optimization?', ['Add index on filter/sort fields', 'Buy RAM only', 'Remove pagination', 'Disable API'], 0),
    ],
  },
  {
    id: 'ui_ux_designer',
    name: 'UI/UX Designer',
    description: 'User research, wireframes, visual design, and usability.',
    mcq: [
      mcq('ux-1', 'Primary goal of UX design?', ['More gradients', 'Solve user problems with usable flows', 'More animations', 'Larger logos'], 1, 'beginner'),
      mcq('ux-2', 'Wireframes focus on?', ['Final brand colors', 'Structure and layout without visual polish', 'Production code', 'Server config'], 1, 'beginner'),
      mcq('ux-3', 'Contrast ratio supports?', ['SEO only', 'Accessibility and readability', 'Database speed', 'API latency'], 1, 'intermediate'),
      mcq('ux-4', 'Usability test best with?', ['Only designers watching', 'Real representative users on tasks', 'CEO opinion only', 'No prototype'], 1, 'intermediate'),
      mcq('ux-5', 'Fitts Law relates to?', ['Typography', 'Target size and distance affect selection time', 'Color theory', 'SQL joins'], 1, 'advanced'),
      mcq('ux-6', 'Design system provides?', ['Random styles per page', 'Reusable components and tokens', 'More meetings', 'Longer load times'], 1, 'intermediate'),
      mcq('ux-7', 'Empty state should?', ['Show blank screen', 'Guide next action with helpful copy/CTA', 'Crash app', 'Hide navigation'], 1, 'beginner'),
      mcq('ux-8', 'Information hierarchy uses?', ['Same font size everywhere', 'Size, weight, spacing to prioritize content', 'Only red text', 'Invisible labels'], 1, 'intermediate'),
      mcq('ux-9', 'A/B testing compares?', ['Two design variants with measured outcomes', 'Designers salaries', 'Two databases', 'Two servers'], 0, 'advanced'),
      mcq('ux-10', 'Mobile touch targets should be at least?', ['4px', '~44px', '200px', '1px'], 1, 'beginner'),
    ],
    practical: [
      practical('ux-p1', 'Onboarding drop-off', 'Users abandon signup at step 3. First step?', ['Add more fields', 'Review analytics, simplify step, test prototype', 'Remove onboarding', 'Change logo'], 1),
      practical('ux-p2', 'Dashboard clutter', 'Users cannot find Create Project. Fix?', ['Hide other features', 'Clear primary CTA, nav hierarchy, card grouping', 'Add popups everywhere', 'Reduce contrast'], 1),
      practical('ux-p3', 'Accessibility audit', 'Form errors not announced to screen readers. Fix?', ['Remove forms', 'Associate error text with inputs + aria-live', 'Use images only', 'Disable keyboard'], 1),
    ],
  },
  {
    id: 'ai_ml_engineer',
    name: 'AI/ML Engineer',
    description: 'Machine learning models, data pipelines, and evaluation.',
    mcq: [
      mcq('ml-1', 'Supervised learning uses?', ['Unlabeled data only', 'Labeled input-output pairs', 'No training', 'Only rules'], 1, 'beginner'),
      mcq('ml-2', 'Overfitting means?', ['Model fails on train and test', 'Model memorizes train data, poor generalization', 'Perfect generalization', 'No parameters'], 1, 'beginner'),
      mcq('ml-3', 'Train/validation/test split purpose?', ['Slow training', 'Estimate generalization and tune without leaking test', 'Increase dataset size', 'Remove outliers automatically'], 1, 'intermediate'),
      mcq('ml-4', 'Precision measures?', ['True positives among predicted positives', 'All accuracy', 'Memory usage', 'GPU count'], 0, 'intermediate'),
      mcq('ml-5', 'Gradient descent updates?', ['UI colors', 'Model weights to reduce loss', 'DNS records', 'CSS margins'], 1, 'beginner'),
      mcq('ml-6', 'Feature scaling helps when?', ['Features on different scales affect distance-based models', 'Using HTML', 'Using JWT', 'Using sockets'], 0, 'intermediate'),
      mcq('ml-7', 'Cross-validation reduces?', ['Data size', 'Variance in performance estimates', 'Need for labels', 'Model size to zero'], 1, 'advanced'),
      mcq('ml-8', 'LLM prompt engineering focuses on?', ['SQL indexes', 'Clear instructions, examples, constraints', 'CDN caching', 'Button colors'], 1, 'intermediate'),
      mcq('ml-9', 'Confusion matrix shows?', ['Website traffic', 'TP/FP/TN/FN counts', 'Server logs', 'CSS breakpoints'], 1, 'intermediate'),
      mcq('ml-10', 'Regularization like L2 helps?', ['Increase overfitting', 'Penalize large weights', 'Remove labels', 'Disable validation'], 1, 'advanced'),
    ],
    practical: [
      practical('ml-p1', 'Classification model', 'Imbalanced classes (95/5). Best first step?', ['Ignore minority class', 'Stratified split, class weights or resampling', 'Remove labels', 'Use accuracy only'], 1),
      practical('ml-p2', 'Clean dataset', 'Missing values and duplicates found. Approach?', ['Drop entire dataset', 'Impute/remove thoughtfully, document pipeline', 'Train on raw CSV blindly', 'Hide columns'], 1),
      practical('ml-p3', 'Evaluate model', 'High train accuracy, low test accuracy. Diagnosis?', ['Underfitting', 'Overfitting — regularize, more data, simpler model', 'Perfect model', 'Need more epochs only always'], 1),
    ],
  },
  {
    id: 'marketing_specialist',
    name: 'Marketing Specialist',
    description: 'Growth, campaigns, analytics, and brand positioning.',
    mcq: [
      mcq('mk-1', 'CTA stands for?', ['Central Tech API', 'Call To Action', 'Click Through App', 'Content Type Array'], 1, 'beginner'),
      mcq('mk-2', 'SEO primarily improves?', ['Server uptime', 'Organic search visibility', 'Database indexes', 'Socket latency'], 1, 'beginner'),
      mcq('mk-3', 'Conversion rate equals?', ['Conversions / visitors', 'Visitors / conversions', 'Clicks / impressions only', 'Revenue / employees'], 0, 'intermediate'),
      mcq('mk-4', 'AIDA funnel stages include?', ['Attention, Interest, Desire, Action', 'API, Index, Data, Auth', 'Analyze, Ignore, Delete, Archive', 'Add, Import, Deploy, Abort'], 0, 'intermediate'),
      mcq('mk-5', 'UTM parameters track?', ['CSS themes', 'Campaign source/medium in analytics', 'JWT expiry', 'Mongo shards'], 1, 'intermediate'),
      mcq('mk-6', 'Brand positioning defines?', ['Logo file size', 'How you differ in customer minds', 'Server region', 'SQL schema'], 1, 'beginner'),
      mcq('mk-7', 'Email open rate influenced by?', ['Subject line, sender reputation, timing', 'Database ORM', 'React keys', 'CORS headers'], 0, 'intermediate'),
      mcq('mk-8', 'CAC means?', ['Customer Acquisition Cost', 'CSS Animation Class', 'Cached Auth Cookie', 'Content API Controller'], 0, 'advanced'),
      mcq('mk-9', 'Retargeting shows ads to?', ['Random users only', 'Users who previously interacted', 'Bots only', 'Employees only'], 1, 'intermediate'),
      mcq('mk-10', 'Product-market fit signals include?', ['High retention and organic growth', 'Zero users', 'No feedback', 'Only paid ads with no retention'], 0, 'advanced'),
    ],
    practical: [
      practical('mk-p1', 'Launch campaign', 'New college startup app launch. First channel mix?', ['Spam all channels', 'Define ICP, test 2-3 channels, measure CAC/activation', 'Billboards only', 'No analytics'], 1),
      practical('mk-p2', 'Low signups', 'Landing page traffic ok but signup low. Fix?', ['Increase traffic only', 'Improve headline, social proof, friction audit on form', 'Remove CTA', 'Hide pricing'], 1),
      practical('mk-p3', 'Content calendar', 'Consistent LinkedIn growth goal. Plan?', ['Post randomly', 'Weekly themes, hooks, CTAs, review metrics', 'Copy competitors verbatim', 'Never post'], 1),
    ],
  },
  {
    id: 'content_writer',
    name: 'Content Writer',
    description: 'Copywriting, storytelling, and audience-focused writing.',
    mcq: [
      mcq('cw-1', 'Active voice typically?', ['Hides subject', 'Subject performs the action clearly', 'Uses only passive', 'Removes verbs'], 1, 'beginner'),
      mcq('cw-2', 'Headline purpose?', ['Fill space', 'Grab attention and promise value', 'Hide topic', 'Increase page weight'], 1, 'beginner'),
      mcq('cw-3', 'Tone of voice reflects?', ['Server logs', 'Brand personality in writing', 'Database schema', 'CSS grid'], 1, 'intermediate'),
      mcq('cw-4', 'SEO content should?', ['Keyword stuff unnaturally', 'Match search intent with helpful structure', 'Ignore headings', 'Duplicate pages'], 1, 'intermediate'),
      mcq('cw-5', 'Editing pass focuses on?', ['Adding length only', 'Clarity, flow, grammar, cut fluff', 'More jargon', 'Removing headings'], 1, 'beginner'),
      mcq('cw-6', 'Storytelling arc often includes?', ['Setup, conflict, resolution', 'Only bullet lists', 'Random facts', 'Code blocks'], 0, 'intermediate'),
      mcq('cw-7', 'CTA in blog post should be?', ['Hidden', 'Specific next step aligned with content', 'Unrelated product', 'Lorem ipsum'], 1, 'beginner'),
      mcq('cw-8', 'Readability improves with?', ['Long dense paragraphs', 'Short sentences, subheads, scannable structure', 'All caps', 'No punctuation'], 1, 'intermediate'),
      mcq('cw-9', 'Plagiarism means?', ['Citing sources', 'Using others work without credit', 'Paraphrasing with credit', 'Original research'], 1, 'beginner'),
      mcq('cw-10', 'Brief before writing includes?', ['Nothing', 'Audience, goal, key message, constraints', 'Only word count', 'Random topic'], 1, 'intermediate'),
    ],
    practical: [
      practical('cw-p1', 'Product description', 'SaaS tool for student teams. Best angle?', ['Feature dump only', 'Outcome-led copy with pain → solution → proof', 'Lorem ipsum', 'Internal jargon'], 1),
      practical('cw-p2', 'Rewrite email', 'Low open rate on newsletter. Improve?', ['Longer subject', 'Clear benefit-driven subject + preview text test', 'ALL CAPS SUBJECT!!!', 'Remove unsubscribe'], 1),
      practical('cw-p3', 'Case study structure', 'Show client success credibly. Structure?', ['Anonymous vague claims', 'Challenge, approach, metrics, quote', 'Only logo', 'Single sentence'], 1),
    ],
  },
  {
    id: 'video_editor',
    name: 'Video Editor',
    description: 'Editing workflows, pacing, audio, and visual storytelling.',
    mcq: [
      mcq('ve-1', 'B-roll is?', ['Main interview only', 'Supplemental footage supporting story', 'Audio track', 'Export preset'], 1, 'beginner'),
      mcq('ve-2', 'Jump cut creates?', ['Smooth invisible transition', 'Noticeable time skip in same shot', 'Color grade', 'Legal release'], 1, 'beginner'),
      mcq('ve-3', 'Frame rate 24fps common for?', ['Cinematic feel', 'Screen recordings only', 'Spreadsheets', 'API docs'], 0, 'intermediate'),
      mcq('ve-4', 'L-cut means?', ['Video cuts before audio', 'Audio from next clip starts under current video', 'Black frames only', 'Mute all audio'], 1, 'advanced'),
      mcq('ve-5', 'Color grading adjusts?', ['Mood and visual consistency', 'DNS settings', 'Database queries', 'HTML tags'], 0, 'intermediate'),
      mcq('ve-6', 'Audio levels should avoid?', ['Clipping/distortion', 'Headroom', 'Normalization', 'Room tone'], 0, 'beginner'),
      mcq('ve-7', 'Rule of thirds helps?', ['Compose balanced frames', 'Export faster', 'Fix shaky audio', 'Write scripts'], 0, 'intermediate'),
      mcq('ve-8', 'Codec H.264 widely used for?', ['Word documents', 'Web/social delivery balance', 'Raw camera files only', 'SQL backups'], 1, 'intermediate'),
      mcq('ve-9', 'Pacing in montage should?', ['Match music/story rhythm', 'Be random', 'Never cut', 'Use 10min takes only'], 0, 'intermediate'),
      mcq('ve-10', 'Subtitle best practices include?', ['Unreadable tiny text', 'Readable size, contrast, sync with speech', 'Cover entire frame', 'No punctuation'], 1, 'beginner'),
    ],
    practical: [
      practical('ve-p1', 'Social reel edit', '60s product reel from 20min footage. Approach?', ['Upload raw 20min', 'Select hooks, tight pacing, captions, clear CTA end card', 'No audio', 'Single static frame'], 1),
      practical('ve-p2', 'Bad audio interview', 'Hums and uneven levels. Fix in post?', ['Ignore audio', 'Noise reduction, EQ, compression, normalize', 'Delete video', 'Add louder music only'], 1),
      practical('ve-p3', 'Brand consistency', 'Multiple clips different colors. Workflow?', ['Export as-is', 'Apply LUT/color match + title template pack', 'Random filters each clip', 'Convert to GIF only'], 1),
    ],
  },
];
