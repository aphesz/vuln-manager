import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  Divider,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { RiskRating, IssueStatus } from '../types';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  projectId: number;
}

export interface ExportOptions {
  format: 'excel' | 'csv' | 'json' | 'markdown' | 'docx' | 'pdf';
  columns: string[];
  filters: {
    risk?: RiskRating[];
    issueStatus?: IssueStatus[];
    reviewStatus?: string[];
  };
}

// All available columns for export
const AVAILABLE_COLUMNS = [
  { key: 'title', label: 'Title', defaultChecked: true },
  { key: 'risk_rating', label: 'Risk Rating', defaultChecked: true },
  { key: 'description', label: 'Description', defaultChecked: true },
  { key: 'remediation', label: 'Remediation', defaultChecked: true },
  { key: 'instance_count', label: 'Instance Count', defaultChecked: true },
  { key: 'review_status', label: 'Review Status', defaultChecked: false },
  { key: 'reviewer_name', label: 'Reviewer', defaultChecked: false },
  { key: 'jira_issue_key', label: 'Jira Issue', defaultChecked: false },
  { key: 'jira_status', label: 'Jira Status', defaultChecked: false },
  { key: 'remediation_deadline', label: 'Deadline', defaultChecked: false },
  { key: 'sla_status', label: 'SLA Status', defaultChecked: false },
  { key: 'remediation_owner', label: 'Owner', defaultChecked: false },
  { key: 'issue_status', label: 'Issue Status', defaultChecked: false },
];

const RISK_LEVELS: RiskRating[] = ['Critical', 'High', 'Medium', 'Low', 'Informational'];
const ISSUE_STATUSES: IssueStatus[] = ['Open', 'Partially Closed', 'Closed'];
const REVIEW_STATUSES = ['Pending', 'In Review', 'Approved', 'Rejected'];

// Risk level colors matching the dashboard
const RISK_COLORS: Record<RiskRating, { bg: string; text: string }> = {
  Critical: { bg: '#d32f2f', text: '#ffffff' },
  High: { bg: '#f57c00', text: '#ffffff' },
  Medium: { bg: '#fbc02d', text: '#000000' },
  Low: { bg: '#388e3c', text: '#ffffff' },
  Informational: { bg: '#1976d2', text: '#ffffff' },
};

