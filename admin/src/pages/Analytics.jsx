import React, { useState, useEffect, useMemo } from "react";
import { Box, Typography, Paper, Stack, CircularProgress, Alert, Fade } from "@mui/material";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Assignment as TotalIcon,
  CheckCircle as ResolvedIcon,
  Schedule as OpenIcon,
  Timer as TimerIcon,
} from "@mui/icons-material";
import { issuesAPI } from "../api/api";
import StatTile from "../components/StatTile";
import { STATUS_META, CATEGORY_META } from "../constants/statusMeta";
import { DEPARTMENTS } from "../constants/departments";
import { tokens } from "../theme";

const CATEGORIES = Object.keys(CATEGORY_META);

const formatDuration = (hours) => {
  if (hours === null || hours === undefined || isNaN(hours)) return "—";
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
};

const dayKey = (value) => {
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const ChartCard = ({ title, subtitle, height = 280, children }) => (
  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4, flex: "1 1 420px", minWidth: 320 }}>
    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.25 }}>
      {title}
    </Typography>
    {subtitle && (
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
        {subtitle}
      </Typography>
    )}
    <Box sx={{ height, mt: subtitle ? 0 : 1.5 }}>{children}</Box>
  </Paper>
);

const EmptyState = ({ label }) => (
  <Box
    sx={{
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "text.disabled",
    }}
  >
    <Typography variant="body2">{label}</Typography>
  </Box>
);

