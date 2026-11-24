// Default question bank and settings. Used to seed the Questions and Settings tabs the first time.
// The admin can edit everything from /admin. Answer data (correct, points, best) is stripped before
// questions are sent to candidates.

export const DEFAULT_PILLARS = [
  { id: 'p1', name: 'Priorities & logic', weight: 1 },
  { id: 'p2', name: 'Accuracy & detail', weight: 1 },
  { id: 'p3', name: 'Judgement', weight: 1 },
  { id: 'p4', name: 'Adaptability & feedback', weight: 1 },
  { id: 'p5', name: 'AI-native', weight: 1 },
  { id: 'p6', name: 'Ownership & mission', weight: 1 },
  { id: 'p7', name: 'Sales & marketing', weight: 1 },
];
export const DEFAULT_BANDS = { strong: 80, promising: 65, mixed: 50 };

export const DEFAULT_ROLE = {
  id: 'ea-ops',
  slug: 'ea-ops-sales-marketing',
  name: 'Executive Assistant, Operations, Sales & Marketing',
  status: 'open',
  closesAt: '',
  bookingLink: 'https://calendly.com/roseline-onehive/15min',
  inviteMessage: 'Hi {first},\n\nThank you for completing the OneHive Hive Challenge for the {role} role. We enjoyed seeing how you work and would like to invite you to an interview.\n\nPlease pick a time that suits you here: {link}\n\nBest,',
  description: 'Remote role based in Kenya supporting the CEO of OneHive, a UK tech-for-good company. Covers executive assistance, operations, sales support (outreach, pipeline, proposals) and marketing (content, social, video).',
  intro: {
    title: 'Welcome to the hive.',
    text: 'OneHive builds AI-powered tools that help charities, social enterprises and young people thrive. This challenge shows us how you think, prioritise and work. There are no trick questions, just real situations from a normal week here.',
  },
  pillars: DEFAULT_PILLARS,
  bands: DEFAULT_BANDS,
};

export function blankRole(name) {
  const slug = String(name || 'new-role').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'new-role';
  return { ...JSON.parse(JSON.stringify(DEFAULT_ROLE)), id: 'r' + Date.now().toString(36), slug, name: name || 'New role', status: 'draft', description: '' };
}

const F = (c, cells, col) => { const f = {}; cells.forEach((p) => { f[p] = col; }); return { c, f }; };
const P = (c, f) => ({ c, f });
const A = '#FCB040', T = '#2BA7A0', CL = '#D77F5A', B = '#25201D', Wt = '#FFFFFF';

export const QUESTION_TYPES = {
  rank: 'Rank in order',
  flag: 'Tap to flag',
  binary: 'Two-way sort',
  steps: 'Multiple choice (one or more steps)',
  matrix: 'Matrix match',
  pattern: 'Pattern puzzles',
  written: 'Written answer',
};

