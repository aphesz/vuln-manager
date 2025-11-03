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

export interface SLAComplianceMetrics {
  on_track: number;
  at_risk: number;
  overdue: number;
  total: number;
  compliance_rate: number;
}

export interface ReviewProgressMetrics {
  pending: number;
  in_review: number;
  approved: number;
  rejected: number;
  total: number;
  approval_rate: number;
}

export interface FindingTrend {
  date: string;
  total_findings: number;
  open_findings: number;
  closed_findings: number;
}

export interface TopVulnerability {
  title: string;
  risk_rating: string;
  instance_count: number;
  finding_id: number;
}

export interface ProjectMetrics {
  sla_compliance: SLAComplianceMetrics;
  review_progress: ReviewProgressMetrics;
  finding_trends: FindingTrend[];
  top_vulnerabilities: TopVulnerability[];
  total_findings: number;
  total_instances: number;
  average_cvss_score: number | null;
  findings_with_jira: number;
  jira_sync_rate: number;
  average_time_to_approval: number | null;
}

export interface VulnerabilityTemplate {
  id: number;
  title: string;
  description: string;
  cwe_id?: string;
  cve_id?: string;
  cvss_vector?: string;
  cvss_score?: number;
  owasp_likelihood?: number;
  owasp_impact?: number;
  owasp_risk_rating?: string;
  default_risk_rating?: RiskRating;
  vulnerability_type?: string;
  remediation_summary?: string;
  remediation_steps?: string;
  references?: string;
  source: string;
  is_verified: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
  last_used?: string;
}

export interface InstanceCreate {
  location: string;
  details: string;
}

export interface FindingCreate {
  title: string;
  description: string;
  remediation: string;
  risk_rating: RiskRating;
  template_id?: number;
  instances: InstanceCreate[];
  issue_status?: IssueStatus;
}
