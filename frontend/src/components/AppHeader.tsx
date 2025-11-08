import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme, Box, IconButton, Button, Menu, MenuItem } from '@mui/material'
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Assessment as SLAIcon,
  Security as SecurityIcon,
  Calculate as CalculateIcon,
  KeyboardArrowDown as ArrowDownIcon,
  LocalOffer as TagIcon,
  Dashboard as ExecutiveIcon,
  Description as ReportIcon,
} from '@mui/icons-material'
import { useThemeContext } from '../theme/ThemeProvider'

const AppHeader = () => {
  const theme = useTheme()
  const { mode, toggleTheme } = useThemeContext()
  const [calculatorMenuAnchor, setCalculatorMenuAnchor] = useState<null | HTMLElement>(null)
  
  const handleCalculatorMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setCalculatorMenuAnchor(event.currentTarget)
  }
  
  const handleCalculatorMenuClose = () => {
    setCalculatorMenuAnchor(null)
  }
  
  return (
    <Box
      component="header"
      role="banner"
      aria-label="Application header"
      sx={{
        backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#343a40',
        color: '#ffffff',
        padding: '15px 20px',
        marginBottom: '20px',
        boxShadow: theme.shadows[1],
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Link to="/" style={{ textDecoration: 'none' }} aria-label="Go to dashboard home">
        <Box
          component="h1"
          sx={{
            fontSize: '1.2em',
            fontWeight: 500,
            color: '#ffffff',
            '&:hover': {
              color: theme.palette.primary.light,
            },
            cursor: 'pointer',
            margin: 0,
          }}
        >
          🛡️ VulnManager Dashboard
        </Box>
      </Link>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
          component={Link}
          to="/tags"
          variant="outlined"
          startIcon={<TagIcon />}
          sx={{
            color: '#ffffff',
            borderColor: 'rgba(255, 255, 255, 0.5)',
            '&:hover': {
              borderColor: theme.palette.primary.light,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
          aria-label="View tag manager"
        >
          Tags
        </Button>
        <Button
          component={Link}
          to="/executive"
          variant="outlined"
          startIcon={<ExecutiveIcon />}
          sx={{
            color: '#ffffff',
            borderColor: 'rgba(255, 255, 255, 0.5)',
            '&:hover': {
              borderColor: theme.palette.primary.light,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
          aria-label="View executive dashboard"
        >
          Executive
        </Button>
        <Button
          component={Link}
          to="/reports"
          variant="outlined"
          startIcon={<ReportIcon />}
          sx={{
            color: '#ffffff',
            borderColor: 'rgba(255, 255, 255, 0.5)',
            '&:hover': {
              borderColor: theme.palette.primary.light,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
          aria-label="Generate reports"
        >
          Reports
        </Button>
        <Button
          component={Link}
          to="/vulnerability-repository"
          variant="outlined"
          startIcon={<SecurityIcon />}
          sx={{
            color: '#ffffff',
            borderColor: 'rgba(255, 255, 255, 0.5)',
            '&:hover': {
              borderColor: theme.palette.primary.light,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
          aria-label="View vulnerability repository"
        >
          Vuln Repository
        </Button>
        <Button
          variant="outlined"
          startIcon={<CalculateIcon />}
          endIcon={<ArrowDownIcon />}
          onClick={handleCalculatorMenuOpen}
          sx={{
            color: '#ffffff',
            borderColor: 'rgba(255, 255, 255, 0.5)',
            '&:hover': {
              borderColor: theme.palette.primary.light,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
          aria-label="Open calculators menu"
        >
          Calculators
        </Button>
        <Menu
          anchorEl={calculatorMenuAnchor}
          open={Boolean(calculatorMenuAnchor)}
          onClose={handleCalculatorMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem
            component={Link}
            to="/calculators/cvss"
            onClick={handleCalculatorMenuClose}
          >
            CVSS 3.1 Calculator
          </MenuItem>
          <MenuItem
            component={Link}
            to="/calculators/owasp"
            onClick={handleCalculatorMenuClose}
          >
            OWASP Risk Calculator
          </MenuItem>
        </Menu>
        <Button
          component={Link}
          to="/sla"
          variant="outlined"
          startIcon={<SLAIcon />}
          sx={{
            color: '#ffffff',
            borderColor: 'rgba(255, 255, 255, 0.5)',
            '&:hover': {
              borderColor: theme.palette.primary.light,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
          aria-label="View SLA dashboard"
        >
          SLA Dashboard
        </Button>
        <IconButton 
          onClick={toggleTheme}
          size="large"
          aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode (current: ${mode} mode)`}
          aria-pressed={mode === 'dark'}
          sx={{
            color: '#ffffff',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
            '&:focus-visible': {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: '2px',
            },
          }}
          title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
        >
          {mode === 'dark' ? <LightModeIcon aria-hidden="true" /> : <DarkModeIcon aria-hidden="true" />}
        </IconButton>
      </Box>
    </Box>
  )
}

export default AppHeader

