import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
  IconButton,
  Tooltip,
  Stack,
  TextField,
  InputAdornment,
  Fade,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Assignment as TotalIcon,
  Schedule as OpenIcon,
  Autorenew as ProgressIcon,
  CheckCircle as ResolvedIcon,
  ReportProblem as ReviewIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { issuesAPI } from "../api/api";
import StatusChip from "../components/StatusChip";
import ReviewChip from "../components/ReviewChip";
import CategoryChip from "../components/CategoryChip";
import StatTile from "../components/StatTile";
import { tokens } from "../theme";

const Dashboard = () => {
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterReviewOnly, setFilterReviewOnly] = useState(false);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const response = await issuesAPI.getAll();
      const issuesData = (
        Array.isArray(response) ? response : response.issues || []
      ).map((issue, index) => ({
        ...issue,
        index: index + 1,
        created_at: issue.created_at || issue.createdAt,
      }));
      setIssues(issuesData);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to fetch issues"
      );
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(
    () => ({
      total: issues.length,
      open: issues.filter((i) => i.status === "Open").length,
      inProgress: issues.filter((i) => i.status === "In Progress").length,
      resolved: issues.filter((i) => i.status === "Resolved").length,
      needsReview: issues.filter((i) => i.needs_review).length,
    }),
    [issues]
  );

  const columns = [
    {
      field: "thumb",
      headerName: "",
      width: 72,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box
          component="img"
          src={
            params.row.photo_url ||
            params.row.resolved_photo_url ||
            "https://images.unsplash.com/photo-1529429617124-aee711fa4eec?auto=format&fit=crop&w=200&q=60"
          }
          alt="thumb"
          sx={{
            width: 48,
            height: 40,
            objectFit: "cover",
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: "divider",
          }}
        />
      ),
    },
    {
      field: "title",
      headerName: "Title",
      width: 220,
      flex: 1,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
          {params.value}
        </Typography>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 140,
      renderCell: (params) => <StatusChip status={params.value} size="small" />,
    },
    {
      field: "category",
      headerName: "Category",
      width: 150,
      renderCell: (params) =>
        params.value ? (
          <CategoryChip category={params.value} size="small" />
        ) : (
          <Typography variant="caption" color="text.secondary">
            —
          </Typography>
        ),
    },
    {
      field: "needs_review",
      headerName: "Review",
      width: 150,
      renderCell: (params) => <ReviewChip needsReview={params.value} size="small" />,
    },
    {
      field: "created_at",
      headerName: "Created",
      width: 150,
      renderCell: (params) => {
        const dateValue = params.row.created_at || params.row.createdAt;
        if (!dateValue) return "";
        try {
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) return "";
          return date.toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        } catch {
          return "";
        }
      },
    },
    {
      field: "actions",
      headerName: "",
      width: 110,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="View">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/admin/issue/${params.row.id}`);
              }}
              sx={{ color: "text.secondary" }}
            >
              <ViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              sx={{ color: tokens.critical }}
              onClick={async (e) => {
                e.stopPropagation();
                const id = params.row.id;
                const ok = window.confirm(
                  "Are you sure you want to delete this issue? This action cannot be undone."
                );
                if (!ok) return;
                try {
                  setLoading(true);
                  await issuesAPI.delete(id);
                  await fetchIssues();
                  setError("");
                } catch (err) {
                  setError(
                    err.response?.data?.message ||
                      err.message ||
                      "Failed to delete issue"
                  );
                } finally {
                  setLoading(false);
                }
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const filteredIssues = issues.filter((issue) => {
    if (filterReviewOnly && !issue.needs_review) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (issue.title || "").toLowerCase().includes(q) ||
      (issue.description || "").toLowerCase().includes(q) ||
      (issue.status || "").toLowerCase().includes(q) ||
      (issue.address || "").toLowerCase().includes(q)
    );
  });

  if (loading && issues.length === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Fade in timeout={350}>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ mb: 0.5 }}>
            Issues
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review, verify, and track civic issue reports.
          </Typography>
        </Box>

        <Stack
          direction="row"
          spacing={1.5}
          sx={{ mb: 3, flexWrap: "wrap", rowGap: 1.5 }}
        >
          <StatTile
            icon={<TotalIcon fontSize="small" />}
            label="Total Issues"
            value={stats.total}
            color={tokens.primary}
            delay={0}
          />
          <StatTile
            icon={<OpenIcon fontSize="small" />}
            label="Open"
            value={stats.open}
            color={tokens.warning}
            delay={40}
          />
          <StatTile
            icon={<ProgressIcon fontSize="small" />}
            label="In Progress"
            value={stats.inProgress}
            color={tokens.primary}
            delay={80}
          />
          <StatTile
            icon={<ResolvedIcon fontSize="small" />}
            label="Resolved"
            value={stats.resolved}
            color={tokens.good}
            delay={120}
          />
          <StatTile
            icon={<ReviewIcon fontSize="small" />}
            label="Needs Review"
            value={stats.needsReview}
            color={tokens.critical}
            delay={160}
          />
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 2.5, borderRadius: 4 }} variant="outlined">
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ sm: "center" }}
            justifyContent="space-between"
            spacing={1.5}
            sx={{ mb: 2 }}
          >
            <TextField
              size="small"
              placeholder="Search issues…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ maxWidth: 320 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant={filterReviewOnly ? "contained" : "outlined"}
                color={filterReviewOnly ? "error" : "inherit"}
                size="small"
                onClick={() => setFilterReviewOnly(!filterReviewOnly)}
              >
                {filterReviewOnly
                  ? `Needs Review (${stats.needsReview})`
                  : "Show Needs Review"}
              </Button>
              <Tooltip title="Refresh">
                <IconButton onClick={fetchIssues} size="small">
                  <RefreshIcon
                    fontSize="small"
                    sx={{
                      animation: loading ? "spin 0.8s linear infinite" : "none",
                      "@keyframes spin": {
                        from: { transform: "rotate(0deg)" },
                        to: { transform: "rotate(360deg)" },
                      },
                    }}
                  />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          <Box sx={{ height: 600, width: "100%" }}>
            <DataGrid
              rows={filteredIssues || []}
              columns={columns}
              disableRowSelectionOnClick
              getRowId={(row) => row.id || row._id}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
                sorting: { sortModel: [{ field: "created_at", sort: "desc" }] },
              }}
              slots={{
                noRowsOverlay: () => (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      color: "text.secondary",
                      gap: 1,
                    }}
                  >
                    <Typography variant="body2">No issues match your filters.</Typography>
                  </Box>
                ),
              }}
              sx={{
                "& .MuiDataGrid-row": { cursor: "pointer" },
                "& .MuiDataGrid-row:hover": {
                  backgroundColor: "rgba(42,120,214,0.04)",
                },
                "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": {
                  outline: "none",
                },
              }}
              onRowClick={(params) => navigate(`/admin/issue/${params.row.id}`)}
            />
          </Box>
        </Paper>
      </Box>
    </Fade>
  );
};

export default Dashboard;
