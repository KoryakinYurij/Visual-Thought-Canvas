import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NodeData, Connection, Viewport, InteractionMode, Position, AIState } from '../../types';
import CanvasNode from './CanvasNode';
import CanvasConnection from './CanvasConnection';
import { screenToWorld, generateId, getNodeCenter, getDistance } from '../../utils/geometry';
import { expandConcept, suggestConnection } from '../../services/gemini';
import { Loader2, Zap, MousePointer2 } from 'lucide-react';

const InfiniteCanvas: React.FC = () => {
  // --- State ---
  const [nodes, setNodes] = useState<NodeData[]>([
    { id: 'root', content: 'Central Idea', position: { x: 0, y: 0 }, type: 'root', width: 220, height: 100 }
  ]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [viewport, setViewport] = useState<Viewport>({ x: window.innerWidth / 2 - 110, y: window.innerHeight / 2 - 50, scale: 1 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [aiState, setAiState] = useState<AIState>({ isThinking: false });
  const [mode, setMode] = useState<InteractionMode>(InteractionMode.SELECT);
  
  // Dragging State
  const isDraggingCanvas = useRef(false);
  const isDraggingNode = useRef<string | null>(null);
  const lastMousePos = useRef<Position>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Connecting State
  const [connectingStartId, setConnectingStartId] = useState<string | null>(null);
  const [mouseWorldPos, setMouseWorldPos] = useState<Position>({ x: 0, y: 0 });

  // Viewport Ref for Event Handlers (to avoid stale closures in non-react listeners)
  const viewportRef = useRef<Viewport>(viewport);
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  // --- Actions ---

  const addNode = (pos: Position, type: NodeData['type'] = 'concept', content = '') => {
    const newNode: NodeData = {
      id: generateId(),
      content,
      position: pos,
      type,
      width: 220,
      height: 100
    };
    setNodes(prev => [...prev, newNode]);
    return newNode;
  };

  const handleExpandNode = async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || aiState.isThinking) return;

    setAiState({ isThinking: true, message: 'Expanding thoughts...' });

    const existingContents = nodes.map(n => n.content);
    const result = await expandConcept(node.content, existingContents);

    if (result.nodes.length > 0) {
      const radius = 350;
      const angleStep = (Math.PI * 2) / result.nodes.length;
      let currentAngle = Math.random() * Math.PI; // Random start angle

      const newNodes: NodeData[] = [];
      const newConnections: Connection[] = [];

      result.nodes.forEach((item, index) => {
        const x = node.position.x + radius * Math.cos(currentAngle);
        const y = node.position.y + radius * Math.sin(currentAngle);
        currentAngle += angleStep;

        const newNode = {
          id: generateId(),
          content: item.content,
          position: { x, y },
          type: 'concept' as const,
          width: 220,
          height: 100
        };
        newNodes.push(newNode);

        newConnections.push({
          id: generateId(),
          fromId: nodeId,
          toId: newNode.id,
        });
      });

      setNodes(prev => [...prev, ...newNodes]);
      setConnections(prev => [...prev, ...newConnections]);
    }

    setAiState({ isThinking: false });
  };

  const handleDeleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.fromId !== id && c.toId !== id));
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const handleUpdateNode = (id: string, content: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, content } : n));
  };

  // --- Interaction Handlers ---

  // Native Wheel Handler to support non-passive preventDefault (Fixes browser zoom issue)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Zoom
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;
        const currentViewport = viewportRef.current;
        const newScale = Math.min(Math.max(0.1, currentViewport.scale + delta), 3);
        
        // Zoom towards mouse pointer
        // We use clientX/Y directly because the canvas covers the full screen
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        const worldX = (mouseX - currentViewport.x) / currentViewport.scale;
        const worldY = (mouseY - currentViewport.y) / currentViewport.scale;
        
        const newX = mouseX - worldX * newScale;
        const newY = mouseY - worldY * newScale;

        setViewport({ x: newX, y: newY, scale: newScale });
      } else {
        // Pan
        setViewport(prev => ({
          ...prev,
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    
    return () => {
      canvas.removeEventListener('wheel', onWheel);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 1 || mode === InteractionMode.PAN || e.nativeEvent.getModifierState('Space')) {
        isDraggingCanvas.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        canvasRef.current?.setPointerCapture(e.pointerId);
        return;
    }

    // Clicking on empty space clears selection
    if (e.target === canvasRef.current) {
      setSelectedIds(new Set());
      setConnectingStartId(null);
    }
  };

  const handleNodeMouseDown = (e: React.PointerEvent, id: string) => {
    if (mode === InteractionMode.CONNECT) {
      if (!connectingStartId) {
        setConnectingStartId(id);
      } else {
        if (connectingStartId !== id) {
          // Create Connection
          createConnection(connectingStartId, id);
        }
        setConnectingStartId(null);
      }
    } else {
      isDraggingNode.current = id;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      canvasRef.current?.setPointerCapture(e.pointerId);
    }
  };

  const createConnection = async (fromId: string, toId: string) => {
    // Check if exists
    const exists = connections.some(c => 
      (c.fromId === fromId && c.toId === toId) || (c.fromId === toId && c.toId === fromId)
    );
    if (exists) return;

    const newConnId = generateId();
    // Optimistic update
    setConnections(prev => [...prev, { id: newConnId, fromId, toId }]);

    // AI Labeling
    const fromNode = nodes.find(n => n.id === fromId);
    const toNode = nodes.find(n => n.id === toId);
    if (fromNode && toNode) {
        setAiState({isThinking: true});
        const label = await suggestConnection(fromNode.content, toNode.content);
        setConnections(prev => prev.map(c => c.id === newConnId ? { ...c, label } : c));
        setAiState({isThinking: false});
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    
    // Track mouse world pos for connection line preview
    const worldPos = screenToWorld({ x: e.clientX, y: e.clientY }, viewport);
    setMouseWorldPos(worldPos);

    if (isDraggingCanvas.current) {
      setViewport(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    } else if (isDraggingNode.current) {
      const id = isDraggingNode.current;
      setNodes(prev => prev.map(n => {
        if (n.id === id) {
          return {
            ...n,
            position: {
              x: n.position.x + dx / viewport.scale,
              y: n.position.y + dy / viewport.scale
            }
          };
        }
        // Move selected nodes together if the dragged one is selected
        if (selectedIds.has(id) && selectedIds.has(n.id)) {
           return {
            ...n,
            position: {
              x: n.position.x + dx / viewport.scale,
              y: n.position.y + dy / viewport.scale
            }
          };
        }
        return n;
      }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingCanvas.current = false;
    isDraggingNode.current = null;
    canvasRef.current?.releasePointerCapture(e.pointerId);
  };

  const handleSelect = (id: string, multi: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(multi ? prev : []);
      newSet.add(id);
      return newSet;
    });
  };
  
  // Double click to add node
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
       const worldPos = screenToWorld({ x: e.clientX, y: e.clientY }, viewport);
       // Center the new node on the click
       worldPos.x -= 110; 
       worldPos.y -= 50;
       addNode(worldPos);
    }
  };

  // --- Render ---

  // Transform style for the world container
  const worldStyle = {
    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
    transformOrigin: '0 0',
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-900 text-slate-200">
      
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none canvas-grid"
        style={{ 
          backgroundPosition: `${viewport.x}px ${viewport.y}px`,
          backgroundSize: `${40 * viewport.scale}px ${40 * viewport.scale}px`
        }} 
      />

      {/* Main Canvas Area */}
      <div
        ref={canvasRef}
        className="w-full h-full cursor-default touch-none"
        // onWheel handler removed here, handled by useEffect
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        <div className="absolute top-0 left-0 w-full h-full will-change-transform" style={worldStyle}>
          
          {/* Connections Layer */}
          <svg className="absolute top-0 left-0 overflow-visible w-1 h-1 pointer-events-none">
            {connections.map(conn => (
              <CanvasConnection 
                key={conn.id} 
                connection={conn}
                fromNode={nodes.find(n => n.id === conn.fromId)}
                toNode={nodes.find(n => n.id === conn.toId)}
              />
            ))}
            
            {/* Pending Connection Line */}
            {mode === InteractionMode.CONNECT && connectingStartId && (
               <path
                d={`M ${getNodeCenter(nodes.find(n => n.id === connectingStartId)!).x} ${getNodeCenter(nodes.find(n => n.id === connectingStartId)!).y} L ${mouseWorldPos.x} ${mouseWorldPos.y}`}
                stroke="#60a5fa"
                strokeWidth="2"
                strokeDasharray="5,5"
                fill="none"
               />
            )}
          </svg>

          {/* Nodes Layer */}
          {nodes.map(node => (
            <CanvasNode
              key={node.id}
              node={node}
              isSelected={selectedIds.has(node.id)}
              onSelect={handleSelect}
              onDelete={handleDeleteNode}
              onExpand={handleExpandNode}
              onUpdate={handleUpdateNode}
              onMouseDown={handleNodeMouseDown}
            />
          ))}
        </div>
      </div>

      {/* UI Overlay: Toolbar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-slate-800/60 backdrop-blur-md rounded-full border border-slate-700 shadow-xl">
         <button 
           onClick={() => setMode(InteractionMode.SELECT)}
           className={`p-2 rounded-full transition-colors ${mode === InteractionMode.SELECT ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
           title="Select / Move"
         >
           <MousePointer2 size={20} />
         </button>
         <div className="w-px h-6 bg-slate-600 mx-1"></div>
         <button 
           onClick={() => setMode(InteractionMode.CONNECT)}
           className={`p-2 rounded-full transition-colors ${mode === InteractionMode.CONNECT ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
           title="Connect Mode (Click Source -> Click Target)"
         >
           <Zap size={20} />
         </button>
         <button 
           onClick={() => {
              const centerPos = screenToWorld({x: window.innerWidth/2, y: window.innerHeight/2}, viewport);
              addNode({ x: centerPos.x - 110, y: centerPos.y - 50 });
           }}
           className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-full text-sm font-semibold transition-colors"
         >
           + Idea
         </button>
      </div>

      {/* AI Status Indicator */}
      {aiState.isThinking && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-indigo-600/90 text-white rounded-full shadow-lg animate-pulse">
          <Loader2 className="animate-spin" size={16} />
          <span className="text-sm font-medium">{aiState.message || "Gemini is thinking..."}</span>
        </div>
      )}

      {/* Help Text */}
      <div className="absolute bottom-4 right-4 text-xs text-slate-500 select-none">
        Double-click to add node • Drag space to pan • Ctrl+Scroll to Zoom
      </div>
    </div>
  );
};

export default InfiniteCanvas;