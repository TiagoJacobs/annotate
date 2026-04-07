/**
 * Tool Registry System
 * Extensible registry for all drawing tools
 * Each tool defines its behavior, properties, and data model
 */

export const toolRegistry = {
  select: {
    id: 'select',
    name: 'Select',
    icon: 'pointer',
    cursor: 'default',
    shortcutKey: 'V',
    properties: {},
    handlers: {
      onMouseDown: 'selectObject',
      onMouseMove: 'dragObject',
      onMouseUp: 'releaseObject',
    },
  },

  pen: {
    id: 'pen',
    name: 'Pen',
    icon: 'pen',
    cursor: 'crosshair',
    shortcutKey: 'P',
    properties: {
      color: { type: 'color', default: '#000000' },
      size: { type: 'number', min: 1, max: 50, default: 3 },
      lineStyle: { type: 'select', default: 'solid', options: ['solid', 'dashed', 'dotted', 'dashdot'] },
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

  highlighter: {
    id: 'highlighter',
    name: 'Highlighter',
    icon: 'highlighter',
    cursor: 'crosshair',
    shortcutKey: 'H',
    properties: {
      color: { type: 'color', default: '#ffff00' },
      size: { type: 'number', min: 5, max: 80, default: 20 },
    },
    dataModel: {
      type: 'highlighter',
      highlighterStrokes: [],
    },
    handlers: {
      onMouseDown: 'startHighlighterStroke',
      onMouseMove: 'continueHighlighterStroke',
      onMouseUp: 'finishHighlighterStroke',
    },
  },

  arrow: {
    id: 'arrow',
    name: 'Arrow',
    icon: 'arrow-right',
    cursor: 'crosshair',
    shortcutKey: 'A',
    properties: {
      color: { type: 'color', default: '#000000' },
      size: { type: 'number', min: 1, max: 50, default: 2 },
      lineStyle: { type: 'select', default: 'solid', options: ['solid', 'dashed', 'dotted', 'dashdot'] },
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

  line: {
    id: 'line',
    name: 'Line',
    icon: 'minus',
    cursor: 'crosshair',
    shortcutKey: 'L',
    properties: {
      color: { type: 'color', default: '#000000' },
      size: { type: 'number', min: 1, max: 50, default: 2 },
      lineStyle: { type: 'select', default: 'solid', options: ['solid', 'dashed', 'dotted', 'dashdot'] },
    },
    dataModel: {
      type: 'line',
      lines: [],
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
    shortcutKey: 'R',
    properties: {
      color: { type: 'color', default: '#000000' },
      fillColor: { type: 'color', default: '' },
      size: { type: 'number', min: 1, max: 50, default: 2 },
      lineStyle: { type: 'select', default: 'solid', options: ['solid', 'dashed', 'dotted', 'dashdot'] },
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
    shortcutKey: 'E',
    properties: {
      color: { type: 'color', default: '#000000' },
      fillColor: { type: 'color', default: '' },
      size: { type: 'number', min: 1, max: 50, default: 2 },
      lineStyle: { type: 'select', default: 'solid', options: ['solid', 'dashed', 'dotted', 'dashdot'] },
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
    shortcutKey: 'T',
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

  stamp: {
    id: 'stamp',
    name: 'Stamp',
    icon: 'sticker',
    cursor: 'crosshair',
    shortcutKey: 'S',
    properties: {},
    handlers: {
      onClick: 'placeStamp',
    },
  },

  connector: {
    id: 'connector',
    name: 'Connector',
    icon: 'cable',
    cursor: 'crosshair',
    shortcutKey: 'C',
    properties: {
      color: { type: 'color', default: '#000000' },
      size: { type: 'number', min: 1, max: 50, default: 2 },
      lineStyle: { type: 'select', default: 'solid', options: ['solid', 'dashed', 'dotted', 'dashdot'] },
    },
    handlers: {
      onMouseDown: 'startConnector',
      onMouseMove: 'previewConnector',
      onMouseUp: 'finishConnector',
    },
  },

  // Pan is not shown in the toolbar but available via Space+drag and middle-click
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
