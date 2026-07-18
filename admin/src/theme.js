import { createTheme, alpha } from '@mui/material/styles';

// Status roles are fixed and never reused for categories — see statusMeta.js
// for the semantic mapping (Open/In Progress/Resolved/Needs Review) and the
// CNN category chip colors.
export const tokens = {
  primary: '#2a78d6',
  primaryDark: '#1c5cab',
  primaryLight: '#6da7ec',
  page: '#f9f9f7',
  surface: '#ffffff',
  textPrimary: '#0b0b0b',
  textSecondary: '#52514e',
  textMuted: '#898781',
  divider: '#e1e0d9',
  good: '#0ca30c',
  warning: '#c98500',
  serious: '#c65a2e',
  critical: '#d03b3b',
};

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: tokens.primary,
      dark: tokens.primaryDark,
      light: tokens.primaryLight,
      contrastText: '#ffffff',
    },
    background: {
      default: tokens.page,
      paper: tokens.surface,
    },
    text: {
      primary: tokens.textPrimary,
      secondary: tokens.textSecondary,
    },
    divider: tokens.divider,
    success: { main: tokens.good },
    warning: { main: tokens.warning },
    error: { main: tokens.critical },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      'Inter',
      'Arial',
      'sans-serif',
    ].join(','),
    h4: { fontWeight: 700, letterSpacing: -0.5 },
    h5: { fontWeight: 700, letterSpacing: -0.3 },
    h6: { fontWeight: 700 },
    subtitle2: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  shadows: [
    'none',
    '0 1px 2px rgba(11,11,11,0.06)',
    '0 1px 3px rgba(11,11,11,0.08)',
    '0 2px 8px rgba(11,11,11,0.08)',
    '0 4px 12px rgba(11,11,11,0.10)',
    '0 6px 16px rgba(11,11,11,0.10)',
    ...Array(19).fill('0 8px 24px rgba(11,11,11,0.12)'),
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: tokens.page,
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingInline: 16,
          transition: 'transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease',
        },
        contained: {
          '&:hover': {
            boxShadow: `0 4px 14px ${alpha(tokens.primary, 0.28)}`,
            transform: 'translateY(-1px)',
          },
        },
        outlined: {
          borderColor: tokens.divider,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.15s ease, transform 0.15s ease',
          '&:hover': { transform: 'translateY(-1px)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${tokens.divider}`,
          boxShadow: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(11,11,11,0.06)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 600,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: `1px solid ${tokens.divider}`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: `1px solid ${tokens.divider}`,
          backgroundImage: 'none',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: 'box-shadow 0.15s ease',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: tokens.divider,
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          '--DataGrid-rowBorderColor': tokens.divider,
        },
        columnHeaders: {
          backgroundColor: tokens.page,
          borderBottom: `1px solid ${tokens.divider}`,
        },
        row: {
          transition: 'background-color 0.12s ease',
        },
      },
    },
  },
});

export default theme;
