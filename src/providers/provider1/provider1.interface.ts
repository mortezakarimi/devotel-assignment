export interface Provider1 {
  metadata: Metadata;
  jobs: Job[];
}

export interface Metadata {
  requestId: string;
  timestamp: string;
}

export interface Job {
  jobId: string;
  title: string;
  details: Details;
  company: Company;
  skills: string[];
  postedDate: string;
}

export interface Details {
  location: string;
  type: string;
  salaryRange: string;
}

export interface Company {
  name: string;
  industry: string;
}
