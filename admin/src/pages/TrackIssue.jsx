import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stack,
  Fade,
  Stepper,
  Step,
  StepLabel,
  Paper,
} from "@mui/material";
import {
  ShieldOutlined as ShieldIcon,
  SearchOutlined as SearchIcon,
  ArrowBackOutlined as BackIcon,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { issuesAPI } from "../api/api";
import { tokens } from "../theme";
import StatusChip from "../components/StatusChip";
import CategoryChip from "../components/CategoryChip";

const STATUS_STEPS = ["Open", "In Progress", "Resolved"];

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const TrackIssue = () => {
  const navigate = useNavigate();
  const { code: codeParam } = useParams();

  const [code, setCode] = useState(codeParam || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const runLookup = async (lookupCode) => {
    const trimmed = (lookupCode || "").trim();
    if (!trimmed) {
      setError("Enter a tracking code to continue.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const data = await issuesAPI.track(trimmed);
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Couldn't look up that tracking code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (codeParam) {
      runLookup(codeParam);
    }
  }, [codeParam]);

  const handleSubmit = (e) => {
    e.preventDefault();
    runLookup(code);
  };

  const activeStep = result ? STATUS_STEPS.indexOf(result.status) : -1;

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: { xs: 2, sm: 4 },
          py: 2,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <ShieldIcon sx={{ color: tokens.primary }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            CivicFix
          </Typography>
        </Stack>
        <Button
          size="small"
          color="inherit"
          startIcon={<BackIcon fontSize="small" />}
          onClick={() => navigate("/")}
          sx={{ color: "text.secondary" }}
        >
          Report an issue
        </Button>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          px: 2,
          pt: { xs: 2, sm: 6 },
          pb: 6,
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 520 }}>
          <Fade in timeout={400}>
            <Box>
              <Typography variant="h4" sx={{ mb: 0.5 }}>
                Track your report
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Enter the tracking code you received when you submitted your
                report — no account needed.
              </Typography>

              <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3 }}>
                <Stack direction="row" spacing={1.5}>
                  <TextField
                    fullWidth
                    placeholder="e.g. CF-7K2M9Q"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    disabled={loading}
                    autoFocus={!codeParam}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    sx={{ px: 3, whiteSpace: "nowrap" }}
                    startIcon={
                      loading ? (
                        <CircularProgress size={16} sx={{ color: "#fff" }} />
                      ) : (
                        <SearchIcon fontSize="small" />
                      )
                    }
                  >
                    Track
                  </Button>
                </Stack>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              {result && (
                <Fade in>
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 4 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      sx={{ mb: 2.5 }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                          {result.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {result.tracking_code}
                        </Typography>
                      </Box>
                      <StatusChip status={result.status} size="small" />
                    </Stack>

                    <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
                      {STATUS_STEPS.map((step) => (
                        <Step key={step}>
                          <StepLabel>{step}</StepLabel>
                        </Step>
                      ))}
                    </Stepper>

                    {(result.photo_url || result.resolved_photo_url) && (
                      <Stack direction="row" spacing={1.5} sx={{ mb: 2.5 }}>
                        {result.photo_url && (
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                              Reported
                            </Typography>
                            <Box
                              component="img"
                              src={result.photo_url}
                              alt="Reported issue"
                              sx={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 2 }}
                            />
                          </Box>
                        )}
                        {result.resolved_photo_url && (
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                              Resolved
                            </Typography>
                            <Box
                              component="img"
                              src={result.resolved_photo_url}
                              alt="Resolved issue"
                              sx={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 2 }}
                            />
                          </Box>
                        )}
                      </Stack>
                    )}

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {result.description}
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }}>
                      {result.category && <CategoryChip category={result.category} size="small" />}
                      {result.department && (
                        <Typography
                          variant="caption"
                          sx={{
                            px: 1.25,
                            py: 0.5,
                            borderRadius: 999,
                            backgroundColor: "rgba(11,11,11,0.04)",
                            color: "text.secondary",
                            fontWeight: 600,
                          }}
                        >
                          {result.department}
                        </Typography>
                      )}
                    </Stack>

                    {result.address && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                        📍 {result.address}
                      </Typography>
                    )}

                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.disabled">
                        Reported {formatDate(result.created_at)}
                      </Typography>
                      {result.resolved_at && (
                        <Typography variant="caption" color="text.disabled">
                          Resolved {formatDate(result.resolved_at)}
                        </Typography>
                      )}
                    </Stack>
                  </Paper>
                </Fade>
              )}
            </Box>
          </Fade>
        </Box>
      </Box>
    </Box>
  );
};

export default TrackIssue;
