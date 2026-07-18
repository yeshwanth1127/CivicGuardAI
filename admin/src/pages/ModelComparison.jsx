import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  CircularProgress,
  Alert,
  Fade,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from "@mui/material";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { EmojiEvents as WinnerIcon } from "@mui/icons-material";
import { modelComparisonAPI } from "../api/api";
import { tokens } from "../theme";

// Fixed categorical order shared with statusMeta.js's CATEGORY_META — slot 1
// (blue) is reserved for CustomCNN since it's the architecture we designed
// ourselves, the rest follow the app's validated categorical sequence.
const ARCH_META = {
  custom_cnn: { label: "Custom CNN", color: tokens.primary },
  alexnet: { label: "AlexNet", color: "#008300" },
  vgg16: { label: "VGG16", color: "#e87ba4" },
  vgg19: { label: "VGG19", color: "#eda100" },
  inception: { label: "InceptionV3", color: "#1baf7a" },
  mobilenet: { label: "MobileNetV2", color: "#eb6834" },
};
const ARCH_ORDER = ["custom_cnn", "alexnet", "vgg16", "vgg19", "inception", "mobilenet"];

const ACCURACY_COLOR = tokens.primary;
const F1_COLOR = "#eb6834";

const HEATMAP_STEPS = [
  "#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7",
  "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281", "#0d366b",
];
const heatColor = (t) => {
  const clamped = Math.min(1, Math.max(0, t));
  return HEATMAP_STEPS[Math.round(clamped * (HEATMAP_STEPS.length - 1))];
};
const heatTextColor = (t) => (t > 0.55 ? "#ffffff" : tokens.textPrimary);

const formatPct = (value) => (value == null ? "—" : `${(value * 100).toFixed(1)}%`);
const formatMs = (value) => (value == null ? "—" : `${value.toFixed(1)} ms`);
const formatSeconds = (value) =>
  value == null ? "—" : value < 120 ? `${value.toFixed(0)}s` : `${(value / 60).toFixed(1)}m`;
const formatParams = (value) =>
  value == null ? "—" : value >= 1e6 ? `${(value / 1e6).toFixed(1)}M` : `${(value / 1e3).toFixed(0)}K`;

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

