// Shared pipeline stage definitions used by both the inline classification
// overlay (IssueDetails) and the dedicated CNN Pipeline visualization page.
//
// Real inference is one atomic backend call (MobileNetV2 embedding -> trained
// dense head -> softmax) — these steps are a breakdown of that pipeline,
// paced against the real request. Each step is tagged `real` or
// `illustrative`: `real` stages correspond to an actual, named operation in
// backend/ml/train.js / backend/src/utils/classifier.js; `illustrative`
// stages stand in for MobileNetV2's ~53 internal conv layers, which run
// inside a frozen, pretrained black-box model we don't extract individual
// activations from.
export const CNN_STEPS = [
  {
    label: "Preprocessing image (resize to 224×224, normalize)",
    detail:
      "The uploaded photo is decoded and resized to 224×224 pixels — the exact input size MobileNetV2 expects, matching the preprocessing in classifier.js's loadImageTensor().",
    tag: "real",
    filter: "none",
  },
  {
    label: "Convolution layer 1 — edge detection",
    detail:
      "Early conv layers slide small filters (typically 3×3) across the image to pick out basic structure: edges, color gradients, simple textures like cracked asphalt or crumpled paper.",
    tag: "illustrative",
    filter: "grayscale(1) contrast(2)",
  },
  {
    label: "Convolution layer 2 — pattern detection",
    detail:
      "Mid-depth layers combine those edges into more complex patterns — corners, curves, repeating textures — building toward recognizable shapes.",
    tag: "illustrative",
    filter: "grayscale(1) contrast(1.6) blur(0.6px)",
  },
  {
    label: "Convolution layer 3 — deep feature extraction",
    detail:
      "The deepest layers respond to whole object-like shapes — a pothole's rim, a bin's silhouette, a lamp post's outline — using MobileNetV2's ImageNet-pretrained weights, frozen (not retrained) for this app.",
    tag: "illustrative",
    filter: "grayscale(0.75) contrast(1.3) blur(1.3px) saturate(1.6) hue-rotate(12deg)",
  },
  {
    label: "Pooling — reducing feature maps",
    detail:
      "MobileNetV2 collapses its final feature maps down to a single 1,280-number vector (global average pooling) — this is the real embedding returned by mobilenetModel.infer(image, true) in classifier.js.",
    tag: "real",
    filter: "contrast(1.25) blur(2.2px)",
    pixelate: true,
  },
  {
    label: "Fully connected (dense) layers",
    detail:
      "That 1,280-number embedding feeds into the head we actually trained: Dense(100, ReLU) → Dropout(0.4), defined in backend/ml/train.js's buildHeadModel(). This is the only part of the network whose weights were fit to our issue-photo dataset.",
    tag: "real",
    filter: "contrast(1.1) blur(1px) brightness(0.9)",
    showActivations: true,
  },
  {
    label: "Softmax — computing class probabilities",
    detail:
      "A final Dense(4) layer outputs one raw score per category; softmax converts those into probabilities that sum to 100%. The bars below are the model's real output for this image, not a mock-up.",
    tag: "real",
    filter: "none",
    showScores: true,
  },
];

export const STEP_INTERVAL_MS = 750;

export const minDelay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
