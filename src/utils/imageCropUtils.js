/**
 * Image Crop Utilities
 * Crop an image dataUrl to a specified rectangle
 */

/**
 * Crop an image to a rectangle
 * @param {string} dataUrl - The source image data URL
 * @param {Object} cropRect - { x, y, width, height } in image coordinates
 * @returns {Promise<string>} Cropped image data URL
 */
export function cropImageDataUrl(dataUrl, cropRect) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = cropRect.width
      canvas.height = cropRect.height
      const ctx = canvas.getContext('2d')

      ctx.drawImage(
        img,
        cropRect.x, cropRect.y, cropRect.width, cropRect.height,
        0, 0, cropRect.width, cropRect.height
      )

      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('Failed to load image for cropping'))
    img.src = dataUrl
  })
}
