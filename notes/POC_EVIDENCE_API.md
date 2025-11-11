# Proof of Concept (POC) Evidence API

Adds POC evidence management for findings: upload images, list, download, and delete.

## New Finding fields
- impact: Optional long-form text (business/technical impact)
- references_url: Optional URL string (http/https)
- poc_description: Optional long-form text accompanying artifacts

These can be updated via PATCH /findings/{id}.

## Endpoints

1) POST /findings/{finding_id}/artifacts
- Multipart form fields:
  - file: image/jpeg or image/png (max 5 MiB)
  - description: optional text
- Returns: FindingArtifactRead JSON

2) GET /findings/{finding_id}/artifacts
- Returns: array of FindingArtifactRead

3) GET /artifacts/{artifact_id}/download
- Returns: file download with proper content-type and filename

4) DELETE /artifacts/{artifact_id}
- Deletes artifact metadata and file on disk

## Storage
- Base directory: UPLOAD_DIR env var (defaults to ./uploads)
- Files saved under: uploads/artifacts/{finding_id}/
- API returns relative file_path; use download endpoint to fetch files

## PATCH /findings/{id} accepted fields
- title
- risk_rating (Critical|High|Medium|Low|Informational)
- description
- impact
- references_url (must be http/https URL)
- poc_description
- review_status (Pending|In Review|Approved|Rejected)
- sla_status (On Track|At Risk|Overdue|null)
- issue_status (Open|Partially Closed|Closed)

## Notes
- Existing project read endpoint now includes artifacts in each finding response (artifacts: FindingArtifactRead[])
- JPEG recommended to avoid transparency issues encountered in DOCX generation.
