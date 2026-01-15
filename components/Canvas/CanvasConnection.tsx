import React from 'react';
import { Connection, NodeData, Position } from '../../types';
import { calculateConnectionPath, getNodeCenter } from '../../utils/geometry';

interface CanvasConnectionProps {
  connection: Connection;
  fromNode?: NodeData;
  toNode?: NodeData;
}

const CanvasConnection: React.FC<CanvasConnectionProps> = ({ connection, fromNode, toNode }) => {
  if (!fromNode || !toNode) return null;

  const start = getNodeCenter(fromNode);
  const end = getNodeCenter(toNode);
  const pathData = calculateConnectionPath(start, end);
  
  // Calculate mid-point for label
  // Simple approximation for Bezier mid point (t=0.5)
  // For cubic bezier P(t) = (1-t)^3 P0 + 3(1-t)^2 t P1 + 3(1-t) t^2 P2 + t^3 P3
  // Simplified visually by taking avg of start/end for label placement, usually 'good enough' for center labels
  const labelPos = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2
  };

  return (
    <g className="group">
      {/* Shadow path for better visibility */}
      <path
        d={pathData}
        stroke="rgba(0,0,0,0.5)"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      {/* Main Path */}
      <path
        d={pathData}
        stroke="#64748b"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        className="transition-colors duration-300 group-hover:stroke-blue-400"
      />
      
      {/* Animated Flow Dot (only when selected or active logic could be applied) */}
       <circle r="3" fill="#60a5fa">
        <animateMotion dur="2s" repeatCount="indefinite" path={pathData} />
      </circle>

      {/* Connection Label */}
      {connection.label && (
        <g transform={`translate(${labelPos.x}, ${labelPos.y})`}>
          <rect
            x="-40"
            y="-12"
            width="80"
            height="24"
            rx="12"
            fill="#1e293b"
            className="stroke-slate-600"
            strokeWidth="1"
          />
          <text
            x="0"
            y="4"
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="10"
            className="font-medium uppercase tracking-wide pointer-events-none select-none"
          >
            {connection.label}
          </text>
        </g>
      )}
    </g>
  );
};

export default CanvasConnection;
