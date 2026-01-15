# MindSpark Canvas - Development Log

This document tracks the step-by-step development evolution of the MindSpark Canvas application.

## Phase 1: Foundation & Infrastructure
- **Initial Setup**: Established the project structure using React 19 and TypeScript.
- **Dependencies**: Integrated `tailwindcss` for styling and `lucide-react` for iconography via CDN/ESM imports.
- **Entry Points**: Created `index.html` with proper meta tags for mobile responsiveness and `index.tsx` as the React mounting point.
- **Type Definitions**: Defined core data models in `types.ts`:
  - `NodeData`: Structure for thought bubbles (content, position, type).
  - `Connection`: Structure for links between nodes (from, to, label).
  - `Viewport`: State for the infinite canvas camera (x, y, scale).

## Phase 2: Core Engine (The Infinite Canvas)
- **Geometry Utils**: Created `utils/geometry.ts` to handle:
  - `screenToWorld`: Converting DOM mouse coordinates to virtual canvas coordinates.
  - `calculateConnectionPath`: Generating smooth Cubic Bezier curves for connections.
- **Canvas Component**: Implemented `InfiniteCanvas.tsx` as the main controller.
  - **Panning**: Logic to update viewport `x/y` based on mouse drag.
  - **Zooming**: Logic to scale the viewport centered on the mouse pointer.
  - **Grid**: Added a CSS-based background pattern that moves/scales with the viewport.

## Phase 3: Node & Connection Systems
- **Node Component**: Created `CanvasNode.tsx` with:
  - Auto-resizing textareas.
  - Visual styling based on node type (Root, Concept, Note).
  - Hover states for actions (Delete, Expand).
  - Drag-and-drop logic handled via pointer capture.
- **Connection Component**: Created `CanvasConnection.tsx` rendering SVG paths that dynamically update as nodes move.

## Phase 4: AI Integration (Gemini 3)
- **Service Layer**: Implemented `services/gemini.ts` using `@google/genai`.
- **Feature: Idea Expansion**:
  - Used `gemini-3-flash-preview` model.
  - Configured JSON Schema output to ensure structured responses (arrays of new concepts).
  - Implemented logic to spawn new nodes in a radial layout around the source node.
- **Feature: Smart Connection Labeling**:
  - Implemented a lightweight AI call to suggest linking verbs (e.g., "causes", "leads to") when the user connects two nodes.

## Phase 5: Interaction Polish & Bug Fixes
- **Toolbar**: Added a floating toolbar to toggle between "Select" and "Connect" modes.
- **Bug Fix - Button Propagation**:
  - *Issue*: Clicking "Delete" or "Expand" on a node would trigger the node's drag logic instead of the button action.
  - *Fix*: Added `e.stopPropagation()` to the `onPointerDown` events of the action buttons in `CanvasNode.tsx`.
- **Bug Fix - Native Zoom**:
  - *Issue*: Using `Ctrl + Scroll` to zoom the canvas would also trigger the browser's native page zoom.
  - *Fix*: Replaced the React synthetic `onWheel` handler with a native DOM event listener (`passive: false`) in `InfiniteCanvas.tsx` to correctly `preventDefault()`.

## Phase 6: Documentation
- **Project Documentation**: Created `ProjectDescription.md` and `LongMemory.md` to document the codebase and history.
