/**
 * MITRE ATT&CK Attack Surface Page
 * 
 * Full-page visualization of MITRE ATT&CK techniques organized by tactic.
 * Shows findings mapped to techniques and provides an overview of the attack surface.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  Grid,
  Paper,
  Breadcrumbs,
  Link,
  CircularProgress,
  Alert,
  Chip,
  TextField,
  InputAdornment,
  Divider,
  useTheme
} from '@mui/material';
import {
  Home as HomeIcon,
  Security as SecurityIcon,
  Search as SearchIcon,
  Shield as ShieldIcon
} from '@mui/icons-material';
import AttackTechniqueService, { AttackTechnique, TechniquesByTactic } from '../services/AttackTechniqueService';
import PageBreadcrumbs from './PageBreadcrumbs';
import AttackTechniqueCard from './AttackTechniqueCard';

const AttackSurfacePage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [techniques, setTechniques] = useState<AttackTechnique[]>([]);
  const [groupedTechniques, setGroupedTechniques] = useState<TechniquesByTactic>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredTechniques, setFilteredTechniques] = useState<AttackTechnique[]>([]);

  // Fetch techniques on mount
  useEffect(() => {
    const fetchTechniques = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await AttackTechniqueService.getAllTechniques();
        const sorted = AttackTechniqueService.sortByTacticOrder(data);
        
        setTechniques(sorted);
        setFilteredTechniques(sorted);
        setGroupedTechniques(AttackTechniqueService.groupByTactic(sorted));
        
      } catch (err) {
        console.error('Error fetching ATT&CK techniques:', err);
        setError('Failed to load ATT&CK techniques. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTechniques();
  }, [projectId]);

  // Filter techniques based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTechniques(techniques);
      setGroupedTechniques(AttackTechniqueService.groupByTactic(techniques));
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = techniques.filter(tech => 
      tech.technique_id.toLowerCase().includes(query) ||
      tech.technique_name.toLowerCase().includes(query) ||
      tech.tactic.toLowerCase().includes(query) ||
      tech.description.toLowerCase().includes(query) ||
      tech.keywords.some(kw => kw.toLowerCase().includes(query))
    );

    setFilteredTechniques(filtered);
    setGroupedTechniques(AttackTechniqueService.groupByTactic(filtered));
  }, [searchQuery, techniques]);

  // Handle technique card click
  const handleTechniqueClick = (technique: AttackTechnique) => {
    console.log('Technique clicked:', technique.technique_id);
    // TODO: Navigate to findings filtered by this technique
    // For now, just log it
  };

  // Get tactic order
  const tacticOrder = AttackTechniqueService.getTacticOrder();

  if (loading) {
    return (
      <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {/* Breadcrumb Navigation */}
      <PageBreadcrumbs 
        projectId={projectId}
        items={[
          { label: 'Projects', path: '/', icon: <HomeIcon fontSize="small" /> },
          { label: `Project ${projectId}`, path: `/projects/${projectId}` },
          { label: 'MITRE ATT&CK Matrix', icon: <SecurityIcon fontSize="small" /> }
        ]}
      />

      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <ShieldIcon sx={{ fontSize: 40, mr: 2, color: theme.palette.primary.main }} />
          <Box>
            <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 0 }}>
              MITRE ATT&CK Attack Surface
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Visualize vulnerabilities mapped to adversary tactics and techniques
            </Typography>
          </Box>
        </Box>

        {/* Summary Stats */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip
            icon={<SecurityIcon />}
            label={`${techniques.length} Techniques`}
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
          <Chip
            icon={<ShieldIcon />}
            label={`${Object.keys(groupedTechniques).length} Tactics`}
            color="secondary"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        </Box>
      </Box>

      {/* Search Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search techniques by ID, name, tactic, or keyword..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'white' }}
        />
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* No Results */}
      {filteredTechniques.length === 0 && !loading && (
        <Alert severity="info">
          No techniques found matching "{searchQuery}". Try a different search term.
        </Alert>
      )}

      {/* Techniques Grid - Grouped by Tactic */}
      {filteredTechniques.length > 0 && (
        <Box>
          {tacticOrder.map((tactic) => {
            const tacticTechniques = groupedTechniques[tactic];
            
            // Skip tactics with no techniques (due to filtering)
            if (!tacticTechniques || tacticTechniques.length === 0) {
              return null;
            }

            return (
              <Box key={tactic} sx={{ mb: 4 }}>
                {/* Tactic Header */}
                <Paper
                  sx={{
                    p: 2,
                    mb: 2,
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : AttackTechniqueService.getTacticColor(tactic) + '20',
                    borderLeft: `4px solid ${AttackTechniqueService.getTacticColor(tactic)}`
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                      {tactic}
                    </Typography>
                    <Chip
                      label={`${tacticTechniques.length} technique${tacticTechniques.length !== 1 ? 's' : ''}`}
                      size="small"
                      sx={{
                        backgroundColor: AttackTechniqueService.getTacticColor(tactic),
                        color: 'white',
                        fontWeight: 600
                      }}
                    />
                  </Box>
                </Paper>

                {/* Technique Cards */}
                <Grid container spacing={2}>
                  {tacticTechniques.map((technique) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={technique.technique_id}>
                      <AttackTechniqueCard
                        technique={technique}
                        findingCount={0}  // TODO: Calculate actual finding count
                        onClick={() => handleTechniqueClick(technique)}
                      />
                    </Grid>
                  ))}
                </Grid>

                <Divider sx={{ mt: 3 }} />
              </Box>
            );
          })}
        </Box>
      )}

      {/* Footer Info */}
      <Paper sx={{ p: 2, mt: 4, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)' }}>
        <Typography variant="caption" color="text.secondary">
          <strong>MITRE ATT&CK®</strong> is a globally-accessible knowledge base of adversary tactics and techniques
          based on real-world observations. The ATT&CK knowledge base is used as a foundation for the development
          of specific threat models and methodologies.
        </Typography>
        <Box sx={{ mt: 1 }}>
          <Link
            href="https://attack.mitre.org/"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ fontSize: '0.75rem', mr: 2 }}
          >
            Learn More
          </Link>
          <Link
            href="https://attack.mitre.org/matrices/enterprise/"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ fontSize: '0.75rem' }}
          >
            View Full Matrix
          </Link>
        </Box>
      </Paper>
    </Box>
  );
};

export default AttackSurfacePage;
