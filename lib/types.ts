import type { SkillBadgeLevel } from '@/lib/skillVerification/types';

export type PlanTier = 'free' | 'pro';

export interface VerifiedSkill {
  skillId: string;
  skillName: string;
  score: number;
  testScore?: number;
  integrityScore?: number;
  mcqScore: number;
  practicalScore: number;
  badge: SkillBadgeLevel;
  badgeLabel: string;
  badgeIcon: string;
  proctorFlags?: string[];
  suspicious?: boolean;
  verifiedAt?: string;
}

export interface User {
  id?: string;
  name: string;
  contact: string;
  isLoggedIn: boolean;
  plan?: PlanTier;
  skills?: string[];
  verifiedSkills?: VerifiedSkill[];
  hobbies?: string[];
  college?: string;
  graduationYear?: string;
  city?: string;
  state?: string;
}

export interface Profile {
  id?: string;
  contact: string;
  role: 'member' | 'creator' | 'both';
  tagline: string;
  categoryIds: string[];
  skills: string[];
  rateMin: number | null;
  rateMax: number | null;
  currency: string;
  availableForInvites: boolean;
  bio?: string;
  portfolio?: string;
  profileImage?: string;
}

export interface Category {
  id: string;
  title: string;
  blurb: string;
}

export interface Project {
  id: string;
  categoryId: string;
  name: string;
  desc: string;
  roles: string[];
  projectPurpose?: ProjectPurpose;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  ownerContact?: string;
  city?: string;
  state?: string;
  slug?: string;
  createdAt?: string;
}

export interface Person {
  id: string;
  name: string;
  initials: string;
  categoryIds: string[];
  skills: string[];
  rateMin: number;
  rateMax: number;
  currency: string;
  tagline: string;
}

export interface WizardState {
  step: number;
  entry: 'create' | 'join' | '';
  category: string;
  skills: string[];
  quoteIndex: number;
  projectName?: string;
  projectDescription?: string;
  teamSize?: number;
  deadline?: string;
  vision?: string;
  minSalary?: number;
  maxSalary?: number;
  currency?: string;
}

export type ProjectPurpose = 'employment' | 'college' | 'creative' | 'community';

export interface ProjectData {
  id?: string;
  name: string;
  description: string;
  categoryId: string;
  category: string;
  projectPurpose?: ProjectPurpose;
  skills: string[];
  teamSize?: number;
  deadline?: string;
  vision: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  city?: string;
  state?: string;
  slug?: string;
  mode: 'create' | 'join' | 'member';
  ownerContact?: string;
}

export interface InvitePerson {
  id: string;
  name: string;
  tagline: string;
  skills: string[];
  rateMin: number;
  rateMax: number;
  currency: string;
  availableForInvites: boolean;
  categoryIds: string[];
}

export interface InviteScore {
  person: InvitePerson;
  exact: number;
  partial: number;
  matchPct: number;
  budgetOverlap: number | null;
  overlaps: boolean;
}

export interface ProjectMatch {
  id: string;
  name: string;
  category: string;
  desc: string;
  roles: string[];
  match: number;
  salaryLabel: string;
}

export interface AppState {
  user: User | null;
  role: 'creator' | 'member' | null;
  currentProject: Project | null;
  view: string;
  activeTab: string;
  posts: any[];
  projects: Project[];
  people: Person[];
  notifications: string[];
  recommendations: any[];
}

export interface CourseLesson {
  id: string;
  title: string;
  content: string;
  videoUrl?: string;
  order: number;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  categoryId: string;
  skills: string[];
  level: 'beginner' | 'intermediate' | 'advanced';
  hours: number;
  coverImage?: string;
  lessons: CourseLesson[];
  projectSlug?: string;
  lessonCount?: number;
  enrolled?: boolean;
  completedLessonIds?: string[];
  progress?: number;
  completed?: boolean;
}
