export interface Position {
  x: number;
  y: number;
}

export interface NodeData {
  id: string;
  content: string;
  position: Position;
  type: 'concept' | 'note' | 'image' | 'root';
  color?: string;
  width?: number;
  height?: number;
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
}

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export enum InteractionMode {
  SELECT = 'SELECT',
  PAN = 'PAN',
  CONNECT = 'CONNECT',
}

export interface AIState {
  isThinking: boolean;
  message?: string;
}
