import React, { useState, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stack,
  Fade,
  Grow,
  Chip,
} from "@mui/material";
import {
  ShieldOutlined as ShieldIcon,
  PhotoCamera as CameraIcon,
  MyLocation as LocationIcon,
  CheckCircle as CheckIcon,
  ReplayOutlined as ReplayIcon,
  LoginOutlined as LoginIcon,
  RuleOutlined as BypassIcon,
  ContentCopyOutlined as CopyIcon,
  SearchOutlined as TrackIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { issuesAPI } from "../api/api";
import { tokens } from "../theme";

// The backend rejects photos it can't verify via EXIF/GPS (no camera
// metadata, missing date, too old, taken too far from the reported spot).
// That's a real fraud-prevention check, but desktop browser uploads often
// strip EXIF entirely, which would otherwise hard-block honest reports —
// so those specific failures offer a "submit anyway" fallback that forces
// manual review instead of silently skipping verification.
const isMetadataError = (message) => {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("metadata") ||
    m.includes("24 hours") ||
    m.includes("away from reported location") ||
    m.includes("gps")
  );
};

const ReportIssue = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [coords, setCoords] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle"); // idle | loading | done | error
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [metadataBypassAvailable, setMetadataBypassAvailable] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError("");
    setMetadataBypassAvailable(false);
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      setError("Your browser doesn't support location access.");
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationStatus("done");
        setError("");
      },
      () => {
        setLocationStatus("error");
        setError("Couldn't get your location. Please allow location access and try again.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPhoto(null);
    setPreviewUrl("");
    setCoords(null);
    setLocationStatus("idle");
    setError("");
    setMetadataBypassAvailable(false);
    setTrackingCode("");
    setCodeCopied(false);
    setSubmitted(false);
  };

  const submitReport = async (skipMetadataCheck) => {
    try {
      setSubmitting(true);
      setError("");
      const response = await issuesAPI.create({
        title: title.trim(),
        description: description.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        imageFile: photo,
        skipMetadataCheck,
      });
      setTrackingCode(response.tracking_code || "");
      setSubmitted(true);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        err.message ||
        "Failed to submit report. Please try again.";
      setError(message);
      setMetadataBypassAvailable(!skipMetadataCheck && isMetadataError(message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setMetadataBypassAvailable(false);

    if (!title.trim() || !description.trim()) {
      setError("Please fill in a title and description.");
      return;
    }
    if (!photo) {
      setError("Please attach a photo of the issue.");
      return;
    }
    if (!coords) {
      setError("Please share your location so we know where the issue is.");
      return;
    }

    submitReport(false);
  };

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
        <Stack direction="row" spacing={0.5}>
          <Button
            size="small"
            color="inherit"
            startIcon={<TrackIcon fontSize="small" />}
            onClick={() => navigate("/track")}
            sx={{ color: "text.secondary" }}
          >
            Track a report
          </Button>
          <Button
            size="small"
            color="inherit"
            startIcon={<LoginIcon fontSize="small" />}
            onClick={() => navigate("/admin/login")}
            sx={{ color: "text.secondary" }}
          >
            Officer Login
          </Button>
        </Stack>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 2,
          pb: 6,
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 480 }}>
          {submitted ? (
            <Grow in>
              <Box sx={{ textAlign: "center", py: 4 }}>
                <CheckIcon sx={{ fontSize: 64, color: tokens.good, mb: 2 }} />
                <Typography variant="h5" sx={{ mb: 1 }}>
                  Report submitted
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Thanks for helping keep your neighborhood in good shape. Your
                  report has been sent to the city team for review.
                </Typography>

                {trackingCode && (
                  <Box
                    sx={{
                      mb: 3,
                      p: 2.5,
                      borderRadius: 3,
                      border: "1px dashed",
                      borderColor: tokens.primary,
                      backgroundColor: "rgba(42,120,214,0.04)",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
                      Save this tracking code to check your report's status later
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                      <Typography
                        variant="h5"
                        sx={{ fontWeight: 700, letterSpacing: 1, color: tokens.primary }}
                      >
                        {trackingCode}
                      </Typography>
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<CopyIcon fontSize="small" />}
                        onClick={() => {
                          navigator.clipboard?.writeText(trackingCode);
                          setCodeCopied(true);
                          setTimeout(() => setCodeCopied(false), 1800);
                        }}
                      >
                        {codeCopied ? "Copied" : "Copy"}
                      </Button>
                    </Stack>
                  </Box>
                )}

                <Stack direction="row" spacing={1.5} justifyContent="center">
                  <Button
                    variant="outlined"
                    startIcon={<ReplayIcon />}
                    onClick={resetForm}
                  >
                    Report another issue
                  </Button>
                  {trackingCode && (
                    <Button
                      variant="contained"
                      startIcon={<TrackIcon fontSize="small" />}
                      onClick={() => navigate(`/track/${trackingCode}`)}
                    >
                      Track this report
                    </Button>
                  )}
                </Stack>
              </Box>
            </Grow>
          ) : (
            <Fade in timeout={400}>
              <Box>
                <Typography variant="h4" sx={{ mb: 0.5 }}>
                  Report an issue
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                  Spotted a pothole, overflowing bin, or broken streetlight? Let
                  us know — no account needed.
                </Typography>

                {error && (
                  <Alert severity="error" sx={{ mb: metadataBypassAvailable ? 1 : 2, borderRadius: 2 }}>
                    {error}
                  </Alert>
                )}

                {metadataBypassAvailable && (
                  <Alert
                    severity="info"
                    icon={false}
                    sx={{ mb: 2, borderRadius: 2 }}
                    action={
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<BypassIcon fontSize="small" />}
                        disabled={submitting}
                        onClick={() => submitReport(true)}
                        sx={{ whiteSpace: "nowrap" }}
                      >
                        Submit anyway
                      </Button>
                    }
                  >
                    We couldn't automatically verify this photo. You can still
                    submit it — our team will review it manually.
                  </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit}>
                  <TextField
                    fullWidth
                    label="What's the issue?"
                    placeholder="e.g. Large pothole on Main Street"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    sx={{ mb: 2.5 }}
                  />
                  <TextField
                    fullWidth
                    label="Description"
                    placeholder="Add any helpful details…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    multiline
                    rows={3}
                    sx={{ mb: 2.5 }}
                  />

                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Photo
                  </Typography>
                  <Box
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                      mb: 2.5,
                      border: "1px dashed",
                      borderColor: "divider",
                      borderRadius: 3,
                      p: previewUrl ? 1 : 3,
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "border-color 0.15s ease, background-color 0.15s ease",
                      "&:hover": {
                        borderColor: tokens.primary,
                        backgroundColor: "rgba(42,120,214,0.03)",
                      },
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      hidden
                      onChange={handlePhotoSelect}
                    />
                    {previewUrl ? (
                      <Box
                        component="img"
                        src={previewUrl}
                        alt="Selected"
                        sx={{ width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 2 }}
                      />
                    ) : (
                      <Stack alignItems="center" spacing={1} sx={{ color: "text.secondary" }}>
                        <CameraIcon />
                        <Typography variant="body2">
                          Tap to take or choose a photo
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          Use your camera for the most accurate report
                        </Typography>
                      </Stack>
                    )}
                  </Box>

                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Location
                  </Typography>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3.5 }}>
                    <Button
                      variant="outlined"
                      startIcon={
                        locationStatus === "loading" ? (
                          <CircularProgress size={16} />
                        ) : (
                          <LocationIcon fontSize="small" />
                        )
                      }
                      onClick={handleUseLocation}
                      disabled={locationStatus === "loading"}
                    >
                      {coords ? "Update location" : "Use my location"}
                    </Button>
                    {locationStatus === "done" && coords && (
                      <Chip
                        size="small"
                        label={`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`}
                        sx={{
                          backgroundColor: "rgba(12,163,12,0.1)",
                          color: tokens.good,
                          fontWeight: 600,
                        }}
                      />
                    )}
                  </Stack>

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={submitting}
                    sx={{ py: 1.4 }}
                  >
                    {submitting ? (
                      <CircularProgress size={22} sx={{ color: "#fff" }} />
                    ) : (
                      "Submit report"
                    )}
                  </Button>
                </Box>
              </Box>
            </Fade>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ReportIssue;
