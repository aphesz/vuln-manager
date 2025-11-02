import React from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

export interface NotificationState {
  open: boolean;
  message: string;
  severity: AlertColor;
}

interface NotificationSnackbarProps {
  notification: NotificationState;
  onClose: () => void;
}

const NotificationSnackbar: React.FC<NotificationSnackbarProps> = ({
  notification,
  onClose,
}) => {
  return (
    <Snackbar
      open={notification.open}
      autoHideDuration={3000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{ mt: 8 }} // Add top margin to avoid overlapping with header
    >
      <Alert
        onClose={onClose}
        severity={notification.severity}
        variant="filled"
        sx={{
          minWidth: '300px',
          boxShadow: 3,
        }}
      >
        {notification.message}
      </Alert>
    </Snackbar>
  );
};

export default NotificationSnackbar;
