import React, { useState, useEffect, useMemo } from "react";
import { Box, Typography, Paper, Stack, CircularProgress, Alert, Fade } from "@mui/material";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { issuesAPI } from "../api/api";
import { getStatusMeta, STATUS_META } from "../constants/statusMeta";
import { tokens } from "../theme";

const DEFAULT_CENTER = [12.9716, 77.5946]; // Bengaluru — used only when no issues have coordinates yet
const DEFAULT_ZOOM = 12;

// Re-fits the map to the current marker set whenever it changes, instead of
// leaving the view pinned to the default center.
const FitBounds = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    map.fitBounds(points, { padding: [40, 40], maxZoom: 16 });
  }, [points, map]);
  return null;
};

const MapView = () => {
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await issuesAPI.getAll();
        setIssues(Array.isArray(response) ? response : response.issues || []);
        setError("");
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Failed to load issues");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const geoIssues = useMemo(
    () =>
      issues
        .map((issue) => ({
          ...issue,
          lat: parseFloat(issue.latitude),
          lng: parseFloat(issue.longitude),
        }))
        .filter((issue) => !isNaN(issue.lat) && !isNaN(issue.lng)),
    [issues]
  );

  const points = useMemo(() => geoIssues.map((i) => [i.lat, i.lng]), [geoIssues]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Fade in timeout={350}>
      <Box sx={{ p: { xs: 2, md: 3 }, display: "flex", flexDirection: "column", height: "calc(100vh - 68px)" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ sm: "center" }}
          spacing={1}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="h4" sx={{ mb: 0.5 }}>
              Map View
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {geoIssues.length} of {issues.length} reported issues have location data.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} flexWrap="wrap">
            {Object.entries(STATUS_META).map(([status, meta]) => (
              <Stack key={status} direction="row" spacing={0.75} alignItems="center">
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: meta.color,
                    flexShrink: 0,
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {meta.label}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Paper
          variant="outlined"
          sx={{ flexGrow: 1, borderRadius: 4, overflow: "hidden", minHeight: 420 }}
        >
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            style={{ width: "100%", height: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds points={points} />
            {geoIssues.map((issue) => {
              const meta = getStatusMeta(issue.status);
              return (
                <CircleMarker
                  key={issue.id}
                  center={[issue.lat, issue.lng]}
                  radius={9}
                  pathOptions={{
                    color: meta.color,
                    fillColor: meta.color,
                    fillOpacity: 0.75,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <Box sx={{ minWidth: 180 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                        {issue.title}
                      </Typography>
                      <Typography variant="caption" sx={{ display: "block", color: meta.color, fontWeight: 600, mb: 0.5 }}>
                        {meta.label}
                        {issue.category ? ` · ${issue.category}` : ""}
                      </Typography>
                      {issue.department && (
                        <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mb: 0.75 }}>
                          {issue.department}
                        </Typography>
                      )}
                      <Typography
                        variant="caption"
                        sx={{ display: "block", color: tokens.primary, cursor: "pointer", fontWeight: 600 }}
                        onClick={() => navigate(`/admin/issue/${issue.id}`)}
                      >
                        View details →
                      </Typography>
                    </Box>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </Paper>
      </Box>
    </Fade>
  );
};

export default MapView;
