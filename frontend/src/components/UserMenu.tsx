import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import {
  Person,
  Logout,
  AdminPanelSettings,
  Visibility,
  Assessment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const UserMenu: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    handleClose();
    navigate('/profile');
  };

  const handleLogout = async () => {
    handleClose();
    await logout();
    navigate('/login');
  };

  const handleAdminPanel = () => {
    handleClose();
    navigate('/admin/users');
  };

  if (!user) return null;

  // Get role icon
  const getRoleIcon = () => {
    switch (user.role) {
      case 'admin':
        return <AdminPanelSettings fontSize="small" />;
      case 'analyst':
        return <Assessment fontSize="small" />;
      case 'viewer':
        return <Visibility fontSize="small" />;
      default:
        return <Person fontSize="small" />;
    }
  };

  // Get role color
  const getRoleColor = () => {
    switch (user.role) {
      case 'admin':
        return 'error';
      case 'analyst':
        return 'primary';
      case 'viewer':
        return 'default';
      default:
        return 'default';
    }
  };

  // Get initials for avatar
  const getInitials = () => {
    if (user.full_name) {
      const names = user.full_name.split(' ');
      return names.length > 1
        ? `${names[0][0]}${names[1][0]}`.toUpperCase()
        : names[0][0].toUpperCase();
    }
    return user.username[0].toUpperCase();
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="small"
        sx={{ ml: 2 }}
        aria-controls={open ? 'user-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
      >
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: 'primary.main',
            fontSize: '0.9rem',
          }}
          src={user.avatar_url || undefined}
        >
          {getInitials()}
        </Avatar>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        id="user-menu"
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          elevation: 8,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
            mt: 1.5,
            minWidth: 240,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* User Info Header */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight="bold">
            {user.full_name || user.username}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mb: 0.5 }}
          >
            {user.email}
          </Typography>
          <Chip
            icon={getRoleIcon()}
            label={user.role.toUpperCase()}
            size="small"
            color={getRoleColor()}
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
        </Box>

        <Divider />

        {/* Profile Menu Item */}
        <MenuItem onClick={handleProfile}>
          <ListItemIcon>
            <Person fontSize="small" />
          </ListItemIcon>
          <ListItemText>My Profile</ListItemText>
        </MenuItem>

        {/* Admin Panel (admin only) */}
        {hasRole('admin') && (
          <MenuItem onClick={handleAdminPanel}>
            <ListItemIcon>
              <AdminPanelSettings fontSize="small" />
            </ListItemIcon>
            <ListItemText>User Management</ListItemText>
          </MenuItem>
        )}

        <Divider />

        {/* Logout */}
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default UserMenu;
