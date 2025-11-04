/** @jsxRuntime classic */
/** @jsx React.createElement */
/** @jsxFrag React.Fragment */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Chip,
  IconButton,
  Paper,
  Stack,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocalOffer as TagIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import axios from 'axios';

interface Tag {
  id: number;
  name: string;
  color: string;
  description: string | null;
  created_at: string;
  usage_count: number;
}

const TagManager: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [color, setColor] = useState('#2196F3');
  const [description, setDescription] = useState('');
  
  // Snackbar state
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/tags');
      setTags(response.data);
    } catch (err: any) {
      setError('Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (tag?: Tag) => {
    if (tag) {
      setEditingTag(tag);
      setName(tag.name);
      setColor(tag.color);
      setDescription(tag.description || '');
    } else {
      setEditingTag(null);
      setName('');
      setColor('#2196F3');
      setDescription('');
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingTag(null);
    setName('');
    setColor('#2196F3');
    setDescription('');
  };

  const handleSubmit = async () => {
    try {
      if (editingTag) {
        // Update tag
        await axios.patch(`/api/tags/${editingTag.id}`, {
          name: name !== editingTag.name ? name : undefined,
          color: color !== editingTag.color ? color : undefined,
          description: description !== editingTag.description ? description : undefined,
        });
        setSuccessMessage('Tag updated successfully');
      } else {
        // Create tag
        await axios.post('/api/tags', { name, color, description });
        setSuccessMessage('Tag created successfully');
      }
      handleCloseDialog();
      fetchTags();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save tag');
    }
  };

  const handleDelete = async (tag: Tag) => {
    if (!window.confirm(`Delete tag "${tag.name}"? This will remove it from all ${tag.usage_count} finding(s).`)) {
      return;
    }

    try {
      await axios.delete(`/api/tags/${tag.id}`);
      setSuccessMessage('Tag deleted successfully');
      fetchTags();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete tag');
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Tag',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Chip
          label={params.row.name}
          size="small"
          sx={{
            backgroundColor: params.row.color,
            color: '#fff',
            fontWeight: 'bold',
          }}
        />
      ),
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 2,
      minWidth: 300,
    },
    {
      field: 'usage_count',
      headerName: 'Usage',
      width: 100,
      align: 'center',
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="bold">
          {params.row.usage_count}
        </Typography>
      ),
    },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 180,
      valueFormatter: (params) => new Date(params.value).toLocaleDateString(),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleOpenDialog(params.row)}
            title="Edit tag"
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDelete(params.row)}
            color="error"
            title="Delete tag"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TagIcon /> Tag Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create and manage tags to organize your findings
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            New Tag
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={tags}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
          }}
          disableRowSelectionOnClick
        />
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTag ? 'Edit Tag' : 'Create New Tag'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              inputProps={{ maxLength: 50 }}
              helperText={`${name.length}/50 characters`}
            />
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Color
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  style={{ width: 60, height: 40, border: 'none', cursor: 'pointer' }}
                />
                <TextField
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  size="small"
                  sx={{ width: 100 }}
                />
                <Chip
                  label={name || 'Preview'}
                  sx={{
                    backgroundColor: color,
                    color: '#fff',
                    fontWeight: 'bold',
                  }}
                />
              </Stack>
            </Box>

            <TextField
              label="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              inputProps={{ maxLength: 200 }}
              helperText={`${description.length}/200 characters`}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!name.trim()}>
            {editingTag ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccessMessage(null)} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TagManager;
