# Shortest-Path Visualizer (React)

A React + Vite rewrite of your shortest‑path visualizer with two modes:

- **Maze (grid):** A*, Dijkstra, Bellman‑Ford, Floyd‑Warshall (unit weights). Paint walls, drag Start/Goal, animate path + branches.
- **Nodes (graph):** Create nodes and weighted directed edges, set Start/Goal by dropping markers onto nodes, then animate Dijkstra on the node graph.

## Tech

- React 18 + Vite
- Plain Canvas 2D (no extra libs)
- Your original algorithm and drawing logic, adapted into modules and wired via React hooks

## Install & Run

```bash
npm i
npm run dev
```

Open the printed local URL.

## Build

```bash
npm run build
npm run preview  
```

## Deploy (GitHub Pages)

1. Create a new repo on GitHub and push this project.
2. If deploying to `https://USERNAME.github.io/REPO/`, set the `base` in `vite.config.js` to `/REPO/`.
3. Add the workflow below as `.github/workflows/gh-pages.yml` (already included).

On push to `main`, it builds and publishes `dist/` to GitHub Pages.

## Deploy (Netlify / Vercel)

- **Netlify:** Drag‑and‑drop the `dist/` folder or connect the repo; build command `npm run build`, publish directory `dist`.
- **Vercel:** Import the repo; framework: Vite; build command `npm run build`, output `dist`.

## Notes & Improvements

- Bellman‑Ford and Floyd‑Warshall are primarily for teaching here (grid has non‑negative unit edges). For performance on large grids, prefer Dijkstra / A*.
- The Node mode exposes add/remove edge/node tools, and weight editing on double‑click.
- Settings (rows/cols/cell) apply to Maze mode; switching visual modes resets the underlying model.

Enjoy!
