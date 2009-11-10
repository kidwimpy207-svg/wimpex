// Image processing service: sharp integration
let sharp;
try {
  sharp = require('sharp');
  console.log('🖼️ Image processing enabled');
} catch (err) {
  console.log('⚠️ Sharp not installed; image resizing disabled');
  sharp = null;
}

// Generate responsive image sizes
const generateResponsiveSizes = async (inputBuffer, basename) => {
  if (!sharp) {
    return {
      success: false,
      message: 'Image processing not available'
    };
  }

  try {
    const ext = basename.split('.').pop().toLowerCase();
    const name = basename.replace(/\.[^/.]+$/, '');
    
    const sizes = {
      thumbnail: 150,
      medium: 400,
      large: 800,
    };

    const results = {};

    // Original
    results.original = {
      filename: basename,
      buffer: inputBuffer,
      size: inputBuffer.length,
    };

    // Generate each size
    for (const [sizeKey, width] of Object.entries(sizes)) {
      try {
        const buffer = await sharp(inputBuffer)
          .resize(width, width, { fit: 'cover' })
          .toBuffer();

        results[sizeKey] = {
          filename: `${name}-${sizeKey}.${ext}`,
          buffer,
          size: buffer.length,
          width,
        };
      } catch (err) {
        console.warn(`Failed to generate ${sizeKey} size:`, err.message);
      }
    }

    return { success: true, sizes: results };
  } catch (err) {
    console.error('Image processing error:', err);
    return { success: false, error: err.message };
  }
};

// Optimize image (compress)
const optimizeImage = async (inputBuffer, contentType) => {
  if (!sharp) {
    return { success: false, message: 'Image processing not available' };
  }

  try {
    let pipeline = sharp(inputBuffer);

    if (contentType.includes('jpeg')) {
      pipeline = pipeline.jpeg({ quality: 80, progressive: true });
    } else if (contentType.includes('png')) {
      pipeline = pipeline.png({ compressionLevel: 9 });
    } else if (contentType.includes('webp')) {
      pipeline = pipeline.webp({ quality: 80 });
    }

    const buffer = await pipeline.toBuffer();
    return {
      success: true,
      buffer,
      originalSize: inputBuffer.length,
      optimizedSize: buffer.length,
      saved: inputBuffer.length - buffer.length,
    };
  } catch (err) {
    console.error('Image optimization error:', err);
    return { success: false, error: err.message };
  }
};

module.exports = {
  generateResponsiveSizes,
  optimizeImage,
};
