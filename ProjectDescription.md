# MindSpark Canvas - Project Description

MindSpark Canvas is an intelligent, infinite visual workspace designed for brainstorming, mind mapping, and idea exploration. It combines a physics-inspired direct manipulation interface with the generative power of Google's Gemini 3 models to act as a co-creator rather than just a drawing tool.

## Core Features

### 1. The Infinite Workspace
The application provides a boundless 2D plane where users can organize thoughts spatially.
- **Pan**: Click and drag on the empty background to move around.
- **Zoom**: Hold `Ctrl` and scroll to zoom in/out (0.1x to 3.0x), focused on the cursor location.
- **Grid**: A dynamic background grid provides spatial reference and scales with the view.

### 2. Node Management
- **Creation**: Double-click anywhere on the canvas to spawn a new thought node.
- **Manipulation**: Drag nodes to rearrange them. The connections attached to them update smoothly in real-time.
- **Editing**: Click inside a node to edit its text. The node automatically resizes to fit the content.
- **Context Actions**: Hovering over a node reveals context buttons for "AI Expand" and "Delete".

### 3. Smart Connections
- **Connect Mode**: A dedicated tool (Zap icon) allowing users to draw links between nodes.
- **AI Labeling**: When a connection is created, the app silently queries Gemini to analyze the content of both nodes and suggest a semantic label (e.g., "depends on", "contrasts with") to describe the relationship.
- **Visuals**: Connections are rendered as smooth cubic bezier curves with directional flow indicators.

### 4. Generative AI (The "Spark")
- **Concept Expansion**: Clicking the "Sparkles" icon on a node triggers an AI process.
  - **Model**: `gemini-3-flash-preview`
  - **Behavior**: The AI generates 3-5 related concepts or follow-up questions based on the source node.
  - **Layout**: New nodes are automatically spawned in a radial pattern around the parent.

## Technical Architecture

### Tech Stack
- **Framework**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI SDK**: Google GenAI SDK (`@google/genai`)
- **Icons**: Lucide React

### Data Model (`types.ts`)
The application state is primarily driven by two arrays:
1.  **Nodes**: `{ id, content, position: {x, y}, type }`
2.  **Connections**: `{ id, fromId, toId, label }`

### Coordinate Systems
The app handles two distinct coordinate systems:
- **Screen Space**: The raw X/Y coordinates from DOM pointer events.
- **World Space**: The logical coordinates within the infinite canvas.
- **Transformation**: `utils/geometry.ts` provides `screenToWorld` functions using the current `Viewport` state (translation and scale) to map interactions correctly.

### AI Implementation Details
- **Structured Output**: For concept expansion, we use the `responseSchema` configuration in Gemini to force the model to return valid JSON. This ensures the UI code can reliably parse the generated nodes without regex or fragile string parsing.
- **Latency Optimization**: For connection labeling, we use `thinkingBudget: 0` to prioritize speed, as this is a background enhancement that shouldn't block the user flow.

### Event Handling
- **Pointer Events**: We use React Pointer Events (`onPointerDown`, `onPointerMove`, `onPointerUp`) with `setPointerCapture`. This ensures that if a user drags a node outside the browser window or releases the mouse quickly, the drag operation concludes correctly.
- **Native Listeners**: For zooming, a native DOM event listener is used instead of React's wrapper to support non-passive event handling, which is required to prevent the browser's default zoom behavior.
