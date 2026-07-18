import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, Toolbar } from '@mui/material';
import ReportIssue from './pages/ReportIssue';
import TrackIssue from './pages/TrackIssue';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import IssueDetails from './pages/IssueDetails';
import CnnPipeline from './pages/CnnPipeline';
import TransferDepartment from './pages/TransferDepartment';
import DepartmentDashboard from './pages/DepartmentDashboard';
import MapView from './pages/MapView';
import Analytics from './pages/Analytics';
import ModelComparison from './pages/ModelComparison';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { getCurrentUser } from './utils/auth';

const DEPARTMENT_HOME = '/admin/dept';

const ProtectedLayout = ({ children }) => {
  const token = localStorage.getItem('admin_token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  // Department-tagged accounts are scoped to their own dashboard only —
  // keep them out of the full staff/admin panel (Dashboard, CNN Pipeline,
  // Transfer to Department, individual issue pages).
  const user = getCurrentUser();
  if (user?.department && location.pathname !== DEPARTMENT_HOME) {
    return <Navigate to={DEPARTMENT_HOME} replace />;
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar />
        <Box sx={{ flexGrow: 1, overflow: 'auto', bgcolor: 'background.default' }}>
          <Toolbar sx={{ minHeight: '68px !important' }} />
          {children}
        </Box>
      </Box>
    </Box>
  );
};

const ProtectedRoute = ({ element }) => {
  return (
    <ProtectedLayout>
      {element}
    </ProtectedLayout>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public — citizen-facing homepage, no login required */}
        <Route path="/" element={<ReportIssue />} />
        <Route path="/track" element={<TrackIssue />} />
        <Route path="/track/:code" element={<TrackIssue />} />

        {/* Staff/admin panel */}
        <Route path="/admin/login" element={<Login />} />
        <Route
          path="/admin"
          element={<ProtectedRoute element={<Dashboard />} />}
        />
        <Route
          path="/admin/issue/:id"
          element={<ProtectedRoute element={<IssueDetails />} />}
        />
        <Route
          path="/admin/pipeline"
          element={<ProtectedRoute element={<CnnPipeline />} />}
        />
        <Route
          path="/admin/transfer"
          element={<ProtectedRoute element={<TransferDepartment />} />}
        />
        <Route
          path="/admin/map"
          element={<ProtectedRoute element={<MapView />} />}
        />
        <Route
          path="/admin/analytics"
          element={<ProtectedRoute element={<Analytics />} />}
        />
        <Route
          path="/admin/model-comparison"
          element={<ProtectedRoute element={<ModelComparison />} />}
        />
        <Route
          path={DEPARTMENT_HOME}
          element={<ProtectedRoute element={<DepartmentDashboard />} />}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