export const DEFAULT_QUESTIONS = [
  {
    id: 'c1', type: 'rank', strictTop: 2, enabled: true, tag: 'Priorities', pillar: 'p1', weight: 0.6, limit: 120,
    title: 'The morning hive',
    lead: 'It is 8:30am in Nairobi and the CEO in London is not online yet. Tap these in the order you would do them today. First tap is your first job.',
    items: [
      { id: 'a', t: 'Proposal deck and contract for a charity', s: 'CEO wants it to review by early afternoon London time, he sends it today' },
      { id: 'b', t: 'Follow-up emails to four people met at yesterday’s event', s: 'Warm leads, no deadline set' },
      { id: 'c', t: 'Campaign website: top section jumps on mobile', s: 'Flagged by the CEO in Slack last night' },
      { id: 'd', t: 'Compare three hotels for next week’s Newcastle trip', s: 'Prices are rising' },
      { id: 'f', t: 'Search the CRM for new grant opportunities', s: 'Nobody has asked for this' },
      { id: 'e', t: 'Tidy last week’s Jira tickets', s: 'Housekeeping' },
    ],
  },
  {
    id: 'c2', type: 'flag', display: 'chips', enabled: true, tag: 'Accuracy', pillar: 'p2', weight: 0.6, limit: 75,
    title: 'Spot what we cannot back up',
    lead: 'You are checking a proposal slide before it goes to the CEO. Tap every figure on the slide that the call notes do not support.',
    notes: { title: 'Call notes', lines: ['Set-up is £4,000', '£2,000 of that is match funded', '£500 a month after that', '155 hours of admin a month across 9 staff', 'Use £25 an hour for staff time', 'We expect to recover 75% of admin time'] },
    slideTitle: 'Your Hive: investment and return',
    items: [
      { id: 'setup', t: '£4,000 set-up', correct: false },
      { id: 'match', t: '£2,000 match funded', correct: false },
      { id: 'monthly', t: '£450 per month', correct: true },
      { id: 'hours', t: '155 hours of admin a month', correct: false },
      { id: 'trusted', t: 'Trusted by 500+ charities', correct: true },
      { id: 'rate', t: 'Staff time at £25 an hour', correct: false },
      { id: 'recover', t: '90% of admin time recovered', correct: true },
      { id: 'golive', t: 'Live in 2 weeks', correct: true },
    ],
  },
  {
    id: 'c3', type: 'binary', style: 'list', enabled: true, tag: 'Judgement', pillar: 'p3', weight: 1, limit: 90,
    title: 'Send it, or hold it?',
    lead: 'Seven things are sitting in your drafts. Which can you send yourself right now, and which need the CEO’s approval first?',
    labels: [{ id: 'send', t: 'Send now' }, { id: 'hold', t: 'Hold for approval' }],
    items: [
      { id: 's1', t: 'Slack to the CTO', s: '“Can you share the latest app build so I can test notifications?”', correct: 'send' },
      { id: 's2', t: 'Email to a funder', s: 'Confirming a £675 a month price you worked out yourself from the call', correct: 'hold' },
      { id: 's3', t: 'Email to a partner', s: 'Confirming the meeting slot the CEO already agreed with them in Slack', correct: 'send' },
      { id: 's4', t: 'LinkedIn post', s: 'A post in the CEO’s name about yesterday’s event, tagging everyone there', correct: 'hold' },
      { id: 's5', t: 'Contract to a client', s: 'You added a six-month minimum term to protect the company', correct: 'hold' },
      { id: 's6', t: 'Email to a candidate', s: 'A reminder that their challenge closes on Friday at 5pm', correct: 'send' },
      { id: 's7', t: 'Email to a client', s: 'Telling them a new feature launches next month. It has not been tested yet', correct: 'hold' },
    ],
  },
  {
    id: 'c4', type: 'steps', enabled: true, tag: 'Adaptability', pillar: 'p4', weight: 0.5, limit: 150,
    title: 'The pivot',
    lead: 'You have spent three days building pitch decks and contracts for a VA placement service. On today’s call, the CEO and CFO change the model: OneHive will now only introduce the VA for a one-off fee, and the client contracts the VA directly.',
    steps: [
      { q: 'What is your first move?', options: [
        { id: 'a', t: 'Ask which documents need to change, and list them back to confirm the scope', points: 5 },
        { id: 'b', t: 'Start rewriting every deck tonight so it is done by morning', points: 3 },
        { id: 'c', t: 'Point out the three days of work and suggest keeping the old model for current clients', points: 1 },
        { id: 'd', t: 'Wait for a written brief before touching anything', points: 2 }] },
      { q: 'One client is halfway through a conversation on the old model. What do you do?', options: [
        { id: 'a', t: 'Flag it to the CEO and ask how he wants that client handled', points: 5 },
        { id: 'b', t: 'Email the client yourself to explain the change', points: 2 },
        { id: 'c', t: 'Quietly keep them on the old model', points: 0 },
        { id: 'd', t: 'Pause all contact with them until things settle', points: 1 }] },
      { q: 'While rebuilding, you find an old deck that mentions a placement fee nobody ever agreed. What do you do?', options: [
        { id: 'a', t: 'Remove it and tell the CEO you have removed it', points: 5 },
        { id: 'b', t: 'Leave it. It was in the original', points: 0 },
        { id: 'c', t: 'Change it to a figure you think is fair', points: 0 },
        { id: 'd', t: 'Remove it and say nothing', points: 3 }] },
    ],
  },
  {
    id: 'c5', type: 'steps', enabled: true, tag: 'Feedback', pillar: 'p4', weight: 0.5, limit: 75,
    title: 'A message in capitals',
    lead: 'You sent the CEO a contract to review. This comes back on Slack.',
    bubble: { text: 'THIS IS WRONG. WE NEVER AGREED A BUYOUT FEE. WHY IS IT IN THE CONTRACT?', from: 'CEO, 2 minutes ago' },
    steps: [
      { q: 'Pick your reply', options: [
        { id: 'a', t: 'Sorry, removed now. Updated version attached, only that clause has changed.', points: 5 },
        { id: 'b', t: 'I am so sorry, I feel terrible. I will go through the whole contract again and rewrite anything that could be an issue.', points: 2 },
        { id: 'c', t: 'It was in the template I used, so I assumed it was standard.', points: 1 },
        { id: 'd', t: 'Noted. Can we talk it through on our next call?', points: 1 }] },
    ],
    slider: { label: 'How much of the rest of the contract do you change?', left: 'Only the flagged clause', right: 'Rewrite it all', best: 20, weight: 0.3 },
  },
  {
    id: 'c6', type: 'matrix', enabled: true, tag: 'AI-native', pillar: 'p5', weight: 0.5, limit: 100,
    title: 'Match the tool to the job',
    lead: 'Our week runs on a stack of tools. For each job, tap the tool you would reach for first. Not used them all? Each one has a short description, so you can still work it out.',
    cols: ['CapCut / Descript (video editing)', 'Gamma (AI slide decks)', 'Fireflies (meeting recorder)', 'Framer (website builder)', 'Pipedrive (sales CRM)', 'Claude (AI assistant)'],
    rows: [
      { id: 't1', t: 'Turn a 31-minute keynote into a 60-second Reel', correct: 'CapCut / Descript (video editing)' },
      { id: 't2', t: 'Build a branded pitch deck for a charity', correct: 'Gamma (AI slide decks)' },
      { id: 't3', t: 'Record and transcribe a client call', correct: 'Fireflies (meeting recorder)' },
      { id: 't4', t: 'Edit a section of the live website', correct: 'Framer (website builder)' },
      { id: 't5', t: 'Log a deal and its next activity', correct: 'Pipedrive (sales CRM)' },
      { id: 't6', t: 'Draft a proposal from a call transcript and check every figure', correct: 'Claude (AI assistant)' },
    ],
  },
  {
    id: 'c7', type: 'flag', display: 'code', enabled: true, tag: 'AI-native', pillar: 'p5', weight: 0.5, limit: 75,
    title: 'Prompt surgery',
    lead: 'A teammate wrote this prompt for an AI agent that edits our website. Tap every line that will cause a problem.',
    items: [
      { id: 'l1', t: 'Fix the mobile header so the top section loads in the right place.', correct: false },
      { id: 'l2', t: 'While you are there, redesign the whole page to look more modern.', correct: true },
      { id: 'l3', t: 'Change the Download button to Amber #FCB040 with Rich Black text.', correct: false },
      { id: 'l4', t: 'Add some impressive statistics about youth unemployment to the hero.', correct: true },
      { id: 'l5', t: 'Do not change the contact form. It has been tested.', correct: false },
      { id: 'l6', t: 'Check the page on mobile and desktop and confirm each change.', correct: false },
      { id: 'l7', t: 'Publish straight to the live site when you are done.', correct: true },
    ],
  },
  {
    id: 'c8', type: 'pattern', enabled: true, tag: 'Logic', pillar: 'p1', weight: 0.4, limit: 120,
    title: 'Hive logic',
    lead: 'Three pattern puzzles that get harder. Work out the rule, then pick what comes next.',
    puzzles: [
      { seq: [P(Wt, { 0: A, 3: T }), P(Wt, { 1: A, 2: T }), P(Wt, { 2: A, 1: T })], opts: [{ id: 'a', s: P(Wt, { 3: A, 0: T }), correct: true }, { id: 'b', s: P(Wt, { 3: A, 1: T }) }, { id: 'c', s: P(Wt, { 0: A, 3: T }) }, { id: 'd', s: P(Wt, { 2: A, 0: T }) }] },
      { seq: [F(Wt, [0], T), F(Wt, [2, 3], T), F(Wt, [4, 5, 0], T)], opts: [{ id: 'a', s: F(Wt, [0, 1, 2, 3], T), correct: true }, { id: 'b', s: F(Wt, [4, 5, 0, 1], T) }, { id: 'c', s: F(Wt, [1, 2, 3], T) }, { id: 'd', s: F(Wt, [1, 2, 3, 4], T) }] },
      { seq: [P(Wt, { 0: A, 3: CL }), P(T, { 2: A, 5: CL }), P(Wt, { 4: A, 1: CL })], opts: [{ id: 'a', s: P(T, { 0: A, 3: CL }), correct: true }, { id: 'b', s: P(Wt, { 0: A, 3: CL }) }, { id: 'c', s: P(T, { 5: A, 2: CL }) }, { id: 'd', s: P(T, { 0: A, 4: CL }) }] },
    ],
  },
  {
    id: 'c9', type: 'flag', display: 'tiles', enabled: true, tag: 'Detail', pillar: 'p2', weight: 0.4, limit: 60,
    title: 'Brand eye',
    lead: 'Our brand guidelines are strict about how the logo is used. Tap every tile that breaks the rules.',
    items: [
      { id: 'white', t: 'Logo on white', visual: 'white', correct: false },
      { id: 'amber', t: 'Logo on Amber', visual: 'amber', correct: false },
      { id: 'stretch', t: 'Stretched logo', visual: 'stretch', correct: true },
      { id: 'border', t: 'Clay Orange border', visual: 'border', correct: true },
      { id: 'ivory', t: 'Logo on Soft Ivory', visual: 'ivory', correct: false },
      { id: 'fx', t: 'Drop shadow and glow', visual: 'fx', correct: true },
      { id: 'recolour', t: 'Recoloured to a client brand', visual: 'recolour', correct: true },
      { id: 'dark', t: 'White logo on Rich Black', visual: 'dark', correct: false },
    ],
  },
  {
    id: 'c10', type: 'steps', enabled: true, tag: 'Ownership', pillar: 'p6', weight: 0.4, limit: 100,
    title: 'This or that?',
    lead: 'Both options are reasonable. Pick the one that sounds more like you, and go with your gut.',
    steps: [
      { q: 'When a brief is unclear, you usually\u2026', options: [{ id: 'a', t: 'Make a quick first version and ask for feedback', points: 5 }, { id: 'b', t: 'Ask questions until it is completely clear', points: 3 }] },
      { q: 'You have a free hour. You\u2026', options: [{ id: 'a', t: 'Look for something that needs doing that nobody has asked for', points: 5 }, { id: 'b', t: 'Get ahead on tomorrow\u2019s list', points: 3 }] },
      { q: 'You finish a document at 6pm. You\u2026', options: [{ id: 'a', t: 'Check every figure once more before sending', points: 5 }, { id: 'b', t: 'Send it now and fix anything later', points: 1 }] },
      { q: 'Feedback you work best with is\u2026', options: [{ id: 'a', t: 'Short and blunt, straight away', points: 5 }, { id: 'b', t: 'Considered and written up later', points: 3 }] },
      { q: 'A new tool could save you time. You\u2026', options: [{ id: 'a', t: 'Try it tonight and see', points: 5 }, { id: 'b', t: 'Wait until someone shows you how it works', points: 1 }] },
      { q: 'Your best kind of week is\u2026', options: [{ id: 'a', t: 'Lots of different jobs across the business', points: 5 }, { id: 'b', t: 'Deep focus on one big project', points: 2 }] },
      { q: 'What matters more to you in a job?', options: [{ id: 'a', t: 'Knowing who the work helps', points: 5 }, { id: 'b', t: 'Knowing exactly what is expected', points: 3 }] },
    ],
  },
  {
    id: 'c10w', type: 'written', enabled: true, tag: 'In your words', pillar: 'p6', weight: 0.6, limit: 240,
    title: 'Work nobody asked for',
    lead: 'Tell us about a time you spotted work that nobody had asked you to do. What was it, what did you do, and what happened? Up to 150 words. Typing only.',
    minWords: 25, maxWords: 150,
    rubric: '5 = specific real example, clearly self-initiated, concrete action and a clear or measurable outcome, shows ownership through to done.\n4 = specific and self-initiated, outcome a little vague.\n3 = a real example but generic, or initiative is unclear.\n2 = vague, hypothetical, or describes doing assigned work.\n1 = off-topic, empty, or no example.',
  },

  /* ---------- Sales & marketing ---------- */
  {
    id: 's1', type: 'rank', strictTop: 1, enabled: true, tag: 'Sales', pillar: 'p7', weight: 1, limit: 90,
    title: 'Pipeline first',
    lead: 'You have one hour for sales follow-ups today. Tap these leads in the order you would chase them.',
    items: [
      { id: 'a', t: 'A charity CEO who asked for pricing yesterday', s: 'Hot lead, waiting on us' },
      { id: 'b', t: 'A funder who replied \u201cinterested, send more\u201d last week', s: 'No reply sent yet' },
      { id: 'c', t: 'A client who signed last month', s: 'Quick check-in, possible referral' },
      { id: 'd', t: 'An event contact who connected on LinkedIn', s: 'No conversation yet' },
      { id: 'e', t: 'A cold list of 40 charities from a directory', s: 'Never contacted' },
    ],
  },
  {
    id: 's2', type: 'steps', enabled: true, tag: 'Sales', pillar: 'p7', weight: 1, limit: 90,
    title: 'The opener',
    lead: 'You are messaging the CEO of a youth charity on LinkedIn for the first time, for our CEO.',
    steps: [{ q: 'Which first message is most likely to get a reply?', options: [
      { id: 'a', t: 'Congratulations on your Thamesmead cohort finishing. We helped Future Leaders go from London-only to national by cutting their admin. Worth a 15-minute chat about your reporting?', points: 5 },
      { id: 'b', t: 'Hi, I am from OneHive, an AI-powered LMS, CRM and impact reporting platform for charities. Can I book you in for a demo this week?', points: 2 },
      { id: 'c', t: 'Hope you are well! Just checking whether you have heard of OneHive?', points: 0 },
      { id: 'd', t: 'Our platform offers learning management, CRM, impact dashboards, SROI reporting, notifications and AI automation, all in one place. Let me know if you would like to hear more.', points: 1 }] }],
  },
  {
    id: 's3', type: 'steps', enabled: true, tag: 'Sales', pillar: 'p7', weight: 1, limit: 75,
    title: 'No budget',
    lead: 'A charity loved the demo, then emails: \u201cWe really like it, but there is no budget this year.\u201d',
    steps: [{ q: 'What is your next move?', options: [
      { id: 'a', t: 'Ask about their funding calendar and offer to help build OneHive into their next grant bid', points: 5 },
      { id: 'b', t: 'Offer them 50% off straight away to keep the deal', points: 1 },
      { id: 'c', t: 'Thank them and mark the deal as lost in the CRM', points: 0 },
      { id: 'd', t: 'Resend the pricing with a longer list of features', points: 1 }] }],
  },
  {
    id: 'm1', type: 'steps', enabled: true, tag: 'Marketing', pillar: 'p7', weight: 1, limit: 75,
    title: 'Hook the scroll',
    lead: 'You are cutting a 60-second Instagram Reel from a 31-minute keynote by our CEO.',
    steps: [{ q: 'What goes in the first two seconds?', options: [
      { id: 'a', t: 'The strongest line, with big captions: \u201cYoung people are not the problem. Our systems are.\u201d', points: 5 },
      { id: 'b', t: 'The event logo and a title card', points: 1 },
      { id: 'c', t: 'The CEO walking on stage', points: 1 },
      { id: 'd', t: 'A slide saying \u201cWatch till the end\u201d', points: 0 }] }],
  },
  {
    id: 'm2', type: 'matrix', enabled: true, tag: 'Marketing', pillar: 'p7', weight: 1, limit: 90,
    title: 'Right content, right place',
    lead: 'Match each piece of content to where it works best.',
    cols: ['LinkedIn post', 'Instagram Reel', 'Email newsletter', 'Proposal deck'],
    rows: [
      { id: 'r1', t: 'A client\u2019s impact results with a quote from their CEO', correct: 'LinkedIn post' },
      { id: 'r2', t: 'A 30-second behind-the-scenes clip of a youth workshop', correct: 'Instagram Reel' },
      { id: 'r3', t: 'A monthly round-up of product updates for existing clients', correct: 'Email newsletter' },
      { id: 'r4', t: 'Pricing, ROI and the contract for a charity that asked for it', correct: 'Proposal deck' },
    ],
  },
  {
    id: 'm3', type: 'written', enabled: true, tag: 'Sales writing', pillar: 'p7', weight: 1.2, limit: 180,
    title: 'Write the message',
    lead: 'You met the CEO of a Manchester youth charity at an event yesterday. Write a LinkedIn message (up to 60 words) that gets them to book a 15-minute call with our CEO. Typing only.',
    minWords: 15, maxWords: 60,
    rubric: '5 = short and warm, a specific personal reference to the event or their work, one relevant proof point, one clear low-effort ask, British tone, no jargon.\n4 = good and personal, but the proof point or ask is a little weak.\n3 = clear but generic, could be sent to anyone.\n2 = salesy, feature-heavy or pushy, or no clear ask.\n1 = off-brief, empty or unprofessional.',
  },

  /* ---------- New questions (switched off until you enable them) ---------- */
  {
    id: 'n1', type: 'steps', enabled: false, isNew: true, tag: 'Logic', pillar: 'p1', weight: 0.4, limit: 120,
    title: 'Two time zones',
    lead: 'The CEO in London wants a 45-minute call on Tuesday with a charity in Manchester and Grace, who works in Nairobi. The charity is free 9:00 to 11:30 London time. Grace works 1pm to 5pm Nairobi time. The CEO is busy 10:00 to 10:30 London time. In November, Nairobi is 3 hours ahead of London.',
    steps: [{ q: 'Which start time works for everyone?', options: [
      { id: 'a', t: '10:30 London (1:30pm Nairobi)', points: 5 },
      { id: 'b', t: '9:30 London (12:30pm Nairobi)', points: 0 },
      { id: 'c', t: '10:00 London (1:00pm Nairobi)', points: 1 },
      { id: 'd', t: '11:00 London (2:00pm Nairobi)', points: 2 }] }],
  },
  {
    id: 'n2', type: 'flag', display: 'list', enabled: false, isNew: true, tag: 'Accuracy', pillar: 'p2', weight: 0.5, limit: 90,
    title: 'Transcript to actions',
    lead: 'Here is a line from this morning’s call transcript. Tap only the actions that are yours.',
    notes: { title: 'Transcript', lines: ['CEO: The charity needs the full sales deck with the contract inside by Thursday. Can you build it? I will send it with my email.', 'CEO: CTO, notifications are not ready to sell yet, keep testing them with Future Leaders.', 'CEO: And chase Spark about the joint post. We post on Tuesday whether they reply or not.', 'CEO: Maybe one day we should think about a podcast.'] },
    items: [
      { id: 'deck', t: 'Build the sales deck with the contract inside, ready by Thursday', correct: true },
      { id: 'spark', t: 'Tell Spark we are posting on Tuesday', correct: true },
      { id: 'test', t: 'Test notifications with Future Leaders', correct: false },
      { id: 'send', t: 'Send the contract to the charity yourself', correct: false },
      { id: 'notif', t: 'Add notifications to the sales deck', correct: false },
      { id: 'wait', t: 'Wait for Spark to reply before posting', correct: false },
      { id: 'pod', t: 'Start planning a podcast', correct: false },
    ],
  },
  {
    id: 'n3', type: 'flag', display: 'table', enabled: false, isNew: true, tag: 'Detail', pillar: 'p2', weight: 0.4, limit: 75,
    title: 'CRM clean-up',
    lead: 'This is part of our deals pipeline. Tap every row that needs fixing before the Monday report.',
    items: [
      { id: 'r1', t: 'Inner Spark · aneesha@innerspark.org · Proposal sent · Next: follow-up call Thursday', correct: false },
      { id: 'r2', t: 'Youthbuild Ventures · no email · Demo done · Next: none', correct: true },
      { id: 'r3', t: 'YouthBuild Ventures UK · hannah@ybv.org · Demo done · Next: send deck', correct: false },
      { id: 'r4', t: 'Skinners Hub · info@skinners · Negotiation · Next: contract review', correct: true },
      { id: 'r5', t: 'Future Leaders UK · team@futureleaders.org.uk · Won · Next: onboarding call', correct: false },
      { id: 'r6', t: 'Camden Youth Trust · contact@cyt.org · Lead · Last touched 94 days ago · Next: none', correct: true },
    ],
  },
  {
    id: 'n4', type: 'steps', enabled: false, isNew: true, tag: 'Judgement', pillar: 'p3', weight: 0.5, limit: 60,
    title: 'The money question',
    lead: 'A VA candidate you are placing with a client messages you: “How much is the client paying OneHive for me?”',
    steps: [{ q: 'What do you do?', options: [
      { id: 'a', t: 'Explain that the commercial terms sit between OneHive and the client, and keep the focus on her own rate and role', points: 5 },
      { id: 'b', t: 'Tell her the fee. Being open builds trust', points: 0 },
      { id: 'c', t: 'Say you do not know', points: 1 },
      { id: 'd', t: 'Ask the CEO whether you are allowed to share it', points: 3 }] }],
  },
  {
    id: 'n5', type: 'steps', enabled: false, isNew: true, tag: 'Ownership', pillar: 'p6', weight: 0.4, limit: 75,
    title: 'Chasing the funder',
    lead: 'A funder promised to send a grant form two weeks ago. Nothing since, and the deadline is Friday.',
    steps: [{ q: 'What do you do today?', options: [
      { id: 'a', t: 'Send a short, warm nudge: thank them, restate the Friday deadline, ask for the form by Wednesday and offer a 10-minute call', points: 5 },
      { id: 'b', t: 'Wait. They know the deadline', points: 0 },
      { id: 'c', t: 'Ask the CEO to chase them', points: 2 },
      { id: 'd', t: 'Send a long email explaining the whole project again', points: 2 }] }],
  },
];
