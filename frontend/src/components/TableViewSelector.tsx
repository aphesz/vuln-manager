import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import {
  ViewColumn as ViewColumnIcon,
  Security as SecurityIcon,
  Business as BusinessIcon,
  Code as CodeIcon,
  ViewList as ViewListIcon,
  Add as AddIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  RestartAlt as ResetIcon,
} from '@mui/icons-material';
import TablePreferencesService, { TablePreset } from '../services/TablePreferencesService';

interface TableViewSelectorProps {
  onPresetChange: (preset: TablePreset | null) => void;
}

export default function TableViewSelector({ onPresetChange }: TableViewSelectorProps) {
  const prefsService = TablePreferencesService.getInstance();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activePreset, setActivePreset] = useState<TablePreset | null>(
    prefsService.getActivePreset()
  );
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handlePresetSelect = (preset: TablePreset | null) => {
    setActivePreset(preset);
    prefsService.setActivePreset(preset?.id || null);
    onPresetChange(preset);
    handleMenuClose();
  };

  const handleSaveCurrentView = () => {
    setSaveDialogOpen(true);
    handleMenuClose();
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      return;
    }

    // Get current table configuration from the parent
    // For now, we'll create a basic preset
    const newPreset = prefsService.createPreset({
      name: presetName,
      description: presetDescription,
      visibleColumns: activePreset?.visibleColumns || [],
      density: 'standard',
    });

    setActivePreset(newPreset);
    prefsService.setActivePreset(newPreset.id);
    onPresetChange(newPreset);
    
    setSaveDialogOpen(false);
    setPresetName('');
    setPresetDescription('');
  };

  const handleExportPreferences = () => {
    const json = prefsService.exportPreferences();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'table-preferences.json';
    a.click();
    URL.revokeObjectURL(url);
    handleMenuClose();
  };

  const handleImportPreferences = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            prefsService.importPreferences(event.target?.result as string);
            setActivePreset(prefsService.getActivePreset());
            alert('Preferences imported successfully!');
          } catch (error) {
            alert(`Failed to import preferences: ${error}`);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
    handleMenuClose();
  };

  const handleResetToDefaults = () => {
    if (confirm('Reset to default table views? This will remove all custom presets.')) {
      prefsService.resetToDefaults();
      setActivePreset(null);
      onPresetChange(null);
    }
    handleMenuClose();
  };

  const presets = prefsService.getPresets();
  const defaultPresets = presets.filter(p => 
    ['security-view', 'management-view', 'developer-view', 'full-view'].includes(p.id)
  );
  const customPresets = presets.filter(p => 
    !['security-view', 'management-view', 'developer-view', 'full-view'].includes(p.id)
  );

  const getPresetIcon = (presetId: string) => {
    switch (presetId) {
      case 'security-view':
        return <SecurityIcon fontSize="small" />;
      case 'management-view':
        return <BusinessIcon fontSize="small" />;
      case 'developer-view':
        return <CodeIcon fontSize="small" />;
      case 'full-view':
        return <ViewListIcon fontSize="small" />;
      default:
        return <ViewColumnIcon fontSize="small" />;
    }
  };

  return (
    <>
      <IconButton
        onClick={handleMenuOpen}
        color={activePreset ? 'primary' : 'default'}
        title="Change table view"
      >
        <ViewColumnIcon />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { minWidth: 250 },
        }}
      >
        <MenuItem onClick={() => handlePresetSelect(null)}>
          <ListItemIcon>
            <ViewColumnIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            Default View
            {!activePreset && <Chip label="Active" size="small" sx={{ ml: 1 }} />}
          </ListItemText>
        </MenuItem>

        <Divider />

        <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 1, display: 'block' }}>
          Default Presets
        </Typography>

        {defaultPresets.map((preset) => (
          <MenuItem key={preset.id} onClick={() => handlePresetSelect(preset)}>
            <ListItemIcon>{getPresetIcon(preset.id)}</ListItemIcon>
            <ListItemText
              primary={preset.name}
              secondary={preset.description}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
            {activePreset?.id === preset.id && <Chip label="Active" size="small" color="primary" />}
          </MenuItem>
        ))}

        {customPresets.length > 0 && (
          <>
            <Divider />
            <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 1, display: 'block' }}>
              Custom Presets
            </Typography>
            {customPresets.map((preset) => (
              <MenuItem key={preset.id} onClick={() => handlePresetSelect(preset)}>
                <ListItemIcon>{getPresetIcon(preset.id)}</ListItemIcon>
                <ListItemText primary={preset.name} />
                {activePreset?.id === preset.id && <Chip label="Active" size="small" color="primary" />}
              </MenuItem>
            ))}
          </>
        )}

        <Divider />

        <MenuItem onClick={handleSaveCurrentView}>
          <ListItemIcon>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Save Current View</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleExportPreferences}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export Settings</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleImportPreferences}>
          <ListItemIcon>
            <UploadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Import Settings</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleResetToDefaults}>
          <ListItemIcon>
            <ResetIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Reset to Defaults</ListItemText>
        </MenuItem>
      </Menu>

      {/* Save Preset Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Custom Table View</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              autoFocus
              label="Preset Name"
              fullWidth
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              sx={{ mb: 2 }}
              placeholder="e.g., My Custom View"
            />
            <TextField
              label="Description (optional)"
              fullWidth
              multiline
              rows={2}
              value={presetDescription}
              onChange={(e) => setPresetDescription(e.target.value)}
              placeholder="Describe what this view is for..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSavePreset} variant="contained" disabled={!presetName.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
