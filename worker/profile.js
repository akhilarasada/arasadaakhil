// The portfolio's content as data. The MCP server answers AI assistants from this file,
// so keep it in step with public/index.html when the site copy changes.

export const SITE = 'https://arasadaakhil.website';

export const profile = {
  name: 'Arasada Akhil',
  title: 'Team Lead and Full Stack Developer',
  currentRole: 'Lead .NET Developer at Revalsys Technologies',
  location: 'Hyderabad, Telangana, India',
  summary: 'Leads the build of RevalERP, a SaaS POS and ERP platform, and the E-commerce platform at Revalsys Technologies: sprint planning, unblocking the team and shipping to production. Also takes on freelance projects: websites, CMS platforms, HRMS and custom tools.',
  availability: 'Open to freelance projects. Especially: CMS websites live in 5 days, HRMS tools, and customised tools for any business.',
  highlights: [
    '25+ ERP modules led at Revalsys',
    '40+ freelance builds shipped',
    '5 certifications',
    '3 companies since 2023'
  ],
  education: 'B.Tech in Computer Science, Parvatha Reddy Babul Reddy Visvodaya Institute of Technology & Science (2020 to 2024)'
};

export const experience = [
  {
    role: 'Lead Dotnet Developer', company: 'Revalsys Technologies', place: 'Hyderabad', period: 'Mar 2026 to present',
    details: 'Leading development and delivery of RevalERP and the E-commerce platform: sprint planning, task assignment, status reviews and production deployments.'
  },
  {
    role: 'Junior Software Developer', company: 'Sphinx Worldbiz Limited', place: 'Noida', period: 'Jan 2025 to Feb 2026',
    details: 'Feature development, performance optimization and integrations on SHRMPro, an enterprise HR management solution.'
  },
  {
    role: 'Dotnet Developer', company: 'Sphinx Worldbiz Limited', place: 'Noida', period: 'Sep 2024 to Dec 2024',
    details: 'Joined the SHRMPro team, building features and improving system efficiency on the .NET stack.'
  },
  {
    role: 'Intern', company: 'Virtusa', place: 'Hyderabad', period: 'Aug 2023 to Aug 2024',
    details: 'Led a team of three building an augmented reality online session application with Unity.'
  }
];

export const projects = [
  {
    name: 'RevalERP', kind: 'work', tags: 'SaaS, ERP, POS, team lead', url: 'https://revalsys.revalerp.com/',
    role: 'Lead .NET Developer', team: 'Revalsys Technologies', period: 'Mar 2026 to present',
    description: 'A comprehensive SaaS-based POS and ERP platform. Akhil leads its development and delivery, coordinating business modules including HRMS, Finance, POS, CMS, Ticket CRM, Procurement, Sales and Project Management, running sprint planning and status reviews, and overseeing feature releases into production.'
  },
  {
    name: 'SHRMPro', kind: 'work', tags: 'Enterprise, HR management, .NET', url: 'https://www.shrmpro.com/',
    role: '.NET Developer', team: 'Sphinx Worldbiz', period: '2024 to 2026 (1 year 6 months)',
    description: 'A .NET-based enterprise HR management solution. Akhil worked on feature development, performance optimization and integrations.'
  },
  {
    name: 'AR Sessions', kind: 'work', tags: 'Augmented reality, Unity, real-time', url: null,
    role: 'Intern, dev team lead', team: 'Virtusa', period: '2023 to 2024 (1 year 1 month)',
    description: 'An augmented reality online session application built in Unity, with real-time session management and interactive AR components. Akhil led a team of three developers and improved project delivery times by 30%.'
  },
  {
    name: 'ALI CMS Studio', kind: 'freelance', tags: 'CMS platform', url: 'https://alicms.netlify.app/',
    description: 'ALI stands for "Any site, Live Instantly". Akhil\'s own content management platform for client websites: pick a design, plug in the content, and the site is ready in five days, with the owner managing every page, photo and post from one dashboard.'
  },
  {
    name: 'SkillOn', kind: 'freelance', tags: 'Career platform', url: 'https://skillon.netlify.app/',
    description: 'A learn, build, get hired platform for freshers and experienced professionals: AI resume builder for ATS-friendly CVs, skill tests with certificates, 1-1 mock interviews, job-ready courses and campus-to-job programs.'
  },
  {
    name: 'SignalHire', kind: 'freelance', tags: 'Hiring tool', url: 'https://signalhiretool.netlify.app/',
    description: 'A resume review tool for recruiters. Upload resumes singly or in bulk, add LinkedIn profiles, and screen every candidate against a job description you create.'
  },
  {
    name: 'HRMSphere', kind: 'freelance', tags: 'HRMS', url: 'https://hrmssphere.netlify.app/',
    description: 'A hire-to-retire HR management system: employee profiles, leave management, geofenced attendance, payroll processing and role-based access for admins, managers and employees.'
  },
  {
    name: 'Likesh Krishna & Associates', kind: 'freelance', tags: 'Website + CMS', url: 'https://calikeshkrishna.com/',
    description: 'Website for a chartered accountancy firm in Hyderabad and Vijayawada, covering services, sectors, blog and careers, running on its own CMS.'
  },
  {
    name: 'Sravanthi Makeup Pro', kind: 'freelance', tags: 'Salon website', url: 'https://sravanthimakeuppro.in/',
    description: 'Website for a bridal makeup artist and salon in Nellore, where clients browse services and book appointments online.'
  },
  {
    name: 'SR Photography', kind: 'freelance', tags: 'Photography studio, in progress', url: 'https://srphototest.netlify.app/',
    description: 'A wedding photography and films studio site, currently in development: galleries, featured stories, services, testimonials and date booking.'
  }
];

export const skills = {
  areas: [
    { name: 'Team Leadership', detail: 'Sprint planning, task distribution and status reviews.' },
    { name: '.NET & Azure', detail: 'C# back-ends and REST APIs for multi-module business software, built to run in the cloud.' },
    { name: 'Full Stack with NextJs', detail: 'From database to interface, front-ends that make dense ERP workflows feel simple.' },
    { name: 'Product Delivery', detail: 'Agile execution from backlog to production, with stable deployments.' }
  ],
  stack: ['.NET', 'C#', 'Azure', 'ReactJS', 'NextJs', 'REST APIs', 'SaaS', 'ERP', 'POS', 'Agile', 'Python', 'Unity'],
  certifications: [
    'Microsoft Certified: Azure AI Fundamentals',
    'Microsoft Certified: Azure Data Fundamentals',
    'Microsoft Technology Associate: Introduction to Programming using Python',
    'Software Engineer Certificate',
    'C# (Basic)'
  ]
};

export const contact = {
  email: 'contact@arasadaakhil.website',
  website: SITE,
  contactForm: SITE + '/#contact',
  resume: SITE + '/assets/Arasada-Akhil-Resume.pdf',
  linkedin: 'https://www.linkedin.com/in/arasadaakhil',
  github: 'https://github.com/akhilarasada',
  instagram: 'https://www.instagram.com/akhilgaduromeo/'
};