const Analytics = () => {
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

  const stats = useMemo(() => {
    const total = issues.length;
    const resolved = issues.filter((i) => i.status === "Resolved");
    const open = issues.filter((i) => i.status === "Open").length;

    const resolutionHours = resolved
      .filter((i) => i.resolved_at)
      .map((i) => (new Date(i.resolved_at) - new Date(i.created_at)) / 3600000)
      .filter((h) => !isNaN(h) && h >= 0);
    const avgResolutionHours = resolutionHours.length
      ? resolutionHours.reduce((sum, h) => sum + h, 0) / resolutionHours.length
      : null;

    return {
      total,
      open,
      resolvedCount: resolved.length,
      resolvedPct: total ? Math.round((resolved.length / total) * 100) : 0,
      avgResolutionHours,
    };
  }, [issues]);

  const overTimeData = useMemo(() => {
    const counts = {};
    issues.forEach((issue) => {
      const key = dayKey(issue.created_at);
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count,
      }));
  }, [issues]);

  const categoryData = useMemo(() => {
    const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
    let uncategorized = 0;
    issues.forEach((issue) => {
      if (issue.category && counts[issue.category] !== undefined) {
        counts[issue.category] += 1;
      } else {
        uncategorized += 1;
      }
    });
    const rows = CATEGORIES.map((c) => ({ name: c, count: counts[c], color: CATEGORY_META[c].color }));
    if (uncategorized) {
      rows.push({ name: "Uncategorized", count: uncategorized, color: tokens.textMuted });
    }
    return rows;
  }, [issues]);

  const departmentData = useMemo(() => {
    const counts = Object.fromEntries(DEPARTMENTS.map((d) => [d, 0]));
    let unassigned = 0;
    issues.forEach((issue) => {
      if (issue.department && counts[issue.department] !== undefined) {
        counts[issue.department] += 1;
      } else {
        unassigned += 1;
      }
    });
    const rows = DEPARTMENTS.map((d) => ({
      name: d.length > 18 ? `${d.slice(0, 17)}…` : d,
      fullName: d,
      count: counts[d],
    })).filter((row) => row.count > 0);
    if (unassigned) {
      rows.push({ name: "Unassigned", fullName: "Unassigned", count: unassigned });
    }
    return rows.sort((a, b) => b.count - a.count);
  }, [issues]);

  const statusData = useMemo(
    () =>
      Object.keys(STATUS_META)
        .map((status) => ({
          name: STATUS_META[status].label,
          value: issues.filter((i) => i.status === status).length,
          color: STATUS_META[status].color,
        }))
        .filter((row) => row.value > 0),
    [issues]
  );

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
        <Typography variant="h4" sx={{ mb: 0.5 }}>
          Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Trends across every report — volume, category, department, and resolution speed.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Stack direction="row" spacing={1.5} sx={{ mb: 3, flexWrap: "wrap", rowGap: 1.5 }}>
          <StatTile
            icon={<TotalIcon fontSize="small" />}
            label="Total Issues"
            value={stats.total}
            color={tokens.primary}
            delay={0}
          />
          <StatTile
            icon={<OpenIcon fontSize="small" />}
            label="Open Right Now"
            value={stats.open}
            color={tokens.warning}
            delay={40}
          />
          <StatTile
            icon={<ResolvedIcon fontSize="small" />}
            label="Resolved"
            value={`${stats.resolvedCount} (${stats.resolvedPct}%)`}
            color={tokens.good}
            delay={80}
          />
          <StatTile
            icon={<TimerIcon fontSize="small" />}
            label="Avg. Resolution Time"
            value={formatDuration(stats.avgResolutionHours)}
            color={tokens.primaryDark}
            delay={120}
          />
        </Stack>

        <Stack direction="row" flexWrap="wrap" sx={{ gap: 2.5 }}>
          <ChartCard title="Issues reported over time" subtitle="Daily count, all history">
            {overTimeData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={overTimeData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="overTimeFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={tokens.primary} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={tokens.primary} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={tokens.divider} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: tokens.textMuted, fontSize: 12 }}
                    axisLine={{ stroke: tokens.divider }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: tokens.textMuted, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: `1px solid ${tokens.divider}` }}
                    labelStyle={{ color: tokens.textPrimary, fontWeight: 600 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Reports"
                    stroke={tokens.primary}
                    strokeWidth={2}
                    fill="url(#overTimeFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState label="No reports yet." />
            )}
          </ChartCard>

          <ChartCard title="By status" subtitle="Current state of all reports">
            {statusData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} stroke={tokens.surface} strokeWidth={2} />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    height={32}
                    formatter={(value) => <span style={{ color: tokens.textSecondary, fontSize: 12 }}>{value}</span>}
                  />
                  <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${tokens.divider}` }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState label="No reports yet." />
            )}
          </ChartCard>

          <ChartCard title="By category" subtitle="CNN-classified issue type">
            {categoryData.some((c) => c.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke={tokens.divider} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: tokens.textMuted, fontSize: 12 }}
                    axisLine={{ stroke: tokens.divider }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: tokens.textMuted, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(11,11,11,0.03)" }}
                    contentStyle={{ borderRadius: 10, border: `1px solid ${tokens.divider}` }}
                  />
                  <Bar dataKey="count" name="Issues" radius={[6, 6, 0, 0]}>
                    {categoryData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState label="No classified reports yet." />
            )}
          </ChartCard>

          <ChartCard title="By department" subtitle="Where issues have been routed">
            {departmentData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={departmentData}
                  layout="vertical"
                  margin={{ top: 8, right: 20, left: 8, bottom: 0 }}
                >
                  <CartesianGrid stroke={tokens.divider} horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fill: tokens.textMuted, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: tokens.textMuted, fontSize: 12 }}
                    axisLine={{ stroke: tokens.divider }}
                    tickLine={false}
                    width={130}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(11,11,11,0.03)" }}
                    contentStyle={{ borderRadius: 10, border: `1px solid ${tokens.divider}` }}
                    formatter={(value, name, props) => [value, props.payload.fullName]}
                  />
                  <Bar dataKey="count" name="Issues" fill={tokens.primary} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState label="No issues routed to a department yet." />
            )}
          </ChartCard>
        </Stack>
      </Box>
    </Fade>
  );
};

export default Analytics;
