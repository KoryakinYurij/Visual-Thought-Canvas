import { Position, NodeData } from '../types';

export const screenToWorld = (screenPos: Position, viewport: { x: number; y: number; scale: number }): Position => {
  return {
    x: (screenPos.x - viewport.x) / viewport.scale,
    y: (screenPos.y - viewport.y) / viewport.scale,
  };
};

export const getDistance = (p1: Position, p2: Position): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const getNodeCenter = (node: NodeData): Position => {
  const width = node.width || 200;
  const height = node.height || 100;
  return {
    x: node.position.x + width / 2,
    y: node.position.y + height / 2,
  };
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

// Calculate a smooth cubic bezier path between two nodes
export const calculateConnectionPath = (start: Position, end: Position): string => {
  const dist = getDistance(start, end);
  // Control points curvature depends on distance
  const curvature = Math.min(dist * 0.5, 150);
  
  // We want the line to generally flow horizontally or vertically depending on orientation,
  // but for a mind map, a generic curvature works well.
  
  // Pull control points horizontally
  const cp1 = { x: start.x + curvature, y: start.y };
  const cp2 = { x: end.x - curvature, y: end.y };
  
  // If nodes are vertical relative to each other, adjust control points
  if (Math.abs(start.x - end.x) < Math.abs(start.y - end.y)) {
     // Vertical dominance
     cp1.x = start.x;
     cp1.y = start.y + curvature;
     cp2.x = end.x;
     cp2.y = end.y - curvature;
  }

  return `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
};
