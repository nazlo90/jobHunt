// ============================================================
// cv-adapter-data.ts — Your master CV
// ============================================================
// This file is the single source of truth for your CV data.
// The AI CV adapter reads this when generating tailored CVs
// and cover letters for each job application.
//
// How to update:
//   1. Replace all placeholder values below with your real info.
//   2. Add / remove experience entries as needed (keep newest first).
//   3. Update skills, education, courses, and languages to match your profile.
//   4. The `profile` field is your summary paragraph — write it in first person
//      or third person, whichever you prefer. The AI will reuse and adapt it.
// ============================================================

export const MASTER_CV = {
  name: 'Your Full Name',
  title: 'Your Job Title (e.g. Senior Frontend Developer)',
  phone: '+1 000 000 0000',
  email: 'your.email@example.com',
  linkedin: 'https://linkedin.com/in/your-profile',
  github: 'https://github.com/your-username',

  // 3-5 sentence professional summary. Highlight years of experience,
  // core technologies, and your main impact/achievements.
  profile: `Experienced [Your Title] with X years of experience building [type of products].
Expert in [Tech1], [Tech2], and [Tech3]. Proven track record of [key achievement].
Passionate about [area of interest].`,

  // Group your skills by category. Add/remove categories as needed.
  skills: {
    Frontend: 'e.g. JavaScript, TypeScript, Angular, React, RxJS',
    Backend: 'e.g. NestJS, Node.js, REST APIs, GraphQL',
    'Cloud & Databases': 'e.g. AWS, Firebase, PostgreSQL, MongoDB',
    'Testing & DevOps': 'e.g. Jest, Cypress, GitHub Actions, Docker, CI/CD',
    'Design & UX': 'e.g. HTML5, SCSS, Tailwind, Figma',
  },

  // List jobs in reverse chronological order (newest first).
  // Each entry: title, company, period, domain (industry), stack, bullets (achievements).
  // Tip: write bullets as impact statements — "Did X, resulting in Y%".
  experience: [
    {
      title: 'Senior Frontend Developer',
      company: 'Company Name',
      period: 'Jan 2024 — Present',
      domain: 'e.g. FinTech / SaaS',
      stack: 'Angular, TypeScript, RxJS, REST APIs',
      bullets: [
        'Describe your main contribution and its measurable impact.',
        'Led development of [feature/system], improving [metric] by X%.',
        'Collaborated with [team] to deliver [outcome].',
      ],
    },
    {
      title: 'Frontend Developer',
      company: 'Previous Company',
      period: 'Jun 2021 — Dec 2023',
      domain: 'e.g. E-commerce',
      stack: 'React, TypeScript, Redux, Node.js',
      bullets: [
        'Built and maintained [product], used by X users.',
        'Implemented [feature], reducing [problem] by X%.',
        'Mentored junior developers and improved team code review process.',
      ],
    },
    // Add more entries as needed...
  ],

  education: [
    {
      degree: "Bachelor's / Master's Degree",
      field: 'Your Field of Study',
      institution: 'University Name',
      location: 'City, Country',
      period: 'Sept 2015 — Jun 2019',
    },
  ],

  // Optional: certifications or online courses
  courses: [
    { name: 'Course Name', provider: 'Platform (e.g. Udemy)', period: 'Jan 2023 — Mar 2023' },
  ],

  languages: [
    { language: 'English', level: 'Fluent' },
    { language: 'Your Native Language', level: 'Native speaker' },
  ],
};
