export type RiskRating = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';

export interface Instance {
  id: number;
  finding_id: number;
  location: string;
  details: string;
  status: string;
}

export interface Finding {
  id: number;
  project_id: number;
  title: string;
  risk_rating: RiskRating;
  description: string;
  remediation: string;
  instances: Instance[];
}

export interface Project {
  id: number;
  name: string;
  consultant_name: string;
  findings: Finding[];
}