export default function ExportDialog({ open, onClose, onExport, projectId }: ExportDialogProps) {
  const [format, setFormat] = useState<'excel' | 'csv' | 'json' | 'markdown' | 'docx' | 'pdf'>('excel');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    AVAILABLE_COLUMNS.filter(c => c.defaultChecked).map(c => c.key)
  );
  const [riskFilter, setRiskFilter] = useState<RiskRating[]>([]);
  const [issueStatusFilter, setIssueStatusFilter] = useState<IssueStatus[]>([]);
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string[]>([]);

  const handleColumnToggle = (columnKey: string) => {
    setSelectedColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(k => k !== columnKey)
        : [...prev, columnKey]
    );
  };

  const handleSelectAllColumns = () => {
    setSelectedColumns(AVAILABLE_COLUMNS.map(c => c.key));
  };

  const handleDeselectAllColumns = () => {
    setSelectedColumns([]);
  };

  const handleRiskFilterToggle = (risk: RiskRating) => {
    setRiskFilter(prev =>
      prev.includes(risk)
        ? prev.filter(r => r !== risk)
        : [...prev, risk]
    );
  };

  const handleIssueStatusToggle = (status: IssueStatus) => {
    setIssueStatusFilter(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleReviewStatusToggle = (status: string) => {
    setReviewStatusFilter(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleExport = () => {
    const options: ExportOptions = {
      format,
      columns: selectedColumns,
      filters: {
        risk: riskFilter.length > 0 ? riskFilter : undefined,
        issueStatus: issueStatusFilter.length > 0 ? issueStatusFilter : undefined,
        reviewStatus: reviewStatusFilter.length > 0 ? reviewStatusFilter : undefined,
      },
    };
    onExport(options);
    onClose();
  };

  const handleReset = () => {
    setFormat('excel');
    setSelectedColumns(AVAILABLE_COLUMNS.filter(c => c.defaultChecked).map(c => c.key));
    setRiskFilter([]);
    setIssueStatusFilter([]);
    setReviewStatusFilter([]);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Export Findings</DialogTitle>
      <DialogContent dividers>
        {/* Format Selection */}
        <FormControl component="fieldset" sx={{ mb: 3 }}>
          <FormLabel component="legend">Export Format</FormLabel>
          <RadioGroup
            value={format}
            onChange={(e) => setFormat(e.target.value as 'excel' | 'csv' | 'json' | 'markdown' | 'docx' | 'pdf')}
          >
            <FormControlLabel value="excel" control={<Radio />} label="Excel (.xlsx) - Spreadsheet with data analysis" />
            <FormControlLabel value="csv" control={<Radio />} label="CSV (.csv) - Simple tabular format" />
            <FormControlLabel value="json" control={<Radio />} label="JSON (.json) - Full data with metadata" />
            <FormControlLabel value="markdown" control={<Radio />} label="Markdown (.md) - Formatted documentation" />
            <FormControlLabel value="docx" control={<Radio />} label="Word Document (.docx) - Professional report" />
            <FormControlLabel value="pdf" control={<Radio />} label="PDF (.pdf) - Print-ready report" />
          </RadioGroup>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            {format === 'json' && '💡 Best for: API integrations, automated processing, CI/CD pipelines'}
            {format === 'markdown' && '💡 Best for: GitHub/GitLab wikis, technical documentation, sharing with developers'}
            {format === 'excel' && '💡 Best for: Data analysis, pivot tables, charts, and custom filtering'}
            {format === 'csv' && '💡 Best for: Importing into other tools, simple spreadsheets, universal compatibility'}
            {format === 'docx' && '💡 Best for: Client deliverables, executive reports, editable documents'}
            {format === 'pdf' && '💡 Best for: Final reports, presentations, printing, email distribution'}
          </Typography>
        </FormControl>

        <Divider sx={{ my: 2 }} />

        {/* Column Selection - Only show for data formats */}
        {['excel', 'csv', 'json', 'markdown'].includes(format) && (
          <>
            <FormControl component="fieldset" sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <FormLabel component="legend">Select Columns</FormLabel>
                <Box>
                  <Button size="small" onClick={handleSelectAllColumns}>
                    Select All
                  </Button>
                  <Button size="small" onClick={handleDeselectAllColumns}>
                    Deselect All
                  </Button>
                </Box>
              </Box>
              <FormGroup>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                  {AVAILABLE_COLUMNS.map(col => (
                    <FormControlLabel
                      key={col.key}
                      control={
                        <Checkbox
                          checked={selectedColumns.includes(col.key)}
                          onChange={() => handleColumnToggle(col.key)}
                        />
                      }
                      label={col.label}
                    />
                  ))}
                </Box>
          </FormGroup>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            {selectedColumns.length} column{selectedColumns.length !== 1 ? 's' : ''} selected
          </Typography>
        </FormControl>

            <Divider sx={{ my: 2 }} />
          </>
        )}

        {/* Filters - Only show for data formats */}
        {['excel', 'csv', 'json', 'markdown'].includes(format) && (
          <>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Filters (optional - leave empty to export all)
            </Typography>

            {/* Risk Filter */}
            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <FormLabel component="legend">Risk Rating</FormLabel>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {RISK_LEVELS.map(risk => (
                  <Chip
                    key={risk}
                    label={risk}
                    onClick={() => handleRiskFilterToggle(risk)}
                    variant={riskFilter.includes(risk) ? 'filled' : 'outlined'}
                    sx={{
                      backgroundColor: riskFilter.includes(risk) 
                        ? RISK_COLORS[risk].bg 
                        : 'transparent',
                      color: riskFilter.includes(risk) 
                        ? RISK_COLORS[risk].text 
                        : RISK_COLORS[risk].bg,
                      borderColor: RISK_COLORS[risk].bg,
                      '&:hover': {
                        backgroundColor: riskFilter.includes(risk)
                          ? RISK_COLORS[risk].bg
                          : `${RISK_COLORS[risk].bg}20`,
                      },
                    }}
                  />
                ))}
              </Box>
            </FormControl>

            {/* Issue Status Filter */}
            <FormControl component="fieldset" sx={{ mb: 2 }}>
          <FormLabel component="legend">Issue Status</FormLabel>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {ISSUE_STATUSES.map(status => (
              <Chip
                key={status}
                label={status}
                onClick={() => handleIssueStatusToggle(status)}
                color={issueStatusFilter.includes(status) ? 'primary' : 'default'}
                variant={issueStatusFilter.includes(status) ? 'filled' : 'outlined'}
              />
            ))}
          </Box>
        </FormControl>

            {/* Review Status Filter */}
            <FormControl component="fieldset">
              <FormLabel component="legend">Review Status</FormLabel>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {REVIEW_STATUSES.map(status => (
                  <Chip
                    key={status}
                    label={status}
                    onClick={() => handleReviewStatusToggle(status)}
                    color={reviewStatusFilter.includes(status) ? 'primary' : 'default'}
                    variant={reviewStatusFilter.includes(status) ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </FormControl>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleReset}>Reset</Button>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleExport}
          variant="contained"
          startIcon={<DownloadIcon />}
          disabled={['excel', 'csv', 'json', 'markdown'].includes(format) && selectedColumns.length === 0}
        >
          Export
        </Button>
      </DialogActions>
    </Dialog>
  );
}
