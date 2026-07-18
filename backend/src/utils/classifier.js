// Classifies an issue photo by delegating to the ml-service (see
// ml-service/), a standalone Python/FastAPI microservice that loads
// whichever architecture won the training comparison in
// ml-service/training/compare.py. Replaces the previous in-process
// tfjs-node/MobileNet classifier — no ML runtime lives in the Node process
// anymore.

const fs = require('fs');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Classify an image file into one of the trained categories.
 * @param {string} imagePath - Absolute path to the image on disk
 * @returns {Promise<{category: string, confidence: number, scores: Record<string, number>}>}
 */
async function classifyImage(imagePath) {
  const buffer = fs.readFileSync(imagePath);
  const formData = new FormData();
  formData.append('image', new Blob([buffer]), 'image.jpg');

  const response = await fetch(`${ML_SERVICE_URL}/classify`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `ml-service classification failed (${response.status}): ${detail || response.statusText}`
    );
  }

  return response.json();
}

module.exports = { classifyImage };
