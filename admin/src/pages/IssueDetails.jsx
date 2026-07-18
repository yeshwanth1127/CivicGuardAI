import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  CardMedia,
  Fade,
  Grow,
  LinearProgress,
  Stack,
  Divider,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  CloudUpload as UploadIcon,
  AutoAwesome as ClassifyIcon,
  PlaceOutlined as PlaceIcon,
  ScheduleOutlined as ScheduleIcon,
} from "@mui/icons-material";
import { issuesAPI } from "../api/api";
import StatusChip from "../components/StatusChip";
import ReviewChip from "../components/ReviewChip";
import CategoryChip from "../components/CategoryChip";
import { CNN_STEPS, STEP_INTERVAL_MS, minDelay } from "../constants/cnnPipeline";

const SectionLabel = ({ children }) => (
  <Typography
    variant="caption"
    sx={{
      color: "text.secondary",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    }}
  >
    {children}
  </Typography>
);

const IssueDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [issue, setIssue] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [classifying, setClassifying] = useState(false);
  const [classifyError, setClassifyError] = useState("");
  const [classifyStep, setClassifyStep] = useState(0);
  const autoClassifyTriggered = useRef(false);

  useEffect(() => {
    fetchIssue();
  }, [id]);

  const fetchIssue = async () => {
    try {
      setLoading(true);
      const response = await issuesAPI.getById(id);
      setIssue(response.issue || response);
      setStatus(response.issue?.status || response.status || "Open");
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch issue");
    } finally {
      setLoading(false);
    }
  };

  const handleClassify = async () => {
    let stepTimer;
    try {
      setClassifying(true);
      setClassifyError("");
      setClassifyStep(0);

      // Advance through the 7 pipeline stages on a fixed cadence while the
      // real classify request runs in parallel.
      stepTimer = setInterval(() => {
        setClassifyStep((prev) => Math.min(prev + 1, CNN_STEPS.length - 1));
      }, STEP_INTERVAL_MS);

      const minAnimationMs = CNN_STEPS.length * STEP_INTERVAL_MS;
      const [updated] = await Promise.all([
        issuesAPI.classify(id),
        minDelay(minAnimationMs),
      ]);

      setClassifyStep(CNN_STEPS.length - 1);
      setIssue(updated.issue || updated);
    } catch (err) {
      setClassifyError(
        err.response?.data?.message || err.message || "Classification failed"
      );
    } finally {
      clearInterval(stepTimer);
      setClassifying(false);
    }
  };

  // For issues that predate this feature (or whose classification failed at
  // upload time), auto-trigger classification once so the processing
  // visualization has real content to show without a manual click.
  useEffect(() => {
    if (
      issue &&
      !issue.category &&
      issue.photo_url &&
      !classifying &&
      !autoClassifyTriggered.current
    ) {
      autoClassifyTriggered.current = true;
      handleClassify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issue]);

  const handleStatusChange = async () => {
    if (status === issue.status) return;

    try {
      setUpdating(true);
      await issuesAPI.updateStatus(id, status);
      setIssue({ ...issue, status });
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleImageUpload = async () => {
    if (!selectedFile) return;

    try {
      setUpdating(true);
      // Include current status so backend can store this as a resolved
      // photo when appropriate.
      await issuesAPI.uploadImage(id, selectedFile, { status });
      // Refresh issue data
      await fetchIssue();
      setSelectedFile(null);
      setPreviewUrl("");
      setError("");
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        err.message ||
        "Failed to upload image";
      setError(errorMsg);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!issue) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          Issue not found
        </Alert>
      </Box>
    );
  }

  return (
    <Fade in timeout={350}>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
          <Button
            startIcon={<BackIcon />}
            onClick={() => navigate("/admin")}
            color="inherit"
            sx={{ color: "text.secondary" }}
          >
            Back
          </Button>
        </Stack>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ sm: "center" }}
          spacing={1.5}
          sx={{ mb: 3 }}
        >
          <Typography variant="h4" component="h1">
            {issue.title}
          </Typography>
          <StatusChip status={issue.status} />
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {issue.needs_review && (
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
            <strong>This issue requires manual review.</strong> The photo
            metadata could not be verified. Please review the image and location
            details carefully before proceeding.
          </Alert>
        )}

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 3,
            alignItems: "flex-start",
          }}
        >
          {/* Left column — photos */}
          <Stack spacing={3} sx={{ flex: 1.15, width: "100%" }}>
            {issue.photo_url && (
              <Card>
                <CardContent>
                  <SectionLabel>Issue Photo</SectionLabel>
                  <Box sx={{ position: "relative", mt: 1.5 }}>
                    <CardMedia
                      component="img"
                      image={issue.photo_url}
                      alt="Issue"
                      sx={{
                        width: "100%",
                        height: "auto",
                        maxHeight: 420,
                        borderRadius: 2,
                        objectFit: "contain",
                        backgroundColor: "background.default",
                      }}
                    />
                    <Fade in={classifying} unmountOnExit>
                      <Box
                        sx={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 1,
                          backgroundColor: "rgba(11,11,11,0.78)",
                          backdropFilter: "blur(2px)",
                          borderRadius: 2,
                          color: "#fff",
                          p: 2,
                          textAlign: "center",
                        }}
                      >
                        <Typography variant="caption" sx={{ opacity: 0.75, fontWeight: 600 }}>
                          🧠 STEP {classifyStep + 1} OF {CNN_STEPS.length}
                        </Typography>
                        <Typography variant="body2" sx={{ minHeight: 20 }}>
                          {CNN_STEPS[classifyStep].label}
                        </Typography>
                        <Box sx={{ width: "70%" }}>
                          <LinearProgress
                            variant="determinate"
                            value={((classifyStep + 1) / CNN_STEPS.length) * 100}
                            color="inherit"
                            sx={{ borderRadius: 999, height: 5 }}
                          />
                        </Box>
                      </Box>
                    </Fade>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                    <Box>
                      <SectionLabel>Classification</SectionLabel>
                      <Box sx={{ mt: 1 }}>
                        {issue.category ? (
                          <Grow in appear timeout={500}>
                            <Box sx={{ display: "inline-block" }}>
                              <CategoryChip
                                category={issue.category}
                                confidence={issue.classification_confidence}
                              />
                            </Box>
                          </Grow>
                        ) : classifying ? (
                          <Typography variant="body2" color="text.secondary">
                            Analyzing…
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Not yet classified
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={
                        classifying ? (
                          <CircularProgress size={14} />
                        ) : (
                          <ClassifyIcon fontSize="small" />
                        )
                      }
                      onClick={handleClassify}
                      disabled={classifying || !issue.photo_url}
                    >
                      {issue.category ? "Re-classify" : "Classify"}
                    </Button>
                  </Stack>
                  {classifyError && (
                    <Typography variant="caption" color="error" sx={{ display: "block", mt: 1 }}>
                      {classifyError}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}

            {issue.resolved_photo_url && (
              <Card>
                <CardContent>
                  <SectionLabel>Resolved Photo</SectionLabel>
                  <CardMedia
                    component="img"
                    image={issue.resolved_photo_url}
                    alt="Resolved"
                    sx={{
                      width: "100%",
                      height: "auto",
                      maxHeight: 420,
                      mt: 1.5,
                      borderRadius: 2,
                      objectFit: "contain",
                      backgroundColor: "background.default",
                    }}
                  />
                </CardContent>
              </Card>
            )}
          </Stack>

          {/* Right column — details & actions */}
          <Stack spacing={3} sx={{ flex: 1, width: "100%" }}>
            <Card>
              <CardContent>
                <SectionLabel>Details</SectionLabel>

                <Typography variant="body1" sx={{ mt: 1.5, mb: 2.5 }}>
                  {issue.description}
                </Typography>

                <Stack spacing={1.5}>
                  {issue.address && (
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <PlaceIcon fontSize="small" sx={{ color: "text.secondary", mt: 0.2 }} />
                      <Typography variant="body2" color="text.secondary">
                        {issue.address}
                        <Typography component="span" variant="caption" sx={{ display: "block", color: "text.disabled" }}>
                          {issue.latitude}, {issue.longitude}
                        </Typography>
                      </Typography>
                    </Stack>
                  )}
                  <Stack direction="row" spacing={1} alignItems="center">
                    <ScheduleIcon fontSize="small" sx={{ color: "text.secondary" }} />
                    <Typography variant="body2" color="text.secondary">
                      {new Date(issue.created_at || issue.createdAt).toLocaleString()}
                    </Typography>
                  </Stack>
                </Stack>

                <Divider sx={{ my: 2.5 }} />

                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <SectionLabel>Review Status</SectionLabel>
                  <ReviewChip needsReview={issue.needs_review} />
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <SectionLabel>Update Status</SectionLabel>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1.5 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      label="Status"
                    >
                      <MenuItem value="Open">Open</MenuItem>
                      <MenuItem value="In Progress">In Progress</MenuItem>
                      <MenuItem value="Resolved">Resolved</MenuItem>
                    </Select>
                  </FormControl>
                  <Button
                    variant="contained"
                    onClick={handleStatusChange}
                    disabled={updating || status === issue.status}
                    sx={{ whiteSpace: "nowrap" }}
                  >
                    {updating ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "Update"}
                  </Button>
                </Stack>

                {status === "Resolved" && (
                  <>
                    <Divider sx={{ my: 2.5 }} />
                    <SectionLabel>Upload Resolution Image</SectionLabel>
                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                      <Button variant="outlined" component="label" startIcon={<UploadIcon />} size="small">
                        Select Image
                        <input type="file" hidden accept="image/*" onChange={handleFileSelect} />
                      </Button>
                      {selectedFile && (
                        <>
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 160 }}>
                            {selectedFile.name}
                          </Typography>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={handleImageUpload}
                            disabled={updating}
                          >
                            {updating ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "Upload"}
                          </Button>
                        </>
                      )}
                    </Stack>
                    {previewUrl && (
                      <Box sx={{ mt: 2 }}>
                        <CardMedia
                          component="img"
                          image={previewUrl}
                          alt="Preview"
                          sx={{
                            width: "100%",
                            height: "auto",
                            maxWidth: 260,
                            borderRadius: 2,
                            objectFit: "contain",
                          }}
                        />
                      </Box>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Box>
      </Box>
    </Fade>
  );
};

export default IssueDetails;
