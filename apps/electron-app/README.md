# Electron App

The main desktop application built with Electron, React, and TypeScript.

## Development

```bash
# From the monorepo root
pnpm --filter @vibe/electron-app dev

# Or from this directory
pnpm dev
```

## Build

```bash
# For Windows
pnpm build:win

# For macOS
pnpm build:mac

# For Linux
pnpm build:linux
```

## Architecture

- **Main Process**: Handles system-level operations and window management
- **Renderer Process**: React application with TypeScript
- **Preload Scripts**: Secure bridge between main and renderer processes

## Technologies

- Electron
- React
- TypeScript
- Tailwind CSS
- Zustand (State Management)
- Ant Design (UI Components)
