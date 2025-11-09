import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Avatar,
  CircularProgress,
  Alert,
  Divider,
  Stack,
} from '@mui/material';
import {
  Send as SendIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import axios from 'axios';
import UserPreferencesService from '../services/UserPreferencesService';
import { formatRelativeTime, formatDateWithTime } from '../utils/timezoneUtils';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

interface Comment {
  id: number;
  text: string;
  user: string;
  created_at: string;
  finding_id: number;
}

interface CommentsSectionProps {
  findingId: number;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ findingId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [userName, setUserName] = useState('Analyst'); // TODO(v1.0.0): Get from AuthContext when auth is implemented

  // Get user's timezone preference
  const prefsService = UserPreferencesService.getInstance();
  const userTimezone = prefsService.getTimezone();

  useEffect(() => {
    fetchComments();
  }, [findingId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/findings/${findingId}/comments`);
      setComments(response.data);
    } catch (err: any) {
      console.error('Failed to fetch comments:', err);
      setError('Failed to load comments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await axios.post(`${API_BASE_URL}/findings/${findingId}/comments`, {
        text: newComment.trim(),
        user: userName,
      });

      setNewComment('');
      await fetchComments(); // Refresh comments
    } catch (err: any) {
      console.error('Failed to submit comment:', err);
      setError(err.response?.data?.detail || 'Failed to submit comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmitComment();
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Comments ({comments.length})
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Add Comment Form */}
      <Card sx={{ mb: 3, bgcolor: 'background.default' }}>
        <CardContent>
          <Stack spacing={2}>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Add a comment... (Ctrl/Cmd + Enter to submit)"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={submitting}
              variant="outlined"
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Posting as: <strong>{userName}</strong>
              </Typography>
              <Button
                variant="contained"
                startIcon={submitting ? <CircularProgress size={16} /> : <SendIcon />}
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || submitting}
                size="small"
              >
                {submitting ? 'Submitting...' : 'Add Comment'}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Comments List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : comments.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            No comments yet. Be the first to comment!
          </Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {comments.map((comment, index) => (
            <React.Fragment key={comment.id}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                      <PersonIcon />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight="600">
                          {comment.user}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          title={formatDateWithTime(comment.created_at, userTimezone)}
                        >
                          {formatRelativeTime(comment.created_at)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {comment.text}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
              {index < comments.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default CommentsSection;
