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
 * Convert hex to RGBA
 */
export const hexToRgba = (hex, alpha = 1) => {
  const rgb = hexToRgb(hex)
  return rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})` : null
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
 * Darken color by percentage
 */
export const darkenColor = (hex, percent) => {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex

  const adjust = (value) => Math.max(0, Math.round(value * (1 - percent / 100)))

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

/**
 * Blend two colors
 */
export const blendColors = (color1, color2, ratio = 0.5) => {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)

  if (!rgb1 || !rgb2) return color1

  const blend = (c1, c2) => Math.round(c1 * (1 - ratio) + c2 * ratio)

  return rgbToHex(blend(rgb1.r, rgb2.r), blend(rgb1.g, rgb2.g), blend(rgb1.b, rgb2.b))
}

/**
 * Convert color to grayscale
 */
export const toGrayscale = (hex) => {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex

  const gray = Math.round(0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b)
  return rgbToHex(gray, gray, gray)
}

/**
 * Invert color
 */
export const invertColor = (hex) => {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex

  return rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b)
}

/**
 * Generate random color
 */
export const randomColor = () => {
  const r = Math.floor(Math.random() * 256)
  const g = Math.floor(Math.random() * 256)
  const b = Math.floor(Math.random() * 256)
  return rgbToHex(r, g, b)
}

/**
 * Generate color palette
 */
export const generatePalette = (baseColor, count = 5) => {
  const palette = [baseColor]

  for (let i = 1; i < count; i++) {
    const variation = lightenColor(baseColor, (i * 100) / count)
    palette.push(variation)
  }

  return palette
}

/**
 * Check if color is light
 */
export const isLightColor = (hex) => {
  return getContrastColor(hex) === '#000000'
}

/**
 * Check if color is dark
 */
export const isDarkColor = (hex) => {
  return getContrastColor(hex) === '#FFFFFF'
}

/**
 * Sanitize color input
 */
export const sanitizeColor = (color, fallback = '#000000') => {
  if (!color) return fallback

  // Check if valid hex
  if (/^#[0-9A-F]{6}$/i.test(color)) {
    return color
  }

  // Try to parse other formats
  const parsed = parseColor(color)
  if (parsed) {
    return rgbToHex(parsed.r, parsed.g, parsed.b)
  }

  return fallback
}

/**
 * Color presets
 */
export const COLOR_PRESETS = {
  RED: '#FF0000',
  GREEN: '#00FF00',
  BLUE: '#0000FF',
  YELLOW: '#FFFF00',
  CYAN: '#00FFFF',
  MAGENTA: '#FF00FF',
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  GRAY: '#808080',
  ORANGE: '#FFA500',
  PURPLE: '#800080',
  PINK: '#FFC0CB',
  BROWN: '#A52A2A',
  LIME: '#00FF00',
  NAVY: '#000080',
  TEAL: '#008080',
  OLIVE: '#808000',
  MAROON: '#800000'
}
