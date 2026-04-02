/**
 * Color Utility Functions
 * Conversion, manipulation, and validation of colors
 */

/**
 * Convert hex color to RGB
 */
export const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)

  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null
}

/**
 * Convert RGB to hex
 */
export const rgbToHex = (r, g, b) => {
  const toHex = (n) => {
    const hex = Math.round(n).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Parse CSS color string to components
 */
export const parseColor = (color) => {
  // Handle hex
  if (color.startsWith('#')) {
    return hexToRgb(color)
  }

  // Handle rgb/rgba
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
      a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1
    }
  }

  return null
}

/**
 * Lighten color by percentage
 */
export const lightenColor = (hex, percent) => {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex

  const adjust = (value) => Math.min(255, Math.round(value + (255 - value) * (percent / 100)))

  return rgbToHex(adjust(rgb.r), adjust(rgb.g), adjust(rgb.b))
}

/**
 * Get contrast color (black or white) for given color
 */
export const getContrastColor = (hex) => {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#000000'

  // Calculate relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255

  return luminance > 0.5 ? '#000000' : '#FFFFFF'
}
