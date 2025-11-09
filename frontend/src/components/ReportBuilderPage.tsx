// frontend/src/components/ReportBuilderPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormLabel,
  RadioGroup,
  Radio,
  Checkbox,
  ListItemText,
  Button,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Grid,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Email as EmailIcon,
  Preview as PreviewIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Palette as PaletteIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import ReportService, { ReportGenerationRequest } from '../services/ReportService';
import CustomTemplateService, { CustomReportTemplate } from '../services/CustomTemplateService';

interface Project {
  id: number;
  name: string;
}

const TEMPLATE_TYPES = [
  { value: 'Executive Summary', label: 'Executive Summary', description: 'High-level overview with KPIs and risk metrics ✅ Available' },
  { value: 'Technical Findings', label: 'Technical Findings', description: 'Detailed technical vulnerability analysis ✅ Available' },
  { value: 'Risk Assessment', label: 'Risk Assessment', description: 'Comprehensive risk scoring and prioritization ✅ Available' },
  { value: 'Custom Template', label: '🎨 Custom Template', description: 'Use your own custom-designed report template ✅ Available' },
  { value: 'Remediation Status', label: 'Remediation Status', description: '🚧 Coming Soon - Current status of vulnerability fixes' },
  { value: 'Portfolio Overview', label: 'Portfolio Overview', description: '🚧 Coming Soon - Multi-project security posture summary' },
  { value: 'Compliance - OWASP Top 10', label: 'OWASP Compliance', description: '🚧 Coming Soon - OWASP Top 10 compliance mapping' },
  { value: 'Compliance - CWE Top 25', label: 'CWE Compliance', description: '🚧 Coming Soon - CWE Top 25 compliance mapping' },
  { value: 'Compliance - MITRE ATT&CK', label: 'MITRE ATT&CK', description: '🚧 Coming Soon - ATT&CK framework coverage report' },
  { value: 'Compliance - SLA Report', label: 'SLA Compliance', description: '🚧 Coming Soon - SLA adherence and deadline tracking' },
];

const FORMATS = [
  { value: 'html', label: 'HTML', description: 'Interactive web-based report', icon: '🌐' },
  { value: 'pdf', label: 'PDF', description: 'Print-ready portable document', icon: '📄' },
  { value: 'docx', label: 'Word', description: 'Editable Microsoft Word document', icon: '📝' },
];

const ReportBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [customTemplates, setCustomTemplates] = useState<CustomReportTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [templateType, setTemplateType] = useState('Executive Summary');
  const [customTemplateId, setCustomTemplateId] = useState<number | null>(null);
  const [format, setFormat] = useState('html');
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailCc, setEmailCc] = useState('');
  const [emailBcc, setEmailBcc] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  
  // Email settings check
  const [hasEmailSettings, setHasEmailSettings] = useState(false);

  useEffect(() => {
    loadProjects();
    loadCustomTemplates();
    checkEmailSettings();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/projects/');
      const data = await response.json();
      setProjects(data.filter((p: any) => !p.is_archived));
    } catch (err) {
      setError('Failed to load projects');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomTemplates = async () => {
    try {
      const templates = await CustomTemplateService.listTemplates();
      setCustomTemplates(templates);
    } catch (err) {
      console.error('Failed to load custom templates:', err);
    }
  };

  const checkEmailSettings = async () => {
    try {
      const settings = await ReportService.getEmailSettings();
      setHasEmailSettings(settings !== null && settings.is_active);
    } catch (err) {
      console.error('Failed to check email settings:', err);
    }
  };

  const handleGenerate = async (preview: boolean = false) => {
    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate template availability
      const availableTemplates = ['Executive Summary', 'Technical Findings', 'Risk Assessment', 'Custom Template'];
      if (!availableTemplates.includes(templateType)) {
        setError('Selected template is not yet available. Please choose Executive Summary, Technical Findings, Risk Assessment, or Custom Template.');
        setGenerating(false);
        return;
      }

      // Validate custom template selection
      if (templateType === 'Custom Template' && !customTemplateId) {
        setError('Please select a custom template');
        setGenerating(false);
        return;
      }

      // Validate email fields if sending email
      if (sendEmail && !hasEmailSettings) {
        setError('Email settings not configured. Please configure email settings first.');
        setGenerating(false);
        return;
      }

      if (sendEmail && !emailTo.trim()) {
        setError('Please enter at least one recipient email address');
        setGenerating(false);
        return;
      }

      // Parse email addresses
      const parseEmails = (emails: string): string[] => {
        return emails
          .split(',')
          .map(e => e.trim())
          .filter(e => e.length > 0);
      };

      const request: ReportGenerationRequest = {
        template_type: templateType,
        format: format,
        project_ids: selectedProjects.length > 0 ? selectedProjects : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        send_email: sendEmail,
        email_to: sendEmail ? parseEmails(emailTo) : undefined,
        email_cc: sendEmail && emailCc ? parseEmails(emailCc) : undefined,
        email_bcc: sendEmail && emailBcc ? parseEmails(emailBcc) : undefined,
        email_subject: sendEmail && emailSubject ? emailSubject : undefined,
        custom_template_id: templateType === 'Custom Template' ? customTemplateId || undefined : undefined,
      };

      // Use axios directly to get access to response headers for both email and download
      const axios = (await import('axios')).default;
      const axiosResponse = await axios.post(
        '/api/reports/generate',
        request,
        { responseType: sendEmail ? 'json' : 'blob' }
      );

      if (sendEmail) {
        // Response is JSON when email is sent
        const result = axiosResponse.data;
        if (result.success) {
          setSuccess(result.message || 'Report generated and emailed successfully!');
        } else {
          setError(result.message || 'Failed to generate report');
        }
      } else {
        // Response is a Blob
        const blob = axiosResponse.data as Blob;
        // If previewing HTML, coerce Blob type to text/html and open in a new tab without download
        if (preview && format === 'html') {
          const htmlBlob = new Blob([blob], { type: 'text/html;charset=utf-8' });
          const previewUrl = window.URL.createObjectURL(htmlBlob);
          window.open(previewUrl, '_blank');
          // Revoke the object URL after some time to avoid breaking the new tab
          setTimeout(() => window.URL.revokeObjectURL(previewUrl), 60_000);
          setSuccess('Preview opened in a new tab.');
          return;
        }

        // Otherwise, trigger a download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Try to get filename from Content-Disposition header
        let filename = '';
        const disposition = axiosResponse.headers['content-disposition'];
        if (disposition && disposition.indexOf('filename=') !== -1) {
          filename = disposition.split('filename=')[1].replace(/['"]/g, '');
        } else {
          // fallback
          const extension = format.toLowerCase();
          const timestamp = new Date().toISOString().split('T')[0];
          filename = `${templateType}_${timestamp}.${extension}`;
        }
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setSuccess('Report generated and downloaded successfully!');
      }
    } catch (err: any) {
      console.error('Error generating report:', err);
      setError(err.response?.data?.detail || 'Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const selectedTemplate = TEMPLATE_TYPES.find(t => t.value === templateType);
  const selectedFormat = FORMATS.find(f => f.value === format);

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <DownloadIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Report Builder
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Generate professional security assessment reports
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Configure Email Settings">
            <IconButton onClick={() => navigate('/settings/email')} color="primary">
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Customize Branding">
            <IconButton onClick={() => navigate('/settings/branding')} color="primary">
              <PaletteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Column - Configuration */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Report Configuration
            </Typography>
            <Divider sx={{ mb: 3 }} />

            {/* Template Selection */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Report Template</InputLabel>
              <Select
                value={templateType}
                label="Report Template"
                onChange={(e) => setTemplateType(e.target.value)}
              >
                {TEMPLATE_TYPES.map((template) => (
                  <MenuItem key={template.value} value={template.value}>
                    <Box>
                      <Typography variant="body1">{template.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {template.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Custom Template Selector - only shown when Custom Template is selected */}
            {templateType === 'Custom Template' && (
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Select Custom Template</InputLabel>
                <Select
                  value={customTemplateId || ''}
                  label="Select Custom Template"
                  onChange={(e) => setCustomTemplateId(e.target.value as number)}
                  required
                >
                  {customTemplates.length === 0 ? (
                    <MenuItem disabled>
                      <Typography variant="body2" color="text.secondary">
                        No custom templates available. Create one in the Templates page.
                      </Typography>
                    </MenuItem>
                  ) : (
                    customTemplates.map((template) => (
                      <MenuItem key={template.id} value={template.id}>
                        <Box>
                          <Typography variant="body1">{template.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {template.description || 'No description'} • {JSON.parse(template.template_json).sections.length} sections • Used {template.usage_count} times
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))
                  )}
                </Select>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, ml: 1 }}>
                  Can't find your template? <a href="/custom-templates" style={{ color: 'inherit', textDecoration: 'underline' }}>Create a new one</a>
                </Typography>
              </FormControl>
            )}

            {/* Format Selection */}
            <FormControl component="fieldset" sx={{ mb: 3 }}>
              <FormLabel component="legend">Output Format</FormLabel>
              <RadioGroup
                row
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                {FORMATS.map((fmt) => (
                  <FormControlLabel
                    key={fmt.value}
                    value={fmt.value}
                    control={<Radio />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>{fmt.icon}</span>
                        <Box>
                          <Typography variant="body2">{fmt.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {fmt.description}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                ))}
              </RadioGroup>
            </FormControl>

            {/* Project Selection */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Projects (Leave empty for all)</InputLabel>
              <Select
                multiple
                value={selectedProjects}
                label="Projects (Leave empty for all)"
                onChange={(e) => setSelectedProjects(e.target.value as number[])}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">All Projects</Typography>
                    ) : (
                      selected.map((id) => {
                        const project = projects.find(p => p.id === id);
                        return project ? (
                          <Chip key={id} label={project.name} size="small" />
                        ) : null;
                      })
                    )}
                  </Box>
                )}
              >
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    <Checkbox checked={selectedProjects.indexOf(project.id) > -1} />
                    <ListItemText primary={project.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Date Range */}
            <Accordion sx={{ mb: 3 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Date Range Filter (Optional)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Start Date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="End Date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Email Delivery */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmailIcon />
                  <Typography>Email Delivery</Typography>
                  {!hasEmailSettings && (
                    <Chip label="Not Configured" size="small" color="warning" />
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <FormControlLabel
                  control={
                    <Switch
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      disabled={!hasEmailSettings}
                    />
                  }
                  label="Send report via email"
                />

                {!hasEmailSettings && (
                  <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                    Email settings not configured.{' '}
                    <Button size="small" onClick={() => navigate('/settings/email')}>
                      Configure Now
                    </Button>
                  </Alert>
                )}

                {sendEmail && hasEmailSettings && (
                  <Box sx={{ mt: 2 }}>
                    <TextField
                      fullWidth
                      label="To (comma-separated)"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      placeholder="user1@example.com, user2@example.com"
                      sx={{ mb: 2 }}
                      required
                    />
                    <TextField
                      fullWidth
                      label="CC (comma-separated, optional)"
                      value={emailCc}
                      onChange={(e) => setEmailCc(e.target.value)}
                      placeholder="manager@example.com"
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="BCC (comma-separated, optional)"
                      value={emailBcc}
                      onChange={(e) => setEmailBcc(e.target.value)}
                      placeholder="audit@example.com"
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Subject (optional)"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Security Assessment Report"
                    />
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          </Paper>
        </Grid>

        {/* Right Column - Preview & Actions */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Report Preview
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Template
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {selectedTemplate?.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {selectedTemplate?.description}
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Format
              </Typography>
              <Chip
                label={`${selectedFormat?.icon} ${selectedFormat?.label}`}
                color="primary"
                variant="outlined"
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Scope
              </Typography>
              <Typography variant="body1">
                {selectedProjects.length === 0
                  ? `All Projects (${projects.length})`
                  : `${selectedProjects.length} Selected Project${selectedProjects.length !== 1 ? 's' : ''}`}
              </Typography>
            </Box>

            {(startDate || endDate) && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Date Range
                </Typography>
                <Typography variant="body2">
                  {startDate || 'Beginning'} → {endDate || 'Present'}
                </Typography>
              </Box>
            )}

            {sendEmail && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Delivery
                </Typography>
                <Chip icon={<EmailIcon />} label="Email Enabled" color="success" size="small" />
              </Box>
            )}

            <Divider sx={{ mb: 3 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {format === 'html' && (
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<PreviewIcon />}
                  onClick={() => handleGenerate(true)}
                  disabled={generating}
                >
                  Preview
                </Button>
              )}
              
              <Button
                fullWidth
                variant="contained"
                startIcon={sendEmail ? <EmailIcon /> : <DownloadIcon />}
                onClick={() => handleGenerate(false)}
                disabled={generating}
                size="large"
              >
                {generating ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Generating...
                  </>
                ) : sendEmail ? (
                  'Generate & Email'
                ) : (
                  'Generate & Download'
                )}
              </Button>
            </Box>

            <Alert severity="info" sx={{ mt: 3 }} icon={<HelpIcon />}>
              <Typography variant="caption">
                Reports are generated with your custom branding and current data.
                Configure branding in settings for a professional appearance.
              </Typography>
            </Alert>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReportBuilderPage;
