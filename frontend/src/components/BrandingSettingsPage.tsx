// frontend/src/components/BrandingSettingsPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Grid,
  InputAdornment,
  Card,
  CardContent,
} from '@mui/material';
import {
  Save as SaveIcon,
  Palette as PaletteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import PageBreadcrumbs from './PageBreadcrumbs';
import ReportService, { ReportBranding } from '../services/ReportService';

const BrandingSettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1976d2');
  const [secondaryColor, setSecondaryColor] = useState('#dc004e');
  const [footerText, setFooterText] = useState('');

  useEffect(() => {
    loadBranding();
  }, []);

  const loadBranding = async () => {
    setLoading(true);
    setError(null);
    try {
      const branding = await ReportService.getBranding();
      if (branding) {
        setCompanyName(branding.company_name || '');
        setCompanyAddress(branding.company_address || '');
        setCompanyPhone(branding.company_phone || '');
        setCompanyEmail(branding.company_email || '');
        setCompanyWebsite(branding.company_website || '');
        setPrimaryColor(branding.primary_color || '#1976d2');
        setSecondaryColor(branding.secondary_color || '#dc004e');
        setFooterText(branding.footer_text || '');
      }
    } catch (err) {
      console.error('Failed to load branding:', err);
      setError('Failed to load branding settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const branding: Partial<ReportBranding> = {
        company_name: companyName || undefined,
        company_address: companyAddress || undefined,
        company_phone: companyPhone || undefined,
        company_email: companyEmail || undefined,
        company_website: companyWebsite || undefined,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        footer_text: footerText || undefined,
      };

      await ReportService.updateBranding(branding);
      setSuccess('Branding settings saved successfully!');
      
      // Reload to get updated timestamps
      setTimeout(() => loadBranding(), 1000);
    } catch (err: any) {
      console.error('Failed to save branding:', err);
      setError(err.response?.data?.detail || 'Failed to save branding settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPrimaryColor('#1976d2');
    setSecondaryColor('#dc004e');
  };

  if (loading) {
    return (
      <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <PageBreadcrumbs />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <PaletteIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Report Branding
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Customize the appearance of your security reports
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)} icon={<CheckIcon />}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Column - Configuration */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Company Information
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Company Name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your Company Name"
                  helperText="Displayed in report headers"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  placeholder="123 Security Street, City, State 12345"
                  multiline
                  rows={2}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  placeholder="security@company.com"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Website"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  placeholder="https://www.company.com"
                />
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Color Scheme
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Primary Color
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      style={{
                        width: '80px',
                        height: '50px',
                        border: '2px solid #ddd',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    />
                    <TextField
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      size="small"
                      InputProps={{
                        startAdornment: <InputAdornment position="start">#</InputAdornment>,
                      }}
                      inputProps={{
                        maxLength: 7,
                        style: { textTransform: 'uppercase' }
                      }}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Used for headers, buttons, and accents
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Secondary Color
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      style={{
                        width: '80px',
                        height: '50px',
                        border: '2px solid #ddd',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    />
                    <TextField
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      size="small"
                      InputProps={{
                        startAdornment: <InputAdornment position="start">#</InputAdornment>,
                      }}
                      inputProps={{
                        maxLength: 7,
                        style: { textTransform: 'uppercase' }
                      }}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Used for highlights and emphasis
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleReset}
                  size="small"
                >
                  Reset to Default Colors
                </Button>
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Footer
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <TextField
              fullWidth
              label="Footer Text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="Confidential - Security Assessment Report"
              helperText="Displayed at the bottom of every report"
              multiline
              rows={2}
            />
          </Paper>
        </Grid>

        {/* Right Column - Preview */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Preview
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Card sx={{ mb: 3, border: '1px solid #e0e0e0' }}>
              <Box
                sx={{
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
                  color: 'white',
                  p: 2,
                  textAlign: 'center',
                }}
              >
                <Typography variant="h6" fontWeight="bold">
                  {companyName || 'Company Name'}
                </Typography>
                <Typography variant="caption">
                  Security Assessment Report
                </Typography>
              </Box>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {companyAddress || 'Company Address'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {companyPhone || 'Phone'} • {companyEmail || 'Email'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {companyWebsite || 'Website'}
                </Typography>
                
                <Box sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="body2" fontWeight="bold" sx={{ color: primaryColor }}>
                    Sample Content
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Your reports will use these colors and branding
                  </Typography>
                </Box>
              </CardContent>
              <Box
                sx={{
                  backgroundColor: '#333',
                  color: '#ccc',
                  p: 1.5,
                  textAlign: 'center',
                }}
              >
                <Typography variant="caption">
                  {footerText || 'Footer Text'}
                </Typography>
              </Box>
            </Card>

            <Alert severity="info" sx={{ mb: 2 }}>
              Changes will apply to all newly generated reports
            </Alert>

            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Branding'}
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BrandingSettingsPage;
