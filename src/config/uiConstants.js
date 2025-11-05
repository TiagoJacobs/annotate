/**
 * UI & Configuration Constants
 * Centralized configuration values for the entire application
 */

// ==================== Canvas & Rendering ====================
export const CANVAS_UPDATE_INTERVAL = 100  // ms between canvas updates
export const GRID_SIZE = 50               // pixels, size of grid squares
export const DEFAULT_COLOR = '#000000'    // default shape color

// ==================== Selection & Handles ====================
export const SELECTION_PADDING = 5        // pixels around selected shape
export const RESIZE_HANDLE_SIZE = 8       // pixels, size of resize handles
export const HANDLE_HIT_THRESHOLD = 10    // pixels, detection radius for handles

// ==================== Hit Detection ====================
export const LINE_HIT_THRESHOLD = 10      // pixels, detection radius for lines
export const TEXT_WIDTH_FACTOR = 0.6      // approximate width per character relative to font size

// ==================== Size Constraints ====================
export const DEFAULT_BRUSH_SIZE = 3
export const DEFAULT_FONT_SIZE = 20
export const MIN_BRUSH_SIZE = 1
export const MAX_BRUSH_SIZE = 50
export const MIN_TEXT_SIZE = 8
export const MAX_TEXT_SIZE = 100

// ==================== Zoom & View ====================
export const ZOOM_STEP = 0.1
export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 10

// ==================== Arrow Rendering ====================
export const ARROW_HEAD_LENGTH = 15
export const ARROW_HEAD_ANGLE = Math.PI / 6  // 30 degrees

// ==================== Default Values ====================
export const DEFAULT_TOOL = 'pen'
export const DEFAULT_LINE_STYLE = 'solid'

// ==================== Local Storage ====================
export const STORAGE_KEY_PREFIX = 'annotate_'
