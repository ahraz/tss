import React, { useRef, useEffect, useCallback, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { startCamera, capturePhoto, stopCamera, isCameraAvailable } from '../../utils/camera';
import { compressImage } from '../../utils/compressImage';

interface CameraCaptureProps {
  photo: string | null;
  onPhotoCapture: (dataUrl: string) => void;
  onRetake: () => void;
  maxFileSize?: number; // bytes
  onFallbackUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CameraCapture({ photo, onPhotoCapture, onRetake, onFallbackUpload }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState(false);

  const initCamera = useCallback(async () => {
    if (videoRef.current && isCameraAvailable()) {
      try {
        const s = await startCamera(videoRef.current);
        setCameraError(false);
        return s;
      } catch {
        setCameraError(true);
      }
    } else {
      setCameraError(true);
    }
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (!photo) {
      initCamera().then(s => { if (s) stream = s; });
    }
    return () => { stopCamera(stream); };
  }, [photo, initCamera]);

  const handleCapture = async () => {
    if (videoRef.current) {
      const dataUrl = capturePhoto(videoRef.current);
      const compressed = await compressImage(dataUrl).catch(() => dataUrl);
      onPhotoCapture(compressed);
    }
  };

  return (
    <div className="bg-black rounded-xl overflow-hidden relative aspect-[3/4] max-h-[50vh] w-full flex items-center justify-center border-4 border-gray-900 shadow-inner">
      {photo ? (
        <img src={photo} alt="Captured" className="w-full h-full object-cover" />
      ) : cameraError ? (
        <div className="text-center p-6 bg-gray-900 w-full h-full flex flex-col items-center justify-center">
          <AlertCircle className="text-gray-400 mb-2" size={32} />
          <p className="text-gray-300 text-sm mb-4">Camera not available.</p>
          <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer font-medium transition-colors">
            Upload Photo
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFallbackUpload} />
          </label>
        </div>
      ) : (
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      )}

      {!photo && !cameraError && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
          <button
            onClick={handleCapture}
            className="w-16 h-16 rounded-full bg-white/20 border-4 border-white backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition-all active:scale-95"
          >
            <div className="w-12 h-12 bg-white rounded-full"></div>
          </button>
        </div>
      )}
    </div>
  );
}
