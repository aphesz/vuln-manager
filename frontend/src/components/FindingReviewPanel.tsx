import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  TextField,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Paper,
  Stack,
} from '@mui/material';
import {
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  RateReview as ReviewIcon,
  Pending as PendingIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import type { ReviewStatus, Comment, AuditLog } from '../types';
import PeerReviewService from '../services/PeerReviewService';
import UserPreferencesService from '../services/UserPreferencesService';
import { formatDateWithTime } from '../utils/timezoneUtils';
import { useNotification } from '../contexts/NotificationContext';

interface FindingReviewPanelProps {
  findingId: number;
  currentStatus: ReviewStatus;
  currentReviewerName?: string;
  onStatusChange?: () => void;
}

const FindingReviewPanel = ({
  findingId,
  currentStatus,
  currentReviewerName,
  onStatusChange,
}: FindingReviewPanelProps) => {
  const theme = useTheme();
  const { showSuccess, showError } = useNotification();
  const [status, setStatus] = useState<ReviewStatus>(currentStatus);
  const [reviewerName, setReviewerName] = useState(currentReviewerName || '');
  const [comments, setComments] = useState<Comment[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLog[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // For demo purposes - in production, get this from auth context
  const currentUser = 'analyst@example.com';

  // Sync local status with prop when it changes (e.g., after refresh)
  useEffect(() => {
    setStatus(currentStatus);
    setReviewerName(currentReviewerName || '');
  }, [currentStatus, currentReviewerName]);

  useEffect(() => {
    loadComments();
    loadAuditLog();
  }, [findingId]);

  const loadComments = async () => {
    try {
      const data = await PeerReviewService.getComments(findingId);
      setComments(data);
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  const loadAuditLog = async () => {
    try {
      const data = await PeerReviewService.getAuditLog({
        entity_type: 'finding',
        entity_id: findingId,
      });
      setAuditLog(data);
    } catch (err) {
      console.error('Failed to load audit log:', err);
    }
  };

  const handleStatusChange = async (newStatus: ReviewStatus) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await PeerReviewService.updateReviewStatus(
        findingId, 
        newStatus, 
        reviewerName || undefined
      );
      setStatus(newStatus);
      showSuccess(`Review status updated to "${newStatus}"`);
      
      // Small delay to ensure database commit is visible before refreshing
      setTimeout(() => {
        loadAuditLog();
        if (onStatusChange) {
          onStatusChange();
        }
      }, 150);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to update review status';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      setError('Comment cannot be empty');
      return;
    }
    
    if (newComment.length > 5000) {
      setError('Comment exceeds maximum length of 5000 characters');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await PeerReviewService.addComment(findingId, newComment, currentUser);
      setNewComment('');
      setSuccess('Comment added successfully');
      loadComments();
      
      // Small delay to ensure database commit is visible
      setTimeout(() => {
        loadAuditLog();
      }, 100);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (reviewStatus: ReviewStatus) => {
    switch (reviewStatus) {
      case 'Approved':
        return <ApprovedIcon sx={{ color: theme.palette.success.main }} />;
      case 'Rejected':
        return <RejectedIcon sx={{ color: theme.palette.error.main }} />;
      case 'In Review':
        return <ReviewIcon sx={{ color: theme.palette.info.main }} />;
      case 'Pending':
      default:
        return <PendingIcon sx={{ color: theme.palette.warning.main }} />;
    }
  };

  const getStatusColor = (reviewStatus: ReviewStatus) => {
    switch (reviewStatus) {
      case 'Approved':
        return 'success';
      case 'Rejected':
        return 'error';
      case 'In Review':
        return 'info';
      case 'Pending':
      default:
        return 'warning';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const prefsService = UserPreferencesService.getInstance();
    const userTimezone = prefsService.getTimezone();
    return formatDateWithTime(timestamp, userTimezone);
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Review Status Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getStatusIcon(status)}
            Review Status
          </Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="review-status-label">Status</InputLabel>
            <Select
              labelId="review-status-label"
              id="review-status-select"
              value={status}
              label="Status"
              onChange={(e) => handleStatusChange(e.target.value as ReviewStatus)}
              disabled={loading}
              aria-label="Review status"
            >
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="In Review">In Review</MenuItem>
              <MenuItem value="Approved">Approved</MenuItem>
              <MenuItem value="Rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ mt: 2 }}>
            <Chip
              label={status}
              color={getStatusColor(status) as any}
              icon={getStatusIcon(status)}
              sx={{ fontWeight: 'bold' }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Reviewer Name Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Reviewer Information
          </Typography>
          <TextField
            fullWidth
            label="Reviewer Name"
            placeholder="Enter reviewer's name (optional)"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            onBlur={async () => {
              // Auto-save reviewer name when field loses focus
              if (reviewerName !== currentReviewerName) {
                try {
                  await PeerReviewService.updateReviewStatus(
                    findingId,
                    status,
                    reviewerName || undefined
                  );
                  showSuccess('Reviewer name saved');
                  // No need to refresh - the data is already saved and displayed in the TextField
                  // The parent will refresh when the dialog is closed or status changes
                } catch (err: any) {
                  const errorMsg = err.response?.data?.detail || 'Failed to save reviewer name';
                  showError(errorMsg);
                  console.error('Failed to save reviewer name:', err);
                }
              }
            }}
            disabled={loading}
            inputProps={{
              'aria-label': 'Reviewer name',
              maxLength: 100,
            }}
            helperText="Name of the person conducting the review (auto-saves when you leave this field)"
          />
        </CardContent>
      </Card>

      {/* Comments Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Comments ({comments.length})
          </Typography>
          
          {/* Add Comment Form */}
          <Box sx={{ mt: 2, mb: 3 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={loading}
              inputProps={{
                'aria-label': 'New comment text',
                maxLength: 5000,
              }}
              helperText={`${newComment.length}/5000 characters`}
            />
            <Button
              variant="contained"
              onClick={handleAddComment}
              disabled={loading || !newComment.trim()}
              sx={{ mt: 1 }}
              aria-label="Add comment"
            >
              {loading ? <CircularProgress size={24} /> : 'Add Comment'}
            </Button>
          </Box>

          {/* Comments List */}
          {comments.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No comments yet. Be the first to add one!
            </Typography>
          ) : (
            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {comments.map((comment, index) => (
                <React.Fragment key={comment.id}>
                  <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                    <ListItemText
                      primary={
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {comment.user}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatTimestamp(comment.created_at)}
                          </Typography>
                        </Stack>
                      }
                      secondary={
                        <Typography
                          variant="body2"
                          sx={{ mt: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                        >
                          {comment.text}
                        </Typography>
                      }
                    />
                  </ListItem>
                  {index < comments.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Audit Log Section */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Activity History
          </Typography>
          {auditLog.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No activity recorded yet.
            </Typography>
          ) : (
            <List sx={{ maxHeight: 300, overflow: 'auto' }}>
              {auditLog.map((log, index) => (
                <React.Fragment key={log.id}>
                  <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                    <ListItemText
                      primary={
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2">
                            {log.action}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatTimestamp(log.timestamp)}
                          </Typography>
                        </Stack>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            by {log.user}
                          </Typography>
                          {log.changes_json && (
                            <Paper
                              variant="outlined"
                              sx={{
                                mt: 1,
                                p: 1,
                                bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
                              }}
                            >
                              <Typography
                                variant="caption"
                                component="pre"
                                sx={{
                                  fontFamily: 'monospace',
                                  fontSize: '0.7rem',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  m: 0,
                                }}
                              >
                                {log.changes_json}
                              </Typography>
                            </Paper>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < auditLog.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default FindingReviewPanel;
