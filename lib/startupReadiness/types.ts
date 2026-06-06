export interface StartupReadinessScores {
  team: number;
  market: number;
  validation: number;
  progress: number;
  overall: number;
  computedAt: string;
}

export interface ProjectValidationFields {
  usersInterviewed?: number;
  surveyResults?: number;
  mvpExists?: boolean;
  customerFeedback?: number;
}

export interface ReadinessComputeInput {
  name: string;
  desc: string;
  categoryId: string;
  status: string;
  roles: string[];
  maxTeamSize?: number;
  tasks?: Array<{ status?: string }>;
  teamMembers?: Array<{ status?: string; contact?: string }>;
  ownerContact?: string;
  validation?: ProjectValidationFields;
  postsCount?: number;
  activitiesCount?: number;
  teamUsers?: Array<{
    verifiedSkills?: Array<{ score?: number; skillId?: string }>;
    skills?: string[];
  }>;
}
