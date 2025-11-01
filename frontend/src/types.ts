export type RiskRating = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
export type ReviewStatus = 'Pending' | 'In Review' | 'Approved' | 'Rejected';
export type SLAStatus = 'On Track' | 'At Risk' | 'Overdue';
export type IssueStatus = 'Open' | 'Partially Closed' | 'Closed';

export interface Instance {
  id: number;
  finding_id: number;
  location: string;
  details: string;
  status: string;
}

export interface Comment {
  id: number;
  finding_id: number;
  user: string;
  text: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  user: string;
  timestamp: string;
  changes_json: string;
}

export interface Finding {
  id: number;
  project_id: number;
  title: string;
  risk_rating: RiskRating;
  description: string;
  remediation: string;
  instances: Instance[];
  // Tier 1 fields
  review_status?: ReviewStatus;
  reviewer_name?: string;
  jira_issue_key?: string;
  jira_status?: string;
  remediation_deadline?: string;
  sla_status?: SLAStatus;
  remediation_owner?: string;
  // Issue Status fields
  issue_status?: IssueStatus;
  issue_status_comment?: string;
}

export interface Project {
  id: number;
  name: string;
  consultant_name: string;
  findings: Finding[];
}

export interface JiraSettings {
  id?: number;
  project_id: number;
  jira_url: string;
  project_key: string;
  api_token_encrypted?: string;
}

export interface SLASummary {
  on_track: number;
  at_risk: number;
  overdue: number;
}

export interface RiskSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  informational: number;
}
