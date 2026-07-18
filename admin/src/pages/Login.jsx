import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Fade,
  Grow,
  Stack,
} from "@mui/material";
import { ShieldOutlined as ShieldIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { adminAuth } from "../api/api";
import { tokens } from "../theme";

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await adminAuth.login(formData.email, formData.password);
      localStorage.setItem("admin_token", response.token);
      // Department-tagged accounts land on their own scoped dashboard;
      // regular staff/admin accounts get the full panel.
      navigate(response.user?.department ? "/admin/dept" : "/admin");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Box
        sx={{
          flex: 1,
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          justifyContent: "space-between",
          p: 6,
          background: `linear-gradient(155deg, ${tokens.primaryDark} 0%, ${tokens.primary} 100%)`,
          color: "#fff",
        }}
      >
        <Fade in timeout={500}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <ShieldIcon fontSize="large" />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              CivicFix
            </Typography>
          </Stack>
        </Fade>
        <Grow in timeout={700}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, maxWidth: 420 }}>
              Keep your city moving.
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.85, maxWidth: 380 }}>
              Review citizen-reported issues, verify photo evidence, and track
              resolution — all from one place.
            </Typography>
          </Box>
        </Grow>
        <Typography variant="caption" sx={{ opacity: 0.6 }}>
          Officer &amp; Admin Portal
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
          backgroundColor: "background.paper",
        }}
      >
        <Fade in timeout={450}>
          <Box sx={{ width: "100%", maxWidth: 360 }}>
            <Box sx={{ mb: 4, display: { xs: "flex", md: "none" }, alignItems: "center", gap: 1 }}>
              <ShieldIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                CivicFix
              </Typography>
            </Box>

            <Typography variant="h5" sx={{ mb: 0.5 }}>
              Sign in
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Enter your officer credentials to continue.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoFocus
                sx={{ mb: 2.5 }}
                disabled={loading}
              />
              <TextField
                fullWidth
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                sx={{ mb: 3 }}
                disabled={loading}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ py: 1.4 }}
              >
                {loading ? <CircularProgress size={22} sx={{ color: "#fff" }} /> : "Sign in"}
              </Button>
            </Box>

            <Typography
              variant="caption"
              color="text.secondary"
              align="center"
              sx={{ mt: 4, display: "block" }}
            >
              Secure access for authorized personnel only.
            </Typography>
          </Box>
        </Fade>
      </Box>
    </Box>
  );
};

export default Login;
