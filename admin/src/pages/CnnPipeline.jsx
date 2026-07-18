import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Stack,
  Stepper,
  Step,
  StepLabel,
  Fade,
  Paper,
  Chip,
} from "@mui/material";
import {
  PlayArrow as RunIcon,
  Psychology as PipelineIcon,
  BarChartOutlined as ModelComparisonIcon,
} from "@mui/icons-material";
import { issuesAPI } from "../api/api";
import { CNN_STEPS, STEP_INTERVAL_MS, minDelay } from "../constants/cnnPipeline";
import { CATEGORY_META } from "../constants/statusMeta";
import { tokens } from "../theme";

// Illustrative "activation vector" for the dense-layer step — not real
// intermediate values (see the info banner below), just a deterministic
// bar pattern so the panel isn't static during that stage.
const ACTIVATION_BARS = Array.from({ length: 18 }, (_, i) => 20 + ((i * 37 + 13) % 75));
const CATEGORY_ORDER = Object.keys(CATEGORY_META);

const CnnPipeline = () => {
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [scores, setScores] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoadingIssues(true);
        const response = await issuesAPI.getAll();
        const withPhotos = (Array.isArray(response) ? response : response.issues || [])
          .filter((i) => i.photo_url)
          .sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt))
          .slice(0, 24);
        setIssues(withPhotos);
        if (withPhotos.length > 0) setSelectedId(withPhotos[0].id);
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to load issues");
      } finally {
        setLoadingIssues(false);
      }
    })();
  }, []);

  const selectedIssue = useMemo(
    () => issues.find((i) => i.id === selectedId) || null,
    [issues, selectedId]
  );

  const activeStepDef = currentStep >= 0 ? CNN_STEPS[currentStep] : null;

  const handleSelect = (id) => {
    if (running) return;
    setSelectedId(id);
    setCurrentStep(-1);
    setScores(null);
    setResult(null);
    setError("");
  };

  const handleRun = async () => {
    if (!selectedIssue) return;
    let stepTimer;
    try {
      setRunning(true);
      setError("");
      setScores(null);
      setResult(null);
      setCurrentStep(0);

      stepTimer = setInterval(() => {
        setCurrentStep((prev) => Math.min(prev + 1, CNN_STEPS.length - 1));
      }, STEP_INTERVAL_MS);

      const minAnimationMs = CNN_STEPS.length * STEP_INTERVAL_MS;
      const [updated] = await Promise.all([
        issuesAPI.classify(selectedIssue.id),
        minDelay(minAnimationMs),
      ]);

      setCurrentStep(CNN_STEPS.length - 1);
      setScores(updated.scores || null);
      setResult({ category: updated.category, confidence: updated.classification_confidence });
      setIssues((prev) =>
        prev.map((i) =>
          i.id === updated.id
            ? { ...i, category: updated.category, classification_confidence: updated.classification_confidence }
            : i
        )
      );
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Pipeline run failed");
    } finally {
      clearInterval(stepTimer);
      setRunning(false);
    }
  };

  return (
    <Fade in timeout={350}>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          sx={{ mb: 0.5, gap: 1 }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <PipelineIcon sx={{ color: tokens.primary }} />
            <Typography variant="h4">CNN Pipeline</Typography>
          </Stack>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ModelComparisonIcon fontSize="small" />}
            onClick={() => navigate("/admin/model-comparison")}
          >
            View Model Comparison
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 640 }}>
          Pick a reported photo and watch it move through the classifier's
          pipeline. Inference itself is one real call to ml-service — the
          stages below are an illustrative breakdown of that pipeline, paced
          against the real request. The final probabilities are the model's
          actual output. See how this model was chosen — trained from
          scratch and benchmarked against five transfer-learned architectures
          — on the{" "}
          <Typography
            component="span"
            onClick={() => navigate("/admin/model-comparison")}
            sx={{ color: tokens.primary, fontWeight: 600, cursor: "pointer" }}
          >
            Model Comparison
          </Typography>{" "}
          page.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4, mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
            Choose a photo
          </Typography>
          {loadingIssues ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : issues.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No issue photos available yet.
            </Typography>
          ) : (
            <Stack direction="row" spacing={1.5} sx={{ overflowX: "auto", pb: 1 }}>
              {issues.map((issue) => (
                <Box
                  key={issue.id}
                  onClick={() => handleSelect(issue.id)}
                  sx={{
                    flex: "0 0 auto",
                    width: 96,
                    cursor: running ? "default" : "pointer",
                    opacity: running && selectedId !== issue.id ? 0.5 : 1,
                    borderRadius: 2.5,
                    border: "2px solid",
                    borderColor: selectedId === issue.id ? tokens.primary : "transparent",
                    p: 0.5,
                    transition: "border-color 0.15s ease, opacity 0.15s ease",
                  }}
                >
                  <Box
                    component="img"
                    src={issue.photo_url}
                    alt={issue.title}
                    sx={{
                      width: "100%",
                      height: 72,
                      objectFit: "cover",
                      borderRadius: 1.75,
                      display: "block",
                    }}
                  />
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{ display: "block", mt: 0.5, color: "text.secondary" }}
                  >
                    {issue.title}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>

        {selectedIssue && (
          <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 3 }}>
            {/* Image with per-stage filter */}
            <Card sx={{ flex: 1, width: "100%" }}>
              <CardContent>
                <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                  {selectedIssue.title}
                </Typography>
                <Box sx={{ position: "relative", borderRadius: 2, overflow: "hidden" }}>
                  <Box
                    component="img"
                    src={selectedIssue.photo_url}
                    alt={selectedIssue.title}
                    sx={{
                      width: "100%",
                      maxHeight: 380,
                      objectFit: "contain",
                      display: "block",
                      backgroundColor: "background.default",
                      filter: activeStepDef ? activeStepDef.filter : "none",
                      transition: "filter 0.5s ease",
                    }}
                  />
                  {running && (
                    <Box
                      sx={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        height: 3,
                        background: `linear-gradient(90deg, transparent, ${tokens.primary}, transparent)`,
                        boxShadow: `0 0 14px 3px ${tokens.primary}`,
                        animation: "cnnScanSweep 1.8s ease-in-out infinite",
                        "@keyframes cnnScanSweep": {
                          "0%": { top: "2%" },
                          "50%": { top: "96%" },
                          "100%": { top: "2%" },
                        },
                      }}
                    />
                  )}
                </Box>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={running ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : <RunIcon />}
                  onClick={handleRun}
                  disabled={running}
                  sx={{ mt: 2.5 }}
                >
                  {running ? "Running…" : result ? "Run again" : "Run pipeline"}
                </Button>
              </CardContent>
            </Card>

            {/* Stepper + stage detail + result */}
            <Card sx={{ flex: 1, width: "100%" }}>
              <CardContent>
                <Stepper
                  activeStep={Math.max(currentStep, 0)}
                  orientation="vertical"
                  sx={{
                    "& .MuiStepLabel-label": { fontSize: "0.85rem" },
                  }}
                >
                  {CNN_STEPS.map((step, index) => (
                    <Step key={step.label} completed={currentStep > index}>
                      <StepLabel
                        optional={
                          <Stack spacing={0.5} sx={{ mt: 0.25 }}>
                            <Chip
                              label={step.tag === "real" ? "Real" : "Illustrative"}
                              size="small"
                              sx={{
                                alignSelf: "flex-start",
                                height: 18,
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                backgroundColor:
                                  step.tag === "real"
                                    ? "rgba(12,163,12,0.12)"
                                    : "rgba(137,135,129,0.16)",
                                color: step.tag === "real" ? tokens.good : tokens.textMuted,
                              }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                              {step.detail}
                            </Typography>
                          </Stack>
                        }
                      >
                        {step.label}
                      </StepLabel>
                      {currentStep === index && (
                        <Box sx={{ pl: 0.5, pb: 2, pt: 0.5 }}>
                          {running && (
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              sx={{ mb: step.showActivations || step.showScores ? 1.5 : 0 }}
                            >
                              <CircularProgress size={14} thickness={6} sx={{ color: tokens.primary }} />
                              <Typography variant="caption" sx={{ color: tokens.primary, fontWeight: 700 }}>
                                Processing…
                              </Typography>
                            </Stack>
                          )}
                          {step.showActivations && (
                            <Fade in>
                              <Stack direction="row" spacing={0.5} alignItems="flex-end" sx={{ height: 48 }}>
                                {ACTIVATION_BARS.map((h, i) => (
                                  <Box
                                    key={i}
                                    sx={{
                                      width: 6,
                                      height: `${h}%`,
                                      borderRadius: 999,
                                      backgroundColor: tokens.primary,
                                      opacity: 0.35 + (h / 100) * 0.5,
                                      transition: "height 0.3s ease",
                                    }}
                                  />
                                ))}
                              </Stack>
                            </Fade>
                          )}
                          {step.showScores && (
                            <Fade in>
                              <Stack spacing={1}>
                                {CATEGORY_ORDER.map((cat) => {
                                  const meta = CATEGORY_META[cat];
                                  const value = scores ? scores[cat] || 0 : 0;
                                  return (
                                    <Box key={cat}>
                                      <Stack direction="row" justifyContent="space-between">
                                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                          {cat}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {scores ? `${Math.round(value * 100)}%` : "…"}
                                        </Typography>
                                      </Stack>
                                      <Box
                                        sx={{
                                          height: 8,
                                          borderRadius: 999,
                                          backgroundColor: "background.default",
                                          overflow: "hidden",
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            height: "100%",
                                            width: scores ? `${value * 100}%` : "0%",
                                            backgroundColor: meta.color,
                                            transition: "width 0.5s ease",
                                          }}
                                        />
                                      </Box>
                                    </Box>
                                  );
                                })}
                              </Stack>
                            </Fade>
                          )}
                        </Box>
                      )}
                    </Step>
                  ))}
                </Stepper>

                {result && (
                  <Fade in>
                    <Box
                      sx={{
                        mt: 2,
                        p: 2,
                        borderRadius: 2.5,
                        backgroundColor: "background.default",
                        textAlign: "center",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Predicted category
                      </Typography>
                      <Typography variant="h6" sx={{ color: CATEGORY_META[result.category]?.color, fontWeight: 700 }}>
                        {result.category} · {Math.round((result.confidence || 0) * 100)}%
                      </Typography>
                    </Box>
                  </Fade>
                )}
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>
    </Fade>
  );
};

export default CnnPipeline;
