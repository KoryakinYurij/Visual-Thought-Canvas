import React, { useRef, useEffect } from 'react';
import { NodeData } from '../../types';
import { Sparkles, X, Plus, GripHorizontal } from 'lucide-react';

interface CanvasNodeProps {
  node: NodeData;
  isSelected: boolean;
  onSelect: (id: string, multi: boolean) => void;
  onDelete: (id: string) => void;
  onExpand: (id: string) => void;
  onUpdate: (id: string, content: string) => void;
  onMouseDown: (e: React.PointerEvent, id: string) => void;
}

const CanvasNode: React.FC<CanvasNodeProps> = ({
  node,
  isSelected,
  onSelect,
  onDelete,
  onExpand,
  onUpdate,
  onMouseDown,
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize text area
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [node.content]);

  // Handle interaction
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onMouseDown(e, node.id);
    onSelect(node.id, e.shiftKey);
  };

  const colors = {
    root: 'bg-gradient-to-br from-indigo-500/90 to-purple-600/90 border-indigo-400/50',
    concept: 'bg-slate-800/80 border-slate-600/50',
    note: 'bg-amber-100/90 text-slate-900 border-amber-300',
    image: 'bg-slate-800 border-slate-700',
  };

  const selectedRing = isSelected ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900 shadow-[0_0_20px_rgba(59,130,246,0.5)]' : '';
  const baseClasses = `absolute flex flex-col backdrop-blur-md rounded-2xl border shadow-lg transition-shadow duration-200 select-none group`;
  const typeClasses = colors[node.type] || colors.concept;
  
  // Approximate sizes for rendering. In a real app we might measure ref.
  const style = {
    transform: `translate(${node.position.x}px, ${node.position.y}px)`,
    width: node.width || 220,
    minHeight: node.height || 100,
    zIndex: isSelected ? 50 : 10,
  };

  return (
    <div
      ref={nodeRef}
      style={style}
      className={`${baseClasses} ${typeClasses} ${selectedRing} animate-in fade-in zoom-in duration-300`}
      onPointerDown={handlePointerDown}
    >
      {/* Drag Handle */}
      <div className="h-6 w-full flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
        <GripHorizontal size={14} className="text-white/30" />
      </div>

      <div className="px-4 pb-4 pt-0 flex flex-col h-full relative">
        <textarea
          ref={inputRef}
          value={node.content}
          onChange={(e) => onUpdate(node.id, e.target.value)}
          className={`w-full bg-transparent resize-none outline-none overflow-hidden text-center font-medium ${node.type === 'note' ? 'text-slate-900' : 'text-slate-100'}`}
          placeholder="New Thought..."
          rows={1}
          onPointerDown={(e) => e.stopPropagation()} // Allow text selection
        />
        
        {/* Action Overlay (Visible on Hover/Selection) */}
        <div className={`absolute -right-12 top-0 flex flex-col gap-2 transition-opacity duration-200 ${isSelected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onExpand(node.id); }}
            className="p-2 bg-blue-600 rounded-full text-white shadow-lg hover:bg-blue-500 hover:scale-110 transition-all tooltip-trigger"
            title="AI Expand"
          >
            <Sparkles size={16} />
          </button>
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
            className="p-2 bg-red-500/80 rounded-full text-white shadow-lg hover:bg-red-500 hover:scale-110 transition-all"
            title="Delete"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      
      {/* Node Type Indicator / Status */}
      {node.type === 'root' && (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-indigo-500 text-[10px] text-white rounded-full uppercase tracking-wider font-bold shadow-sm">
          Core
        </div>
      )}
    </div>
  );
};

export default CanvasNode;