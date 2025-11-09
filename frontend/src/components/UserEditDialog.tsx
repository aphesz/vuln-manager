import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Box,
  Typography,
  LinearProgress,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
  role: 'admin' | 'analyst' | 'viewer';
  is_active: boolean;
}

interface UserEditDialogProps {
  open: boolean;
  user: User | null;
  onClose: (updated: boolean) => void;
}

const UserEditDialog: React.FC<UserEditDialogProps> = ({ open, user, onClose }) => {
  const { api } = useAuth();
  const isEdit = !!user;

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    full_name: '',
    password: '',
    role: 'viewer' as 'admin' | 'analyst' | 'viewer',
    is_active: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        username: user.username,
        full_name: user.full_name || '',
        password: '', // Password not pre-filled for security
        role: user.role,
        is_active: user.is_active,
      });
    } else {
      setFormData({
        email: '',
        username: '',
        full_name: '',
        password: '',
        role: 'viewer',
        is_active: true,
      });
    }
    setError(null);
    setShowPassword(false); // Reset password visibility on dialog open
  }, [user, open]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      if (isEdit) {
        // Update existing user
        const updateData: any = {
          email: formData.email,
          username: formData.username,
          full_name: formData.full_name || null,
          role: formData.role,
          is_active: formData.is_active,
        };

        // Only include password if provided
        if (formData.password) {
          updateData.password = formData.password;
        }

        await api.put(`/users/${user!.id}`, updateData);
      } else {
        // Create new user
        if (!formData.password) {
          setError('Password is required for new users');
          setLoading(false);
          return;
        }

        await api.post('/auth/register', {
          email: formData.email,
          username: formData.username,
          full_name: formData.full_name || null,
          password: formData.password,
          role: formData.role,
        });
      }

      onClose(true); // Updated successfully
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to ${isEdit ? 'update' : 'create'} user`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit User' : 'Create New User'}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            disabled={loading}
            required
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Username"
            value={formData.username}
            onChange={(e) => handleChange('username', e.target.value)}
            disabled={loading}
            required
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Full Name"
            value={formData.full_name}
            onChange={(e) => handleChange('full_name', e.target.value)}
            disabled={loading}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label={isEdit ? 'New Password (leave blank to keep current)' : 'Password'}
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            disabled={loading}
            required={!isEdit}
            error={!isEdit && formData.password.length > 0 && !allRequirementsMet}
            sx={{ mb: 1 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    onMouseDown={(e) => e.preventDefault()}
                    edge="end"
                    disabled={loading}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Password Requirements and Strength Indicator */}
          {(!isEdit || formData.password.length > 0) && (
            <Box sx={{ mb: 2 }}>
              {/* Password Strength Bar */}
              {formData.password.length > 0 && (
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
              )}

              {/* Password Requirements Checklist */}
              <Box sx={{ pl: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                  Password must contain:
                </Typography>
                <Typography 
                  variant="caption" 
                  display="block" 
                  color={passwordMeetsRequirements.length ? 'success.main' : 'text.secondary'}
                  sx={{ display: 'flex', alignItems: 'center' }}
                >
                  {passwordMeetsRequirements.length ? '✓' : '○'} At least 8 characters
                </Typography>
                <Typography 
                  variant="caption" 
                  display="block" 
                  color={passwordMeetsRequirements.uppercase ? 'success.main' : 'text.secondary'}
                  sx={{ display: 'flex', alignItems: 'center' }}
                >
                  {passwordMeetsRequirements.uppercase ? '✓' : '○'} One uppercase letter (A-Z)
                </Typography>
                <Typography 
                  variant="caption" 
                  display="block" 
                  color={passwordMeetsRequirements.lowercase ? 'success.main' : 'text.secondary'}
                  sx={{ display: 'flex', alignItems: 'center' }}
                >
                  {passwordMeetsRequirements.lowercase ? '✓' : '○'} One lowercase letter (a-z)
                </Typography>
                <Typography 
                  variant="caption" 
                  display="block" 
                  color={passwordMeetsRequirements.digit ? 'success.main' : 'text.secondary'}
                  sx={{ display: 'flex', alignItems: 'center' }}
                >
                  {passwordMeetsRequirements.digit ? '✓' : '○'} One number (0-9)
                </Typography>
              </Box>
            </Box>
          )}

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={formData.role}
              label="Role"
              onChange={(e) => handleChange('role', e.target.value)}
              disabled={loading}
            >
              <MenuItem value="viewer">Viewer - Read-only access</MenuItem>
              <MenuItem value="analyst">Analyst - Can create and edit findings</MenuItem>
              <MenuItem value="admin">Admin - Full system access</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={formData.is_active}
                onChange={(e) => handleChange('is_active', e.target.checked)}
                disabled={loading}
              />
            }
            label="Active"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={
            loading || 
            !formData.email || 
            !formData.username || 
            (!isEdit && (!formData.password || !allRequirementsMet))
          }
        >
          {loading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
              {isEdit ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            isEdit ? 'Update User' : 'Create User'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserEditDialog;
