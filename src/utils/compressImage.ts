/**
 * Compress a base64 data URL (image) client-side using canvas.
 * Reduces phone camera photos (~3-5 MB) to ~100-300 KB.
 *
 * @param dataUrl  The original base64 data URL
 * @param maxDim   Longest side in pixels (default 1200)
 * @param quality  JPEG quality 0–1 (default 0.7)
 * @returns        A new compressed base64 data URL (JPEG)
 */
export function compressImage(
  dataUrl: string,
  maxDim = 1200,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Calculate new dimensions keeping aspect ratio
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height / width) * maxDim);
          width = maxDim;
        } else {
          width = Math.round((width / height) * maxDim);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Failed to decode image'));
    img.src = dataUrl;
  });
}
