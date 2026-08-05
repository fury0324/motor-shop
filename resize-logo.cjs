// resize-logo.cjs
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// ✅ CONFIG - UPDATE PATH
const inputFile = './src/assets/euro-logo.png';  // ← PALITAN ITO
const outputDir = './public/icons';

// ✅ Required PWA sizes
const sizes = [
  { size: 16, name: 'icon-16x16.png' },
  { size: 32, name: 'icon-32x32.png' },
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
];

// ✅ Create output directory if not exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// ✅ Check if input file exists
if (!fs.existsSync(inputFile)) {
  console.error(`❌ File not found: ${inputFile}`);
  console.log('📁 Please check the path to your logo file.');
  console.log('📁 Available files in src/assets:');
  
  // List files in src/assets
  try {
    const files = fs.readdirSync('./src/assets');
    files.forEach(file => {
      console.log(`   - ${file}`);
    });
  } catch (err) {
    console.log('   (Unable to list files)');
  }
  
  process.exit(1);
}

console.log('🔄 Resizing logo...\n');

// ✅ Process each size
sizes.forEach(({ size, name }) => {
  const outputPath = path.join(outputDir, name);
  
  sharp(inputFile)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .png()
    .toFile(outputPath)
    .then(() => {
      console.log(`✅ ${size}x${size} → ${name}`);
    })
    .catch(err => {
      console.error(`❌ Failed to resize ${size}x${size}:`, err.message);
    });
});

console.log('\n📁 Output directory:', outputDir);
console.log('✅ Done! All icons generated.');