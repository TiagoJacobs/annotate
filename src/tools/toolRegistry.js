/**
 * Tool Registry System
 * Extensible registry for all drawing tools
 * Each tool defines its behavior, properties, and data model
 */

export const toolRegistry = {
  pen: {
    id: 'pen',
    name: 'Pen',
    icon: 'pen',
    cursor: 'crosshair',
    properties: {
      color: { type: 'color', default: '#000000' },
      size: { type: 'number', min: 1, max: 50, default: 3 },
    },
    dataModel: {
      type: 'pen',
      strokes: [],
    },
    handlers: {
      onMouseDown: 'startFreehandStroke',
      onMouseMove: 'continueFreehandStroke',
      onMouseUp: 'finishFreehandStroke',
    },
  },

  arrow: {
    id: 'arrow',
    name: 'Arrow',
    icon: 'arrow-right',
    cursor: 'crosshair',
    properties: {
      color: { type: 'color', default: '#000000' },
      size: { type: 'number', min: 1, max: 50, default: 2 },
    },
    dataModel: {
      type: 'arrow',
      arrows: [],
    },
    handlers: {
      onMouseDown: 'startShape',
      onMouseMove: 'previewShape',
      onMouseUp: 'finishShape',
    },
  },

  rect: {
    id: 'rect',
    name: 'Rectangle',
    icon: 'square',
    cursor: 'crosshair',
    properties: {
      color: { type: 'color', default: '#000000' },
      size: { type: 'number', min: 1, max: 50, default: 2 },
    },
    dataModel: {
      type: 'rect',
      rects: [],
    },
    handlers: {
      onMouseDown: 'startShape',
      onMouseMove: 'previewShape',
      onMouseUp: 'finishShape',
    },
  },

  ellipse: {
    id: 'ellipse',
    name: 'Ellipse',
    icon: 'circle',
    cursor: 'crosshair',
    properties: {
      color: { type: 'color', default: '#000000' },
      size: { type: 'number', min: 1, max: 50, default: 2 },
    },
    dataModel: {
      type: 'ellipse',
      ellipses: [],
    },
    handlers: {
      onMouseDown: 'startShape',
      onMouseMove: 'previewShape',
      onMouseUp: 'finishShape',
    },
  },

  text: {
    id: 'text',
    name: 'Text',
    icon: 'type',
    cursor: 'text',
    properties: {
      color: { type: 'color', default: '#000000' },
      fontSize: { type: 'number', min: 10, max: 100, default: 20 },
    },
    dataModel: {
      type: 'text',
      texts: [],
    },
    handlers: {
      onClick: 'placeText',
    },
  },

  select: {
    id: 'select',
    name: 'Select',
    icon: 'pointer',
    cursor: 'default',
    properties: {},
    handlers: {
      onMouseDown: 'selectObject',
      onMouseMove: 'dragObject',
      onMouseUp: 'releaseObject',
    },
  },

  pan: {
    id: 'pan',
    name: 'Pan',
    icon: 'hand',
    cursor: 'grab',
    properties: {},
    handlers: {
      onMouseDown: 'startPan',
      onMouseMove: 'continuePan',
      onMouseUp: 'finishPan',
    },
  },
}

export const getToolConfig = (toolId) => {
  return toolRegistry[toolId] || null
}

export const getAllTools = () => {
  return Object.values(toolRegistry)
}

export const registerTool = (toolId, config) => {
  toolRegistry[toolId] = config
}
