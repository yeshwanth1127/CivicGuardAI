import React from 'react';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  Box,
  Stack,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Logout as LogoutIcon,
  ShieldOutlined as ShieldIcon,
  Psychology as PipelineIcon,
  Business as DeptIcon,
  Map as MapIcon,
  InsightsOutlined as AnalyticsIcon,
  BarChartOutlined as ModelComparisonIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
import { tokens } from '../theme';
import { getCurrentUser } from '../utils/auth';

const drawerWidth = 240;

const NavItem = ({ icon, text, active, onClick }) => (
  <ListItemButton
    onClick={onClick}
    sx={{
      mx: 1.5,
      mb: 0.5,
      borderRadius: 2,
      position: 'relative',
      color: active ? tokens.primary : 'text.secondary',
      backgroundColor: active ? alpha(tokens.primary, 0.1) : 'transparent',
      transition: 'background-color 0.15s ease, color 0.15s ease',
      '&:hover': {
        backgroundColor: active ? alpha(tokens.primary, 0.14) : alpha(tokens.textPrimary, 0.04),
      },
      '&::before': {
        content: '""',
        position: 'absolute',
        left: -12,
        top: '20%',
        height: '60%',
        width: 3,
        borderRadius: 999,
        backgroundColor: tokens.primary,
        opacity: active ? 1 : 0,
        transform: active ? 'scaleY(1)' : 'scaleY(0.3)',
        transition: 'opacity 0.18s ease, transform 0.18s ease',
      },
    }}
  >
    <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}>{icon}</ListItemIcon>
    <ListItemText
      primary={text}
      slotProps={{ primary: { sx: { fontWeight: active ? 700 : 500, fontSize: '0.92rem' } } }}
    />
  </ListItemButton>
);

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getCurrentUser();
  const isDepartmentAccount = Boolean(currentUser?.department);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: 'background.paper',
        },
      }}
    >
      <Toolbar sx={{ px: 3 }}>
        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0 }}>
          <ShieldIcon sx={{ color: tokens.primary, flexShrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" noWrap sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              CivicFix
            </Typography>
            {isDepartmentAccount && (
              <Typography variant="caption" noWrap sx={{ display: 'block', color: 'text.secondary' }}>
                {currentUser.department}
              </Typography>
            )}
          </Box>
        </Stack>
      </Toolbar>
      <Divider />
      <List sx={{ pt: 2, flexGrow: 1 }}>
        {isDepartmentAccount ? (
          <NavItem
            icon={<DeptIcon fontSize="small" />}
            text="My Department"
            active={location.pathname === '/admin/dept'}
            onClick={() => navigate('/admin/dept')}
          />
        ) : (
          <>
            <NavItem
              icon={<DashboardIcon fontSize="small" />}
              text="Dashboard"
              active={location.pathname === '/admin'}
              onClick={() => navigate('/admin')}
            />
            <NavItem
              icon={<PipelineIcon fontSize="small" />}
              text="CNN Pipeline"
              active={location.pathname === '/admin/pipeline'}
              onClick={() => navigate('/admin/pipeline')}
            />
            <NavItem
              icon={<DeptIcon fontSize="small" />}
              text="Transfer to Department"
              active={location.pathname === '/admin/transfer'}
              onClick={() => navigate('/admin/transfer')}
            />
            <NavItem
              icon={<MapIcon fontSize="small" />}
              text="Map View"
              active={location.pathname === '/admin/map'}
              onClick={() => navigate('/admin/map')}
            />
            <NavItem
              icon={<AnalyticsIcon fontSize="small" />}
              text="Analytics"
              active={location.pathname === '/admin/analytics'}
              onClick={() => navigate('/admin/analytics')}
            />
            <NavItem
              icon={<ModelComparisonIcon fontSize="small" />}
              text="Model Comparison"
              active={location.pathname === '/admin/model-comparison'}
              onClick={() => navigate('/admin/model-comparison')}
            />
          </>
        )}
      </List>
      <Box sx={{ p: 1.5 }}>
        <Divider sx={{ mb: 1.5 }} />
        <NavItem
          icon={<LogoutIcon fontSize="small" />}
          text="Logout"
          active={false}
          onClick={handleLogout}
        />
      </Box>
    </Drawer>
  );
};

export default Sidebar;
