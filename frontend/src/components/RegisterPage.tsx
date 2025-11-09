import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
  InputAdornment,
  IconButton,
  LinearProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, PersonAdd } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    fullName: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password strength calculation
  const calculatePasswordStrength = (password: string): { score: number; label: string; color: 'error' | 'warning' | 'info' | 'success' } => {
    if (!password) return { score: 0, label: '', color: 'error' };
    
    let score = 0;
    
    // Length check
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;
    
    // Character variety checks
    if (/[a-z]/.test(password)) score += 15; // lowercase
    if (/[A-Z]/.test(password)) score += 15; // uppercase
    if (/[0-9]/.test(password)) score += 15; // digit
    if (/[^a-zA-Z0-9]/.test(password)) score += 15; // special char
    
    // Determine label and color
    if (score < 40) return { score, label: 'Weak', color: 'error' };
    if (score < 60) return { score, label: 'Fair', color: 'warning' };
    if (score < 80) return { score, label: 'Good', color: 'info' };
    return { score, label: 'Strong', color: 'success' };
  };

  const passwordStrength = calculatePasswordStrength(formData.password);

  // Check if password meets minimum requirements
  const passwordMeetsRequirements = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    digit: /[0-9]/.test(formData.password),
  };

  const allRequirementsMet = Object.values(passwordMeetsRequirements).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!allRequirementsMet) {
      setError('Password does not meet all requirements');
      return;
    }

    setLoading(true);

    try {
      // Register the user
      await register(formData.email, formData.username, formData.password, formData.fullName);
      
      // Auto-login after successful registration
      await login(formData.email, formData.password);
      
      // Redirect to dashboard
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2,
          }}
        >
          {/* Logo/Icon */}
          <Box
            sx={{
              mb: 2,
              p: 2,
              bgcolor: 'primary.main',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PersonAdd sx={{ fontSize: 40, color: 'white' }} />
          </Box>

          {/* Title */}
          <Typography component="h1" variant="h4" gutterBottom fontWeight="bold">
            Create Account
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Join VulnManager to track your security assessments
          </Typography>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Registration Form */}
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              disabled={loading}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Username"
              name="username"
              autoComplete="username"
              value={formData.username}
              onChange={(e) => handleChange('username', e.target.value)}
              disabled={loading}
              helperText="Used for login and display"
            />

            <TextField
              margin="normal"
              fullWidth
              id="fullName"
              label="Full Name"
              name="fullName"
              autoComplete="name"
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              disabled={loading}
              helperText="Optional"
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              disabled={loading}
              error={formData.password.length > 0 && !allRequirementsMet}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleTogglePasswordVisibility}
                      edge="end"
                      disabled={loading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Password Strength and Requirements */}
            {formData.password.length > 0 && (
              <Box sx={{ mt: 1, mb: 2 }}>
                {/* Password Strength Bar */}
                <Box sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Password Strength:
                    </Typography>
                    <Typography 
                      variant="caption" 
                      fontWeight="bold"
                      color={`${passwordStrength.color}.main`}
                    >
                      {passwordStrength.label}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={passwordStrength.score}
                    color={passwordStrength.color}
                    sx={{ height: 6, borderRadius: 1 }}
                  />
                </Box>

                {/* Password Requirements Checklist */}
                <Box sx={{ pl: 1 }}>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                    Password must contain:
                  </Typography>
                  <Typography 
                    variant="caption" 
                    display="block" 
                    color={passwordMeetsRequirements.length ? 'success.main' : 'text.secondary'}
                  >
                    {passwordMeetsRequirements.length ? '✓' : '○'} At least 8 characters
                  </Typography>
                  <Typography 
                    variant="caption" 
                    display="block" 
                    color={passwordMeetsRequirements.uppercase ? 'success.main' : 'text.secondary'}
                  >
                    {passwordMeetsRequirements.uppercase ? '✓' : '○'} One uppercase letter (A-Z)
                  </Typography>
                  <Typography 
                    variant="caption" 
                    display="block" 
                    color={passwordMeetsRequirements.lowercase ? 'success.main' : 'text.secondary'}
                  >
                    {passwordMeetsRequirements.lowercase ? '✓' : '○'} One lowercase letter (a-z)
                  </Typography>
                  <Typography 
                    variant="caption" 
                    display="block" 
                    color={passwordMeetsRequirements.digit ? 'success.main' : 'text.secondary'}
                  >
                    {passwordMeetsRequirements.digit ? '✓' : '○'} One number (0-9)
                  </Typography>
                </Box>
              </Box>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={loading || !formData.email || !formData.username || !formData.password || !allRequirementsMet}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            {/* Login Link */}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Already have an account?{' '}
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => navigate('/login')}
                  sx={{ cursor: 'pointer', textDecoration: 'none' }}
                  type="button"
                >
                  Sign in
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Footer */}
        <Typography
          variant="body2"
          color="white"
          align="center"
          sx={{ mt: 3, opacity: 0.8 }}
        >
          © {new Date().getFullYear()} VulnManager. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
};

export default RegisterPage;
