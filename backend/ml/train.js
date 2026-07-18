// Trains the issue-photo classification head via transfer learning on top
// of a frozen, pretrained MobileNetV2 (ImageNet) feature extractor.
//
// Reads labeled images from backend/ml/dataset/<Category>/*.{jpg,png}
// (populate via `npm run ml:fetch-dataset`) and saves the trained head to
// backend/ml/model/. Re-run any time to retrain: `npm run ml:train`
//
// Alternative worth knowing about: a Keras-converted MobileNetV1 LayersModel
// from the tfjs model zoo can be truncated with getLayer() and fine-tuned as
// one fused graph (GlobalAveragePooling2D -> Dense -> Dropout -> Dense). We
// use the simpler/lower-risk two-stage approach below instead: MobileNetV2
// embeddings (via @tensorflow-models/mobilenet, pooling already applied
// internally) feeding a small standalone trainable head.

require('../src/utils/tfNodeCompat');
const tf = require('@tensorflow/tfjs-node');
const mobilenet = require('@tensorflow-models/mobilenet');
const fs = require('fs');
const path = require('path');

const DATASET_DIR = path.join(__dirname, 'dataset');
const MODEL_DIR = path.join(__dirname, 'model');
const CATEGORIES = ['Pothole', 'Garbage', 'Streetlight', 'Other'];
const IMAGE_SIZE = 224;
const EPOCHS = 30;
const BATCH_SIZE = 8;

function loadImageTensor(filePath) {
  const buffer = fs.readFileSync(filePath);
  const decoded = tf.node.decodeImage(buffer, 3);
  const floatImg = decoded.toFloat();
  const resized = tf.image.resizeBilinear(floatImg, [IMAGE_SIZE, IMAGE_SIZE]);
  decoded.dispose();
  floatImg.dispose();
  return resized;
}

async function buildEmbeddings(mobilenetModel) {
  const embeddings = [];
  const labels = [];

  for (const [index, category] of CATEGORIES.entries()) {
    const categoryDir = path.join(DATASET_DIR, category);
    if (!fs.existsSync(categoryDir)) {
      throw new Error(
        `Missing dataset folder for "${category}": ${categoryDir}\n` +
          'Run "npm run ml:fetch-dataset" first.'
      );
    }

    const files = fs
      .readdirSync(categoryDir)
      .filter((f) => /\.(jpe?g|png)$/i.test(f));
    console.log(`   ${category}: ${files.length} image(s)`);

    let skipped = 0;
    for (const file of files) {
      let imageTensor;
      try {
        imageTensor = loadImageTensor(path.join(categoryDir, file));
      } catch (err) {
        // Some scraped/dataset images are corrupt or in an unsupported
        // encoding (e.g. CMYK/progressive JPEG) that tfjs-node's decoder
        // rejects. Skip rather than aborting the whole training run.
        skipped += 1;
        continue;
      }

      const embedding = tf.tidy(() => mobilenetModel.infer(imageTensor, true));
      imageTensor.dispose();

      embeddings.push(embedding);
      const label = new Array(CATEGORIES.length).fill(0);
      label[index] = 1;
      labels.push(label);
    }
    if (skipped > 0) {
      console.log(`   ${category}: skipped ${skipped} unreadable image(s)`);
    }
  }

  if (embeddings.length === 0) {
    throw new Error('No training images found. Run "npm run ml:fetch-dataset" first.');
  }

  const embeddingsTensor = tf.concat(embeddings, 0);
  embeddings.forEach((e) => e.dispose());
  const labelsTensor = tf.tensor2d(labels);

  return { embeddingsTensor, labelsTensor };
}

function buildHeadModel(embeddingSize) {
  const model = tf.sequential();
  model.add(
    tf.layers.dense({ inputShape: [embeddingSize], units: 100, activation: 'relu' })
  );
  model.add(tf.layers.dropout({ rate: 0.4 }));
  model.add(tf.layers.dense({ units: CATEGORIES.length, activation: 'softmax' }));
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });
  return model;
}

async function main() {
  console.log('📦 Loading MobileNetV2 (frozen feature extractor)...');
  const mobilenetModel = await mobilenet.load({ version: 2, alpha: 1.0 });

  console.log('🖼️  Computing embeddings for training images...');
  const { embeddingsTensor, labelsTensor } = await buildEmbeddings(mobilenetModel);
  console.log(`   Embedding shape: [${embeddingsTensor.shape}]`);

  const headModel = buildHeadModel(embeddingsTensor.shape[1]);

  console.log('🏋️  Training classification head...');
  await headModel.fit(embeddingsTensor, labelsTensor, {
    epochs: EPOCHS,
    batchSize: BATCH_SIZE,
    shuffle: true,
    validationSplit: 0.2,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        const acc = logs.acc ?? logs.accuracy;
        const valAcc = logs.val_acc ?? logs.val_accuracy;
        console.log(
          `   Epoch ${epoch + 1}/${EPOCHS}: loss=${logs.loss.toFixed(4)} ` +
            `acc=${acc?.toFixed(4)} val_loss=${logs.val_loss?.toFixed(4)} val_acc=${valAcc?.toFixed(4)}`
        );
      },
    },
  });

  fs.mkdirSync(MODEL_DIR, { recursive: true });
  await headModel.save(`file://${MODEL_DIR}`);
  fs.writeFileSync(path.join(MODEL_DIR, 'labels.json'), JSON.stringify(CATEGORIES, null, 2));

  embeddingsTensor.dispose();
  labelsTensor.dispose();

  console.log(`\n✅ Model saved to ${MODEL_DIR}`);
  console.log(
    '   Note: this is a small bootstrap dataset — expect noisy real-world accuracy.\n' +
      '   See backend/ml/README.md to retrain with a larger dataset later.'
  );
}

main().catch((err) => {
  console.error('❌ Training failed:', err);
  process.exit(1);
});
