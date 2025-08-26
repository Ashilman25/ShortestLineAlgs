# 🔍 Shortest-Path Visualizer (React)

An interactive React + Vite app that lets you **see shortest-path algorithms in action**.  
It’s built to help you learn how classic algorithms explore and solve paths step by step.

## 🚀 What You’ll See

The app has **two modes**, each with its own experience:

- **🧩 Maze Mode (grid)**
  - Choose an algorithm: **A\***, **Dijkstra**, **Bellman–Ford**, or **Floyd–Warshall**
  - Paint walls by dragging, or generate a random maze
  - Drag **Start** and **Goal** markers anywhere
  - Watch the algorithm animate as it searches:
    - The main path is traced with a moving blue circle
    - Explored side-branches appear in gray/orange if details are enabled

- **🔗 Nodes Mode (graph)**
  - Add draggable nodes on the canvas
  - Create or remove **directed weighted edges** (double-click an edge to edit its weight)
  - Drop Start/Goal markers onto nodes
  - Run **Dijkstra** on the graph and watch the glowing pulse animate along the path

## 🛠 Tech Behind It

- **React 18 + Vite** for a modern, fast dev experience
- **Plain Canvas 2D** (no extra libs) for rendering
- Classic algorithms implemented directly:
  - A\*, Dijkstra, Bellman-Ford, Floyd-Warshall
- Built for both **education** and **visual clarity**

## 📌 Notes

- **Maze mode** uses unit weights; Bellman–Ford and Floyd–Warshall are included for demonstration but are slower on larger grids.
- **Nodes mode** is great for experimenting with weighted directed graphs interactively.
- Settings (rows/cols/cell size, “show details”) apply only to Maze mode. Switching modes resets the current model.

👉 With this visualizer, learners can **interactively explore how algorithms think**—not just the final path, but the journey they take to find it.
