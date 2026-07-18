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
  Send as SendIcon,
  CheckCircle as CheckIcon,
  Business as DeptIcon,
} from "@mui/icons-material";
import { issuesAPI } from "../api/api";
import StatusChip from "../components/StatusChip";
import CategoryChip from "../components/CategoryChip";
import SoftChip from "../components/SoftChip";
import { DEPARTMENTS, CATEGORY_DEPARTMENT_SUGGESTION } from "../constants/departments";
import { tokens } from "../theme";

const TransferDepartment = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [selections, setSelections] = useState({});
  const [sendingId, setSendingId] = useState(null);
  const [justSentId, setJustSentId] = useState(null);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const response = await issuesAPI.getAll();
      const data = Array.isArray(response) ? response : response.issues || [];
      setIssues(data);
      setSelections((prev) => {
        const next = { ...prev };
        data.forEach((issue) => {
          if (next[issue.id] === undefined) {
            next[issue.id] =
              issue.department || CATEGORY_DEPARTMENT_SUGGESTION[issue.category] || "";
          }
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

  const handleSend = async (issue) => {
    const department = selections[issue.id];
    if (!department) return;

    try {
      setSendingId(issue.id);
      setError("");
      await issuesAPI.updateDepartment(issue.id, department);
      setIssues((prev) =>
        prev.map((i) => (i.id === issue.id ? { ...i, department } : i))
      );
      setJustSentId(issue.id);
      setTimeout(() => setJustSentId((current) => (current === issue.id ? null : current)), 2200);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to transfer issue");
    } finally {
      setSendingId(null);
    }
  };

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (unassignedOnly && issue.department) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (issue.title || "").toLowerCase().includes(q) ||
        (issue.description || "").toLowerCase().includes(q) ||
        (issue.category || "").toLowerCase().includes(q)
      );
    });
  }, [issues, search, unassignedOnly]);

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
          <Typography variant="h4">Transfer to Department</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 640 }}>
          Route each report to the municipal department responsible for it.
          The dropdown defaults to a suggestion based on the CNN category —
          double-check it before sending.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ sm: "center" }}
          justifyContent="space-between"
          spacing={1.5}
          sx={{ mb: 2.5 }}
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
          <Button
            variant={unassignedOnly ? "contained" : "outlined"}
            color={unassignedOnly ? "primary" : "inherit"}
            size="small"
            onClick={() => setUnassignedOnly((v) => !v)}
          >
            {unassignedOnly
              ? "Showing unassigned only"
              : `Show unassigned only (${issues.filter((i) => !i.department).length})`}
          </Button>
        </Stack>

        {filteredIssues.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, borderRadius: 4, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              No issues match your filters.
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
                  <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: "wrap", rowGap: 0.5 }}>
                    <StatusChip status={issue.status} size="small" />
                    {issue.category && <CategoryChip category={issue.category} size="small" />}
                    {issue.department && (
                      <SoftChip
                        color={tokens.primary}
                        icon={<DeptIcon sx={{ fontSize: "14px !important" }} />}
                        label={issue.department}
                        size="small"
                      />
                    )}
                  </Stack>
                </Box>

                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ width: { xs: "100%", md: "auto" } }}
                >
                  <FormControl size="small" sx={{ minWidth: 220, flex: { xs: 1, md: "initial" } }}>
                    <Select
                      value={selections[issue.id] || ""}
                      onChange={(e) =>
                        setSelections((prev) => ({ ...prev, [issue.id]: e.target.value }))
                      }
                      displayEmpty
                    >
                      <MenuItem value="" disabled>
                        Choose department…
                      </MenuItem>
                      {DEPARTMENTS.map((dept) => (
                        <MenuItem key={dept} value={dept}>
                          {dept}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    variant="contained"
                    size="small"
                    disabled={!selections[issue.id] || sendingId === issue.id}
                    onClick={() => handleSend(issue)}
                    startIcon={
                      sendingId === issue.id ? (
                        <CircularProgress size={14} sx={{ color: "#fff" }} />
                      ) : justSentId === issue.id ? (
                        <CheckIcon fontSize="small" />
                      ) : (
                        <SendIcon fontSize="small" />
                      )
                    }
                    sx={{ whiteSpace: "nowrap" }}
                  >
                    {justSentId === issue.id ? "Sent" : "Send to Department"}
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

export default TransferDepartment;
