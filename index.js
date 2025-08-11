import { ImageAnnotatorClient } from '@google-cloud/vision';
import sharp from 'sharp';
import fs from 'fs/promises'; // For async file operations
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fsSync from 'fs'; // For synchronous existsSync

// Polyfill for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- CONFIGURATION ---
const INPUT_DIR = path.join(__dirname, 'inputs');
const OUTPUT_DIR = path.join(__dirname, 'outputs');
// The name of your credentials file
const CREDENTIALS_FILE = 'key.json';

const OBJECT_RATIO = 80;
// --- END CONFIGURATION ---

// Check if the credentials file exists
if (!fsSync.existsSync(path.join(__dirname, CREDENTIALS_FILE))) { // Changed require('fs').existsSync to fsSync.existsSync
  console.error(`\nERROR: Credentials file not found at ${path.join(__dirname, CREDENTIALS_FILE)}`);
  console.error('Please follow the setup instructions to create your service account key file.');
  process.exit(1);
}

// Creates a client
const client = new ImageAnnotatorClient({ keyFilename: path.join(__dirname, CREDENTIALS_FILE) });

async function processImages() {
  console.log('Starting image processing...');

  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    const files = await fs.readdir(INPUT_DIR);
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png)$/i.test(f));

    if (imageFiles.length === 0) {
      console.log('No images found in the inputs directory.');
      return;
    }

    console.log(`Found ${imageFiles.length} images to process.`);

    for (const file of imageFiles) {
      const inputPath = path.join(INPUT_DIR, file);
      console.log(`\nProcessing ${file}...`);

      try {
        const [result] = await client.objectLocalization(inputPath);
        const objects = result.localizedObjectAnnotations;

        const glassesObjects = objects.filter(obj => obj.name === 'Glasses' || obj.name === 'Sunglasses');

        if (glassesObjects.length > 0) {
          // Find the glasses object with the highest score
          const bestGlasses = glassesObjects.reduce((prev, current) => {
            return (prev.score > current.score) ? prev : current;
          });

          console.log(`Detected glasses with highest score (${bestGlasses.score.toFixed(2)}) in ${file}.`);
          const image = sharp(inputPath);
          const metadata = await image.metadata();

          const glasses = bestGlasses;
          const vertices = glasses.boundingPoly.normalizedVertices;

          // Convert normalized vertices to absolute pixel values
          const xCoords = vertices.map(v => v.x * metadata.width);
          const yCoords = vertices.map(v => v.y * metadata.height);

          const left = Math.min(...xCoords);
          const top = Math.min(...yCoords);
          const width = Math.max(...xCoords) - left;
          const height = Math.max(...yCoords) - top;

          // Add padding and ensure crop area is within image bounds

          const cropWidth = Math.round(width * 100 / OBJECT_RATIO);
          const cropHeight = Math.round(height * 100 / OBJECT_RATIO);
          const outputSize = Math.max(cropWidth, cropHeight); // This is the desired final square size

          let cropLeft = Math.round(left - ((cropWidth - width) / 2));
          let cropTop = Math.round(top - ((cropHeight - height) / 2));

          const outputFilename = `${file}`;
          const outputPath = path.join(OUTPUT_DIR, outputFilename);

          console.log(cropLeft,cropTop,cropWidth,cropHeight)

          let extended_image = await image
            .clone()
            .extend({
              left: outputSize,
              right: outputSize,
              top: outputSize,
              bottom: outputSize,
              extendWith: 'copy' })
            .toBuffer();
            await sharp(extended_image).extract({ left: outputSize+cropLeft-((outputSize-cropWidth)/2), top: outputSize+cropTop-((outputSize-cropHeight)/2), width: outputSize, height: outputSize })
            .toFile(outputPath);
          // --- End new logic ---
          // --- End new logic ---

          console.log(` -> Saved cropped image to ${outputPath}`);
        } else {
          console.log(`No glasses detected in ${file}.`);
        }
      } catch (err) {
        console.error(`Error processing file ${file} with Vision API:`, err.message || err);
      }
    }
  } catch (error) {
    console.error('An error occurred:', error.message || err);
  }
}

processImages().then(() => {
  console.log('\nProcessing complete.');
});
