/**
 * cameraSnapshot.js
 * Utility to silently & smoothly capture a user photo snapshot via browser webcam
 * upon portal login for audit logging and identity verification.
 * 
 * Features:
 * - Ultra-fast & non-blocking: Never stops login even if camera is missing, disabled, or denied
 * - Compact JPEG encoding: ~15-25KB base64 payload
 * - Instant track release: Shuts down webcam immediately after frame capture
 */

export const isCameraSupported = () => {
  return Boolean(
    typeof window !== "undefined" &&
    navigator &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
};

/**
 * Captures a single photo frame from the user's front-facing camera.
 * @param {number} timeoutMs - Maximum time to wait for camera permission & capture
 * @returns {Promise<string|null>} Base64 image data URL or null
 */
export const captureLoginSnapshot = async (timeoutMs = 3000) => {
  if (!isCameraSupported()) {
    return null;
  }

  return new Promise((resolve) => {
    let resolved = false;
    let streamRef = null;

    const cleanup = () => {
      if (streamRef) {
        try {
          streamRef.getTracks().forEach((track) => track.stop());
        } catch {}
        streamRef = null;
      }
    };

    const done = (result) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(result);
      }
    };

    // Timeout safety fallback — ensures login never hangs
    const timer = setTimeout(() => {
      done(null);
    }, timeoutMs);

    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 480, max: 640 },
          height: { ideal: 360, max: 480 },
        },
      })
      .then((stream) => {
        streamRef = stream;
        const video = document.createElement("video");
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.srcObject = stream;

        const onReady = () => {
          // Allow camera sensor ~180ms to adjust exposure/white balance
          setTimeout(() => {
            try {
              const canvas = document.createElement("canvas");
              const w = video.videoWidth || 400;
              const h = video.videoHeight || 300;
              canvas.width = Math.min(w, 480);
              canvas.height = Math.round((canvas.width / w) * h);

              const ctx = canvas.getContext("2d");
              // Mirror the image horizontally so it looks natural like a selfie
              ctx.translate(canvas.width, 0);
              ctx.scale(-1, 1);
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

              const dataUrl = canvas.toDataURL("image/jpeg", 0.65);
              clearTimeout(timer);
              done(dataUrl);
            } catch (err) {
              clearTimeout(timer);
              done(null);
            }
          }, 180);
        };

        video.onloadedmetadata = () => {
          video
            .play()
            .then(onReady)
            .catch(() => {
              clearTimeout(timer);
              done(null);
            });
        };
      })
      .catch((err) => {
        // Permission denied, camera busy, or not found — return null gracefully
        clearTimeout(timer);
        done(null);
      });
  });
};