const ModelComparison = () => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notReady, setNotReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await modelComparisonAPI.get();
        setResults(data);
        setError("");
      } catch (err) {
        if (err.response?.status === 404) {
          setNotReady(true);
        } else {
          setError(
            err.response?.data?.detail ||
              err.message ||
              "Could not reach the ml-service. Is it running on ML_SERVICE_URL?"
          );
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const archRows = useMemo(() => {
    if (!results) return [];
    return ARCH_ORDER.filter((id) => results[id]).map((id) => ({ id, ...results[id] }));
  }, [results]);

  const barData = useMemo(
    () =>
      archRows.map((row) => ({
        name: ARCH_META[row.id].label,
        Accuracy: row.accuracy,
        "F1 Score": row.f1_macro,
      })),
    [archRows]
  );

  const winner = results?.winner;
  const winnerRow = winner ? results[winner] : null;

  const confusionMax = useMemo(() => {
    if (!winnerRow) return 1;
    return Math.max(1, ...winnerRow.confusion_matrix.flat());
  }, [winnerRow]);

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
          Model Comparison
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Custom CNN vs. five transfer-learned architectures, trained and evaluated on an
          identical split of the issue-photo dataset (see ml-service/).
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {notReady && !error && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            No comparison results yet. Run the training pipeline
            (<code>ml-service/training/compare.py --all</code>, typically on Colab) and drop its{" "}
            <code>artifacts/</code> output into <code>ml-service/artifacts/</code>, then reload
            this page.
          </Alert>
        )}

        {archRows.length > 0 && (
          <>
            {winner && (
              <Chip
                icon={<WinnerIcon fontSize="small" />}
                label={`Production model: ${ARCH_META[winner]?.label || winner}`}
                sx={{
                  mb: 3,
                  bgcolor: `${tokens.good}1a`,
                  color: tokens.good,
                  fontWeight: 700,
                  height: 32,
                }}
              />
            )}

            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, borderRadius: 4 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Architecture</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Accuracy</TableCell>
                    <TableCell align="right">Precision</TableCell>
                    <TableCell align="right">Recall</TableCell>
                    <TableCell align="right">F1 (macro)</TableCell>
                    <TableCell align="right">Params</TableCell>
                    <TableCell align="right">Size</TableCell>
                    <TableCell align="right">Train time</TableCell>
                    <TableCell align="right">Inference</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {archRows.map((row) => (
                    <TableRow
                      key={row.id}
                      sx={row.id === winner ? { bgcolor: `${tokens.good}0d` } : undefined}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              bgcolor: ARCH_META[row.id].color,
                              flexShrink: 0,
                            }}
                          />
                          {ARCH_META[row.id].label}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {row.from_scratch ? "From scratch" : "Transfer learning"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{formatPct(row.accuracy)}</TableCell>
                      <TableCell align="right">{formatPct(row.precision_macro)}</TableCell>
                      <TableCell align="right">{formatPct(row.recall_macro)}</TableCell>
                      <TableCell align="right">{formatPct(row.f1_macro)}</TableCell>
                      <TableCell align="right">{formatParams(row.param_count)}</TableCell>
                      <TableCell align="right">
                        {row.model_size_mb == null ? "—" : `${row.model_size_mb.toFixed(1)} MB`}
                      </TableCell>
                      <TableCell align="right">{formatSeconds(row.train_time_seconds)}</TableCell>
                      <TableCell align="right">{formatMs(row.inference_latency_ms)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Stack direction="row" flexWrap="wrap" sx={{ gap: 2.5, mb: 2.5 }}>
              <ChartCard title="Accuracy vs. F1 by architecture" subtitle="Held-out test set">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke={tokens.divider} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: tokens.textMuted, fontSize: 12 }}
                      axisLine={{ stroke: tokens.divider }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => `${Math.round(v * 100)}%`}
                      domain={[0, 1]}
                      tick={{ fill: tokens.textMuted, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip
                      formatter={(value) => formatPct(value)}
                      cursor={{ fill: "rgba(11,11,11,0.03)" }}
                      contentStyle={{ borderRadius: 10, border: `1px solid ${tokens.divider}` }}
                    />
                    <Legend
                      formatter={(value) => (
                        <span style={{ color: tokens.textSecondary, fontSize: 12 }}>{value}</span>
                      )}
                    />
                    <Bar dataKey="Accuracy" fill={ACCURACY_COLOR} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="F1 Score" fill={F1_COLOR} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {winnerRow && (
                <ChartCard
                  title={`Confusion matrix — ${ARCH_META[winner]?.label || winner}`}
                  subtitle="Rows = actual, columns = predicted"
                  height={Math.max(280, winnerRow.class_names.length * 42 + 60)}
                >
                  <Box sx={{ overflow: "auto", height: "100%" }}>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: `120px repeat(${winnerRow.class_names.length}, 1fr)`,
                        gap: "2px",
                        minWidth: 480,
                      }}
                    >
                      <Box />
                      {winnerRow.class_names.map((name) => (
                        <Box
                          key={`col-${name}`}
                          sx={{
                            fontSize: 11,
                            color: tokens.textMuted,
                            textAlign: "center",
                            writingMode: "vertical-rl",
                            transform: "rotate(180deg)",
                            pb: 0.5,
                          }}
                        >
                          {name}
                        </Box>
                      ))}
                      {winnerRow.confusion_matrix.map((row, rowIdx) => (
                        <React.Fragment key={`row-${rowIdx}`}>
                          <Box
                            sx={{
                              fontSize: 11,
                              color: tokens.textMuted,
                              display: "flex",
                              alignItems: "center",
                              pr: 1,
                            }}
                          >
                            {winnerRow.class_names[rowIdx]}
                          </Box>
                          {row.map((value, colIdx) => {
                            const t = value / confusionMax;
                            return (
                              <Box
                                key={`cell-${rowIdx}-${colIdx}`}
                                sx={{
                                  bgcolor: heatColor(t),
                                  color: heatTextColor(t),
                                  borderRadius: 1,
                                  aspectRatio: "1 / 1",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                {value}
                              </Box>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </Box>
                  </Box>
                </ChartCard>
              )}
            </Stack>

            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 4 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.25 }}>
                Training curves
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mb: 1.5 }}>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Box sx={{ width: 16, height: 2, bgcolor: tokens.primary }} />
                  <Typography variant="caption" color="text.secondary">
                    Train accuracy
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Box
                    sx={{
                      width: 16,
                      height: 0,
                      borderTop: `2px dashed ${tokens.textMuted}`,
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Validation accuracy
                  </Typography>
                </Stack>
              </Stack>
              <Stack direction="row" flexWrap="wrap" sx={{ gap: 2 }}>
                {archRows.map((row) => {
                  const epochs = row.history?.accuracy?.map((_, i) => ({
                    epoch: i + 1,
                    train: row.history.accuracy[i],
                    val: row.history.val_accuracy?.[i],
                  }));
                  return (
                    <Box key={row.id} sx={{ flex: "1 1 260px", minWidth: 240 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, display: "block", mb: 0.5 }}>
                        {ARCH_META[row.id].label}
                      </Typography>
                      <Box sx={{ height: 140 }}>
                        {epochs?.length ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={epochs} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                              <CartesianGrid stroke={tokens.divider} vertical={false} />
                              <XAxis dataKey="epoch" tick={{ fill: tokens.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                              <YAxis
                                domain={[0, 1]}
                                tick={{ fill: tokens.textMuted, fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                                width={30}
                              />
                              <Tooltip
                                formatter={(value) => formatPct(value)}
                                contentStyle={{ borderRadius: 10, border: `1px solid ${tokens.divider}` }}
                              />
                              <Line type="monotone" dataKey="train" stroke={ARCH_META[row.id].color} strokeWidth={2} dot={false} />
                              <Line
                                type="monotone"
                                dataKey="val"
                                stroke={tokens.textMuted}
                                strokeWidth={2}
                                strokeDasharray="4 3"
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            No history recorded.
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            </Paper>
          </>
        )}
      </Box>
    </Fade>
  );
};

export default ModelComparison;
