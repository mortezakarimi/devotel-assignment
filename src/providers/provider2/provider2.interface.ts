export interface Provider2 {
  status: string;
  data: Data;
}

export interface Data {
  jobsList: JobsList;
}

export interface JobsList {
  [key: string]: Job;
}

export interface Job {
  position: string;
  location: Location;
  compensation: Compensation;
  employer: Employer;
  requirements: Requirements;
  datePosted: string;
}

export interface Location {
  city: string;
  state: string;
  remote: boolean;
}

export interface Compensation {
  min: number;
  max: number;
  currency: string;
}

export interface Employer {
  companyName: string;
  website: string;
}

export interface Requirements {
  experience: number;
  technologies: string[];
}
