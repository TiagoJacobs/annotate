/**
 * Canvas Rendering Optimizations Hook
 * Provides strategies for optimizing canvas rendering performance
 *
 * This hook is a companion to useCanvasRenderer and provides:
 * - Layer dirty flagging to skip rendering unchanged layers
 * - Memoization of expensive render operations
 * - RequestAnimationFrame integration for smooth updates
 */

import { useRef, useCallback } from 'react'

export const useCanvasOptimizations = (layerManagerRef) => {
  const layerRenderCacheRef = useRef(new Map())
  const lastRenderStateRef = useRef(new Map())

  /**
   * Check if a layer has changed since last render
   * Compares serialized layer data to detect changes
   */
  const isLayerDirty = useCallback((layer) => {
    const layerId = layer.id
    const lastState = lastRenderStateRef.current.get(layerId)

    if (!lastState) {
      // Layer not cached yet, needs rendering
      return true
    }

    // Create a checksum of layer properties that affect rendering
    const currentHash = JSON.stringify({
      visible: layer.visible,
      opacity: layer.opacity,
      strokes: layer.strokes?.length,
      arrows: layer.arrows?.length,
      rects: layer.rects?.length,
      ellipses: layer.ellipses?.length,
      texts: layer.texts?.length,
      image: !!layer.image
    })

    return currentHash !== lastState.hash
  }, [])

  /**
   * Mark a layer as clean after rendering
   */
  const markLayerClean = useCallback((layer) => {
    const hash = JSON.stringify({
      visible: layer.visible,
      opacity: layer.opacity,
      strokes: layer.strokes?.length,
      arrows: layer.arrows?.length,
      rects: layer.rects?.length,
      ellipses: layer.ellipses?.length,
      texts: layer.texts?.length,
      image: !!layer.image
    })

    lastRenderStateRef.current.set(layer.id, { hash, timestamp: Date.now() })
  }, [])

  /**
   * Clear the render cache (call after major operations like undo/redo)
   */
  const clearRenderCache = useCallback(() => {
    layerRenderCacheRef.current.clear()
    lastRenderStateRef.current.clear()
  }, [])

  /**
   * Get the list of dirty (changed) layers
   */
  const getDirtyLayers = useCallback(() => {
    const allLayers = layerManagerRef.current.getAllLayers()
    return allLayers.filter(layer => isLayerDirty(layer))
  }, [isLayerDirty])

  /**
   * Debounce canvas render to avoid excessive updates
   * Call from useEffect with a timeout value
   */
  const createDebouncedRender = useCallback((renderFn, delay = 16) => {
    let timeoutId = null

    const debouncedRender = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(() => {
        renderFn()
        timeoutId = null
      }, delay)
    }

    const cancel = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    return { debouncedRender, cancel }
  }, [])

  /**
   * Use requestAnimationFrame for smooth updates
   * More efficient than interval-based rendering
   */
  const createAnimationFrameRender = useCallback((renderFn) => {
    let animationFrameId = null
    let shouldRender = false

    const scheduleRender = () => {
      shouldRender = true
      if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(() => {
          if (shouldRender) {
            renderFn()
            shouldRender = false
          }
          animationFrameId = null
        })
      }
    }

    const cancel = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }
      shouldRender = false
    }

    return { scheduleRender, cancel }
  }, [])

  return {
    isLayerDirty,
    markLayerClean,
    clearRenderCache,
    getDirtyLayers,
    createDebouncedRender,
    createAnimationFrameRender,
    layerRenderCacheRef,
    lastRenderStateRef
  }
}
