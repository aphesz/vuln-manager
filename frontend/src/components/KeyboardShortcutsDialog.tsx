/** @jsxRuntime classic */
/** @jsx React.createElement */
/** @jsxFrag React.Fragment */

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  Grid,
} from '@mui/material';
import {
  Keyboard as KeyboardIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Edit as EditIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // Navigation
  { keys: ['?'], description: 'Show this keyboard shortcuts help', category: 'General' },
  { keys: ['Esc'], description: 'Close dialog or cancel current action', category: 'General' },
  
  // Search & Filter
  { keys: ['Ctrl', 'K'], description: 'Focus quick search/filter', category: 'Search & Filter' },
  { keys: ['Ctrl', 'F'], description: 'Focus quick search/filter (alternative)', category: 'Search & Filter' },
  
  // Table Navigation
  { keys: ['↑', '↓'], description: 'Navigate between rows', category: 'Table Navigation' },
  { keys: ['Enter'], description: 'Open selected finding details', category: 'Table Navigation' },
  { keys: ['Space'], description: 'Select/deselect row (with checkbox)', category: 'Table Navigation' },
  
  // Editing
  { keys: ['Enter'], description: 'Save edit (when editing)', category: 'Editing' },
  { keys: ['Esc'], description: 'Cancel edit (when editing)', category: 'Editing' },
  
  // Bulk Operations
  { keys: ['Ctrl', 'A'], description: 'Select all findings (in table)', category: 'Bulk Operations' },
  { keys: ['Ctrl', 'Shift', 'A'], description: 'Deselect all', category: 'Bulk Operations' },
];

const KeyboardShortcutsDialog: React.FC<KeyboardShortcutsDialogProps> = ({ open, onClose }) => {
  // Group shortcuts by category
  const categories = Array.from(new Set(shortcuts.map(s => s.category)));

  const renderKey = (key: string) => (
    <Chip
      label={key}
      size="small"
      sx={{
        fontFamily: 'monospace',
        fontWeight: 'bold',
        fontSize: '0.75rem',
        height: '24px',
        backgroundColor: 'action.selected',
        border: '1px solid',
        borderColor: 'divider',
      }}
    />
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <KeyboardIcon />
        <Typography variant="h6" component="span">
          Keyboard Shortcuts
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {categories.map((category, idx) => (
          <Box key={category} sx={{ mb: idx < categories.length - 1 ? 3 : 0 }}>
            <Typography
              variant="subtitle2"
              color="primary"
              sx={{ fontWeight: 'bold', mb: 1.5, textTransform: 'uppercase', fontSize: '0.75rem' }}
            >
              {category}
            </Typography>

            <Grid container spacing={2}>
              {shortcuts
                .filter(s => s.category === category)
                .map((shortcut, i) => (
                  <Grid item xs={12} key={i}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 1,
                        px: 1.5,
                        borderRadius: 1,
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                    >
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {shortcut.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {shortcut.keys.map((key, keyIdx) => (
                          <React.Fragment key={keyIdx}>
                            {keyIdx > 0 && (
                              <Typography variant="body2" sx={{ mx: 0.5, color: 'text.secondary' }}>
                                +
                              </Typography>
                            )}
                            {renderKey(key)}
                          </React.Fragment>
                        ))}
                      </Box>
                    </Box>
                  </Grid>
                ))}
            </Grid>

            {idx < categories.length - 1 && <Divider sx={{ mt: 2 }} />}
          </Box>
        ))}

        <Box sx={{ mt: 3, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            💡 <strong>Tip:</strong> Press <Chip label="?" size="small" sx={{ mx: 0.5, height: '20px', fontSize: '0.7rem' }} /> anytime to show this dialog.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Got it!
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default KeyboardShortcutsDialog;
