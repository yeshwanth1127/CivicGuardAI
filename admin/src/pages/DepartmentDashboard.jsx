import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Stack,
  TextField,
  InputAdornment,
  FormControl,
  Select,
  MenuItem,
  Fade,
} from "@mui/material";
import {
  Search as SearchIcon,
  CheckCircle as CheckIcon,
  Business as DeptIcon,
  Assignment as TotalIcon,
  Schedule as OpenIcon,
  Autorenew as ProgressIcon,
  CheckCircle as ResolvedIcon,
} from "@mui/icons-material";
import { issuesAPI } from "../api/api";
import StatusChip from "../components/StatusChip";
import CategoryChip from "../components/CategoryChip";
import StatTile from "../components/StatTile";
import { getCurrentUser } from "../utils/auth";
import { tokens } from "../theme";

const STATUSES = ["Open", "In Progress", "Resolved"];

const DepartmentDashboard = () => {
  const currentUser = useMemo(() => getCurrentUser(), []);
  const department = currentUser?.department;

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selections, setSelections] = useState({});
  const [updatingId, setUpdatingId] = useState(null);
  const [justUpdatedId, setJustUpdatedId] = useState(null);

  useEffect(() => {
    fetchIssues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const response = await issuesAPI.getAll();
      const data = (Array.isArray(response) ? response : response.issues || []).filter(
        (i) => i.department === department
      );
      setIssues(data);
      setSelections((prev) => {
        const next = { ...prev };
        data.forEach((issue) => {
          if (next[issue.id] === undefined) next[issue.id] = issue.status;
        });
        return next;
      });
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to load issues");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (issue) => {
    const status = selections[issue.id];
    if (!status || status === issue.status) return;

    try {
      setUpdatingId(issue.id);
      setError("");
      await issuesAPI.updateStatus(issue.id, status);
      setIssues((prev) => prev.map((i) => (i.id === issue.id ? { ...i, status } : i)));
      setJustUpdatedId(issue.id);
      setTimeout(() => setJustUpdatedId((current) => (current === issue.id ? null : current)), 2200);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const stats = useMemo(
    () => ({
      total: issues.length,
      open: issues.filter((i) => i.status === "Open").length,
      inProgress: issues.filter((i) => i.status === "In Progress").length,
      resolved: issues.filter((i) => i.status === "Resolved").length,
    }),
    [issues]
  );

  const filteredIssues = useMemo(() => {
    if (!search) return issues;
    const q = search.toLowerCase();
    return issues.filter(
      (issue) =>
        (issue.title || "").toLowerCase().includes(q) ||
        (issue.description || "").toLowerCase().includes(q)
    );
  }, [issues, search]);

  if (!department) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          This account isn't tagged to a department.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Fade in timeout={350}>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
          <DeptIcon sx={{ color: tokens.primary }} />
          <Typography variant="h4">{department}</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Issues routed to your department. Update the status as work
          progresses.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Stack direction="row" spacing={1.5} sx={{ mb: 3, flexWrap: "wrap", rowGap: 1.5 }}>
          <StatTile
            icon={<TotalIcon fontSize="small" />}
            label="Assigned to you"
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
        </Stack>

        <TextField
          size="small"
          placeholder="Search your issues…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 2.5, maxWidth: 320 }}
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

        {filteredIssues.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, borderRadius: 4, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              {issues.length === 0
                ? "No issues have been routed to your department yet."
                : "No issues match your search."}
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {filteredIssues.map((issue) => (
              <Paper
                key={issue.id}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 3,
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  alignItems: { md: "center" },
                  gap: 2,
                }}
              >
                <Box
                  component="img"
                  src={
                    issue.photo_url ||
                    "https://images.unsplash.com/photo-1529429617124-aee711fa4eec?auto=format&fit=crop&w=200&q=60"
                  }
                  alt={issue.title}
                  sx={{
                    width: { xs: "100%", md: 88 },
                    height: { xs: 140, md: 64 },
                    objectFit: "cover",
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                />

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                    {issue.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: "-webkit-box",
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {issue.description}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: "wrap", rowGap: 0.5 }}>
                    <StatusChip status={issue.status} size="small" />
                    {issue.category && <CategoryChip category={issue.category} size="small" />}
                  </Stack>
                </Box>

                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ width: { xs: "100%", md: "auto" } }}
                >
                  <FormControl size="small" sx={{ minWidth: 160, flex: { xs: 1, md: "initial" } }}>
                    <Select
                      value={selections[issue.id] || issue.status}
                      onChange={(e) =>
                        setSelections((prev) => ({ ...prev, [issue.id]: e.target.value }))
                      }
                    >
                      {STATUSES.map((s) => (
                        <MenuItem key={s} value={s}>
                          {s}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    variant="contained"
                    size="small"
                    disabled={
                      updatingId === issue.id ||
                      (selections[issue.id] || issue.status) === issue.status
                    }
                    onClick={() => handleUpdateStatus(issue)}
                    startIcon={
                      updatingId === issue.id ? (
                        <CircularProgress size={14} sx={{ color: "#fff" }} />
                      ) : justUpdatedId === issue.id ? (
                        <CheckIcon fontSize="small" />
                      ) : null
                    }
                    sx={{ whiteSpace: "nowrap" }}
                  >
                    {justUpdatedId === issue.id ? "Updated" : "Update Status"}
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>
    </Fade>
  );
};

export default DepartmentDashboard;
