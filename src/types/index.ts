export type ApplicationStatus = "discovered" | "shortlisted" | "prepared" | "applied" | "interview" | "rejected" | "offer" | "withdrawn";

export interface Preferences {
  roles: string[];
  skills: string[];
  locations: string[];
  experienceYears?: number;
  remote?: boolean;
  minSalary?: number;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  url: string;
  description: string;
  location?: string;
  salary?: string;
  source: string;
  matchScore?: number;
  selectedCvId?: string;
  status: ApplicationStatus;
  discoveredAt: string;
  appliedAt?: string;
  notes?: string;
  followUpAt?: string;
}

export interface Cv {
  id: string;
  name: string;
  path: string;
  text: string;
  roles: string[];
  skills: string[];
  createdAt: string;
}
