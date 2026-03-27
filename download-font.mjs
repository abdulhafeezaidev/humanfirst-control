/**
 * Downloads a free handwriting-style TTF font from GitHub
 * This script uses the Patrick Hand font from Google Fonts repository
 */

import https from 'https';
import fs from 'fs';
import path from 'path';

const FONT_URL = 'https://github.com/google/fonts/raw/main/ofl/patrickhand/PatrickHand-Regular.ttf';
const OUTPUT_FILE = 'handwriting.ttf';

async function downloadFont() {
  console.log(`Downloading handwriting font from Google Fonts...`);
  
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(OUTPUT_FILE);
    
    https.get(FONT_URL, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirects
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close();
            console.log(`✅ Font downloaded successfully: ${OUTPUT_FILE}`);
            resolve();
          });
        }).on('error', (err) => {
          fs.unlink(OUTPUT_FILE, () => {});
          reject(err);
        });
      } else {
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          console.log(`✅ Font downloaded successfully: ${OUTPUT_FILE}`);
          resolve();
        });
      }
    }).on('error', (err) => {
      fs.unlink(OUTPUT_FILE, () => {});
      reject(err);
    });
  });
}

// Check if font already exists
if (fs.existsSync(OUTPUT_FILE)) {
  console.log(`ℹ️  Font file already exists: ${OUTPUT_FILE}`);
  process.exit(0);
}

downloadFont()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(`❌ Error downloading font: ${err.message}`);
    process.exit(1);
  });
