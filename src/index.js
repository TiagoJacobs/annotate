/**
 * Annotate - Canvas Annotation Tool
 * Main export file for all modules
 */

// ==================== Core ====================
export { CanvasManager } from './canvas/CanvasManager'
export { LayerManager } from './layers/LayerManager'
export { ToolHandler } from './tools/ToolHandler'

// ==================== Configuration ====================
export * from './config/shapeConfig'
export * from './config/renderConfig'

// ==================== Constants ====================
export * from './constants/toolTypes'

// ==================== Factories ====================
export { ShapeFactory } from './factories/ShapeFactory'

// ==================== Builders ====================
export * from './builders/LayerBuilder'

// ==================== Patterns ====================
export * from './patterns/NullObjects'
export * from './patterns/Observer'

// ==================== Commands ====================
export * from './commands/ShapeCommands'

// ==================== Services ====================
export { CanvasService } from './services/CanvasService'

// ==================== Renderers ====================
export * from './renderers/ShapeRenderer'

// ==================== Hooks ====================
export { useCanvasEvents } from './hooks/useCanvasEvents'
export { useLayerOperations } from './hooks/useLayerOperations'
export { useShapeOperations } from './hooks/useShapeOperations'

// ==================== Utilities ====================
export * from './utils/validators'
export * from './utils/geometry'
export * from './utils/performance'
export * from './utils/colorUtils'
export * from './utils/transform'
export * from './utils/errorHandling'

/**
 * Version information
 */
export const VERSION = '2.0.0'
export const BUILD_DATE = new Date().toISOString()

/**
 * Feature flags
 */
export const FEATURES = {
  UNDO_REDO: true,
  LAYERS: true,
  TEXT_EDITING: true,
  IMAGE_PASTE: true,
  SHAPE_SELECTION: true,
  SHAPE_RESIZE: true,
  EXPORT: true,
  ZOOM: true,
  COMMAND_PATTERN: true,
  OBSERVER_PATTERN: true
}

/**
 * Get library information
 */
export const getInfo = () => ({
  version: VERSION,
  buildDate: BUILD_DATE,
  features: FEATURES
})

/**
 * Architecture Overview
 *
 * This library follows several design patterns and best practices:
 *
 * 1. **Single Responsibility Principle**
 *    - Each class/module has one clear purpose
 *    - Extracted hooks, services, and utilities
 *
 * 2. **Factory Pattern**
 *    - ShapeFactory for creating shapes
 *    - ShapeRendererFactory for rendering
 *
 * 3. **Builder Pattern**
 *    - LayerBuilder for fluent layer creation
 *    - Shape-specific builders (ArrowBuilder, RectBuilder, etc.)
 *
 * 4. **Command Pattern**
 *    - AddShapeCommand, DeleteShapeCommand, etc.
 *    - CommandManager for undo/redo
 *
 * 5. **Observer Pattern**
 *    - EventEmitter for pub/sub
 *    - Layer/Tool/Selection observers
 *
 * 6. **Strategy Pattern**
 *    - Different rendering strategies per shape type
 *    - Pluggable validators
 *
 * 7. **Null Object Pattern**
 *    - Safe defaults to avoid null checks
 *
 * 8. **Service Layer**
 *    - CanvasService abstracts canvas operations
 *
 * 9. **Pure Functions**
 *    - Geometry utilities
 *    - Color utilities
 *    - Transform utilities
 *
 * 10. **Performance Optimizations**
 *     - Debounce/throttle
 *     - Memoization
 *     - Object pooling
 *     - RAF throttling
 */
