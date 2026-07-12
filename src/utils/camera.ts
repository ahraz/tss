// ============================================================
// GTA Scrub — Camera Utilities
// ============================================================

/**
 * Start camera stream on a video element, preferring the rear camera.
 * Falls back to front camera if rear is unavailable.
 */
export async function startCamera(videoEl: HTMLVideoElement): Promise<MediaStream> {
  // Try rear camera first (environment facing)
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false,
    });
    videoEl.srcObject = stream;
    await videoEl.play();
    return stream;
  } catch {
    // Rear camera failed — fall back to front camera
  }

  // Fall back to front camera (user facing)
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false,
    });
    videoEl.srcObject = stream;
    await videoEl.play();
    return stream;
  } catch {
    // Front camera also failed — try any available video device
  }

  // Last resort: request any video input
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  });
  videoEl.srcObject = stream;
  await videoEl.play();
  return stream;
}

/**
 * Capture a photo from a video element as a base64 data URL.
 * Uses JPEG with 0.7 quality to save localStorage space.
 */
export function capturePhoto(videoEl: HTMLVideoElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = videoEl.videoWidth;
  canvas.height = videoEl.videoHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to get canvas 2D context');
  }

  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.7);
}

/**
 * Stop all tracks on a MediaStream.
 * Safely handles null streams.
 */
export function stopCamera(stream: MediaStream | null): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

/**
 * Check if camera APIs are available in the current browser.
 */
export function isCameraAvailable(): boolean {
  return !!(
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}
