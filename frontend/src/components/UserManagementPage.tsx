import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  TextField,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  AdminPanelSettings as AdminIcon,
  Assessment as AnalystIcon,
  Visibility as ViewerIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useAuth } from '../contexts/AuthContext';
import UserEditDialog from './UserEditDialog';

interface User {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
  role: 'admin' | 'analyst' | 'viewer';
  is_active: boolean;
  created_at: string;
}

const UserManagementPage: React.FC = () => {
  const { api } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = () => {
    setSelectedUser(null);
    setDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleDeleteUser = async (userId: number) => {
    if (deleteConfirmId !== userId) {
      setDeleteConfirmId(userId);
      setTimeout(() => setDeleteConfirmId(null), 3000); // Reset after 3s
      return;
    }

    try {
      await api.delete(`/users/${userId}`);
      setUsers(users.filter((u) => u.id !== userId));
      setDeleteConfirmId(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleDialogClose = (updated: boolean) => {
    setDialogOpen(false);
    setSelectedUser(null);
    if (updated) {
      fetchUsers(); // Refresh the list
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <AdminIcon fontSize="small" />;
      case 'analyst':
        return <AnalystIcon fontSize="small" />;
      case 'viewer':
        return <ViewerIcon fontSize="small" />;
      default:
        return <ViewerIcon fontSize="small" />;
    }
  };

  const getRoleColor = (role: string): 'error' | 'primary' | 'default' => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'analyst':
        return 'primary';
      case 'viewer':
      default:
        return 'default';
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: 'ID',
      width: 70,
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'username',
      headerName: 'Username',
      width: 150,
    },
    {
      field: 'full_name',
      headerName: 'Full Name',
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => params.value || '—',
    },
    {
      field: 'role',
      headerName: 'Role',
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          icon={getRoleIcon(params.value as string)}
          label={params.value}
          color={getRoleColor(params.value as string)}
          size="small"
          sx={{ textTransform: 'capitalize' }}
        />
      ),
    },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 180,
      renderCell: (params: GridRenderCellParams) => {
        if (!params.value) return '—';
        try {
          return new Date(params.value as string).toLocaleString();
        } catch (e) {
          return 'Invalid Date';
        }
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams) => {
        const user = params.row as User;
        return (
          <Box>
            <Tooltip title="Edit User">
              <IconButton
                size="small"
                color="primary"
                onClick={() => handleEditUser(user)}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={deleteConfirmId === user.id ? 'Click again to confirm' : 'Delete User'}>
              <IconButton
                size="small"
                color={deleteConfirmId === user.id ? 'error' : 'default'}
                onClick={() => handleDeleteUser(user.id)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            User Management
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchUsers}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateUser}
            >
              Create User
            </Button>
          </Box>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Search Bar */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Search by email, username, or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Paper>

        {/* Data Table */}
        <Paper sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={filteredUsers}
            columns={columns}
            loading={loading}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 25, page: 0 },
              },
            }}
            disableRowSelectionOnClick
            sx={{
              '& .MuiDataGrid-cell:focus': {
                outline: 'none',
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          />
        </Paper>
      </Box>

      {/* Create/Edit Dialog */}
      <UserEditDialog
        open={dialogOpen}
        user={selectedUser}
        onClose={handleDialogClose}
      />
    </Container>
  );
};

export default UserManagementPage;
