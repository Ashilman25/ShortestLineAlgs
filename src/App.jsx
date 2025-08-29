import React, { useEffect, useMemo, useRef, useState } from 'react'

import GridModel from './models/GridModel.js'
import GridView  from './views/GridView.js'
import NodeModel from './models/NodeModel.js'
import NodeView  from './views/NodeView.js'

import { dijShortestPath, dijkstraNodePath } from './algorithms/dijkstra.js'
import { aStarShortestPath } from './algorithms/astar.js'
import { bellmanFordShortestPath } from './algorithms/bellmanford.js'
import { floydWarsShortestPath } from './algorithms/floydwarshall.js'

const ALG = {
  dijkstra: dijShortestPath,
  astar: aStarShortestPath,
  bellmanFord: bellmanFordShortestPath,
  floydWarshall: floydWarsShortestPath,
}

const INFO = {
  dijkstra: {
    title: 'Dijkstra',
    req: `Non‑negative edge weights only
Worst‑case time: O(E log V) with binary heap (O(V^2) array)
Finds single‑source shortest paths & parent tree`,
    desc: 'Maintains a min‑priority queue of frontier vertices by tentative distance; repeatedly extracts the closest, relaxes outgoing edges, and stops when the goal is settled.',
    code: `function Dijkstra(Graph, start, goal):
  for each vertex v:
    dist[v] := +infinity
    prev[v] := undefined
  dist[start] := 0
  pq := min-priority-queue keyed by dist
  pq.insert(start)

  while pq not empty:
    u := pq.extractMin()
    if u == goal: break        # goal distance finalized
    for each edge (u, v, w):    # w = weight(u->v)
      alt := dist[u] + w
      if alt < dist[v]:
        dist[v] := alt
        prev[v] := u
        if v in pq: pq.decreaseKey(v, alt) else pq.insert(v)

  return dist, prev  # prev encodes shortest path tree`
  },
  astar: {
    title: 'A*',
    req: `Requires admissible (and ideally consistent) heuristic h(v) ≥ 0
Worst‑case time: O(E) ~ Dijkstra when h ≡ 0
Explores far fewer nodes when h close to true distance`,
    desc: 'Extends Dijkstra by prioritizing nodes on estimated total cost f = g + h; optimal when h never overestimates (admissible) and is consistent.',
    code: `function AStar(Graph, start, goal, h):
  for each v: g[v] := +infinity; f[v] := +infinity; prev[v] := undefined
  g[start] := 0
  f[start] := h(start)
  open := min-priority-queue ordered by f
  open.insert(start)
  closed := empty set

  while open not empty:
    u := open.extractMin()
    if u == goal: return reconstruct_path(prev, goal)
    closed.add(u)
    for each edge (u, v, w):
      if v in closed: continue
      tentative := g[u] + w
      if tentative < g[v]:
        g[v] := tentative
        f[v] := g[v] + h(v)
        prev[v] := u
        if v in open: open.decreaseKey(v, f[v]) else open.insert(v)

  return failure`
  },
  bellmanFord: {
    title: 'Bellman‑Ford',
    req: `Handles negative edge weights (no negative cycles reachable)
Worst‑case time: O(V * E); Space: O(V)
Detects negative cycle on extra relaxation pass`,
    desc: 'Performs |V|−1 passes relaxing every edge; a further pass that can still relax indicates a negative cycle.',
    code: `function BellmanFord(Graph, start):
  for each vertex v: dist[v] := +infinity; prev[v] := undefined
  dist[start] := 0

  for i from 1 to |V|-1:
    updated := false
    for each edge (u, v, w):
      if dist[u] + w < dist[v]:
        dist[v] := dist[u] + w
        prev[v] := u
        updated := true
    if not updated: break   # early exit

  # Negative cycle check
  for each edge (u, v, w):
    if dist[u] + w < dist[v]:
      return 'NEGATIVE CYCLE'

  return dist, prev`
  },
  floydWarshall: {
    title: 'Floyd‑Warshall',
    req: `All‑pairs shortest paths; works with negative edges
Worst‑case time: O(V^3); Space: O(V^2)
Cannot handle negative cycles (detectable if d[i][i] < 0)`,
    desc: 'Dynamic programming that incrementally allows each vertex as an intermediate, relaxing every pair (i,j) through k.',
    code: `function FloydWarshall(dist):  # dist is VxV matrix (∞ if no edge, 0 on diagonal)
  for k in 0..V-1:
    for i in 0..V-1:
      for j in 0..V-1:
        if dist[i][k] + dist[k][j] < dist[i][j]:
          dist[i][j] := dist[i][k] + dist[k][j]

  # Optional negative cycle detection
  for v in 0..V-1:
    if dist[v][v] < 0: return 'NEGATIVE CYCLE'
  return dist`
  }
}

export default function App() {
  const [visual, setVisual] = useState('maze')       // 'maze' | 'nodes'
  const [alg, setAlg]       = useState('dijkstra')
  const [rows, setRows]     = useState(19)
  const [cols, setCols]     = useState(22)
  const [cell, setCell]     = useState(30)
  const [showDetails, setShowDetails] = useState(false)
  const [speed, setSpeed]   = useState(120)
  const [theme, setTheme]   = useState('light')

  

  useEffect(() => {
    document.body.classList.remove('theme-light', 'theme-dark')
    document.body.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light')

    if (visual === 'maze' && viewRef.current) {
      const style = getComputedStyle(document.body)
      const grid = style.getPropertyValue('--grid-lines').trim()|| (theme === 'dark' ? 'rgba(148,163,184,.28)' : 'rgba(229,231,235,.8)')
      const wall = style.getPropertyValue('--wall').trim() || (theme === 'dark' ? '#334155' : '#0f172a')

      viewRef.current.opt.gridColor = grid
      viewRef.current.opt.wallColor = wall
      viewRef.current.opt.bgColor = null
      viewRef.current.draw()
      drawGridOverlay()
    }
  }, [theme, visual])

  useEffect(() => {
    if (visual !== 'maze') return;
    viewRef.current?.draw?.();
    drawGridOverlay();
  }, [showDetails]);

  const [settingsOpen, setSettingsOpen] = useState(false)

  const canvasRef = useRef(null)
  const modelRef  = useRef(null)  // GridModel | NodeModel
  const viewRef   = useRef(null)  // GridView | NodeView

  // Grid animation state
  const animRef = useRef({ path: [], pos: 0, branches: [], timer: null, playing: false })

  // Setup model+view when visual/rows/cols/cell changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Cleanup previous view listeners if swapping types
    if (viewRef.current && viewRef.current.destroy) {
      try { viewRef.current.destroy() } catch {}

    }

    if (visual === 'maze') {
      modelRef.current = new GridModel(rows, cols)
      const style = getComputedStyle(document.body)
      const grid = style.getPropertyValue('--grid-lines').trim() || (theme==='dark' ? 'rgba(148,163,184,.28)' : 'rgba(229,231,235,.8)');
      const wall = style.getPropertyValue('--wall').trim() || (theme==='dark' ? '#334155' : '#0f172a');


      viewRef.current = new GridView(canvas, modelRef.current, {
        cellSize: cell,
        bgColor: null,
        gridColor: grid,
        wallColor: wall
      })

      viewRef.current.draw()
      resetAnim()

    } else {
      modelRef.current = new NodeModel()
      viewRef.current  = new NodeView(canvas, modelRef.current)
    }

    // Drag & drop markers
    const onDragOver = e => e.preventDefault()
    const onDrop = e => {
      e.preventDefault()
      const kind = e.dataTransfer.getData('text/plain') // 'start' | 'end'
      if (!kind) return
      const rect = canvas.getBoundingClientRect()
      if (visual === 'maze') {
        const [r, c] = viewRef.current.cssToCell(e.clientX - rect.left, e.clientY - rect.top)
        modelRef.current.setMarker(kind, r, c)
        viewRef.current.draw()
      } else {
        const x = e.clientX - rect.left, y = e.clientY - rect.top
        const node = modelRef.current.nodeAt(x, y)
        if (!node) return
        modelRef.current.setMarker(kind, node)
        viewRef.current.draw()
      }
    }
    canvas.addEventListener('dragover', onDragOver)
    canvas.addEventListener('drop', onDrop)

    return () => {
      canvas.removeEventListener('dragover', onDragOver)
      canvas.removeEventListener('drop', onDrop)
    }
  }, [visual, rows, cols, cell])

  // Painting for maze mode
  useEffect(() => {
    if (visual !== 'maze') return
    const canvas = canvasRef.current
    const view = viewRef.current
    const model = modelRef.current
    let isPainting = false, paintAdd = true, lastRC = null

    const getCell = (ev) => {
      const rect = canvas.getBoundingClientRect()
      return view.cssToCell(ev.clientX - rect.left, ev.clientY - rect.top)
    }
    const applyPaint = ([r, c]) => {
      if (paintAdd) model.addWall(r, c); else model.removeWall(r, c)
      view.draw()
      clearAnim()
    }

    const onDown = e => {
      if (e.button !== 0) return
      const rc = getCell(e)
      if (!rc) return
      paintAdd = !model.isWall(...rc)
      applyPaint(rc)
      isPainting = true
      lastRC = rc
    }
    const onMove = e => {
      if (!isPainting) return
      const rc = getCell(e)
      if (!rc || (lastRC && rc[0] === lastRC[0] && rc[1] === lastRC[1])) return
      applyPaint(rc)
      lastRC = rc
    }
    const onUp = () => { isPainting = false; lastRC = null }

    canvas.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)

    return () => {
      canvas.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [visual])

  // Fix typo True -> true
  // (We can't edit the string above easily; patch quickly by redefining isPainting setter.)

  function clearAnim() {
    const a = animRef.current
    if (a.timer) clearInterval(a.timer)
    animRef.current = { path: [], pos: 0, branches: [], timer: null, playing: false }
  }
  function resetAnim() {
    clearAnim()
    viewRef.current?.draw?.()
  }
  function stepAnim() {
    const a = animRef.current
    if (!a.path.length) return
    if (a.pos < a.path.length - 1) a.pos++
    for (const b of a.branches) { if (b.pos < b.path.length - 1) b.pos++ }
    viewRef.current.draw()
    drawGridOverlay()
  }
  function drawGridOverlay() {
    const v = viewRef.current
    if (!v?.ctx || !animRef.current.path.length) return
    const ctx = v.ctx
    const cs = v.opt.cellSize
    ctx.save()

    // breadcrumbs (visited on main path so far)
    ctx.fillStyle = 'rgba(17,24,39,0.7)' // slate-900, 70%
    for (let i = 0; i <= animRef.current.pos; i++) {
      const { r, c } = animRef.current.path[i]
      ctx.fillRect(c * cs + cs * .32, r * cs + cs * .32, cs * .18, cs * .18)
    }

    // moving dot (main path head)
    const { r, c } = animRef.current.path[animRef.current.pos]
    ctx.fillStyle = '#2563eb' // blue-600
    ctx.beginPath()
    ctx.arc(c * cs + cs/2, r * cs + cs/2, cs * .34, 0, Math.PI*2)
    ctx.fill()

    if (showDetails) {
      // alternative branches
      const onMain = new Set(animRef.current.path.map(({ r, c }) => `${r},${c}`))
      ctx.fillStyle = 'rgba(100,116,139,.35)' // slate-500, 35%
      for (const b of animRef.current.branches) {
        for (let i = 0; i <= b.pos; i++) {
          const { r: br, c: bc } = b.path[i]
          if (onMain.has(`${br},${bc}`)) continue
          ctx.fillRect(bc * cs + cs * .28, br * cs + cs * .28, cs * .44, cs * .44)
        }
        // branch frontier
        if (b.pos < b.path.length - 1) {
          const { r: br, c: bc } = b.path[b.pos]
          if (!onMain.has(`${br},${bc}`)) {
            ctx.fillStyle = 'rgba(252,146,31,.45)' // orange-ish glow
            ctx.beginPath()
            ctx.arc(bc * cs + cs/2, br * cs + cs/2, cs * .20, 0, Math.PI*2)
            ctx.fill()
            ctx.fillStyle = 'rgba(100,116,139,.35)'
          }
        }
      }
    }

    ctx.restore()
  }

  function computeIfNeeded() {
    if (visual === 'maze') {
      if (!animRef.current.path.length) {
        const fn = ALG[alg] || ALG.dijkstra
        const res = fn(modelRef.current) || { path: [], branches: [] }
        animRef.current.path = res.path
        animRef.current.branches = (res.branches || []).map(p => ({ path: p, pos: 0 }))
        animRef.current.pos = 0

        viewRef.current.draw();
        drawGridOverlay();
      }
    } else {
      // Node mode path will be computed in play handler if needed
    }
  }

  function handlePlay() {
    if (visual === 'maze') {
      computeIfNeeded()
      const a = animRef.current
      if (a.playing) return
      a.playing = true
      a.timer = setInterval(() => {
        if (a.pos < a.path.length - 1) {
          a.pos++
          for (const b of a.branches) if (b.pos < b.path.length - 1) b.pos++
          viewRef.current.draw(); drawGridOverlay()
        } else {
          handlePause()
        }
      }, Number(speed))
    } else {
      // Node mode
      const view = viewRef.current
      if (!view.anim.path.length) {
        const path = dijkstraNodePath(modelRef.current)
        if (!path.length) { alert('No path'); return }
        view.startAnim(path)
      } else {
        // resume
        view.anim.playing = true
        view._tick?.()
      }
    }
  }
  function handlePause() {
    if (visual === 'maze') {
      const a = animRef.current
      if (!a.playing) return
      clearInterval(a.timer)
      a.playing = false
    } else {
      viewRef.current.pauseAnim?.()
    }
  }
  function handleStep() {
    if (visual === 'maze') {
      computeIfNeeded()
      handlePause()
      stepAnim()
    } else {
      const v = viewRef.current
      if (!v.anim.path.length) {
        const path = dijkstraNodePath(modelRef.current)
        if (!path.length) { alert('No path'); return }
        v.startAnim(path)
        v.pauseAnim?.()
      } else {
        v.stepAnim?.()
      }
    }
  }
  function handleReset() {
    if (visual === 'maze') {
      clearAnim(); viewRef.current.draw(); drawGridOverlay()
    } else {
      viewRef.current.resetAnim?.()
    }
  }

  // UI helpers for marker drag
  const onMarkerDragStart = (e, kind) => {
    e.dataTransfer.setData('text/plain', kind)
  }

  // Maze utilities
  const generateMaze = () => {
    const m = modelRef.current
    if (!m) return

    m.clear()
    m.randomFill(0.32)

    if (m.start) m.removeWall(m.start.r, m.start.c)
    if (m.end) m.removeWall(m.end.r, m.end.c)

    clearAnim()
    viewRef.current.draw()
    drawGridOverlay()
  }

  const clearMaze = () => {
    const m = modelRef.current
    if (!m) return
    m.clear()
    clearAnim()
    viewRef.current.draw()
  }


  // Node utilities
  const addNode = () => viewRef.current.addNode?.()
  const toggleEdgeMode = () => viewRef.current.setEdgeMode?.(!viewRef.current._edgeMode)
  const toggleDelEdge  = () => viewRef.current.setDeleteEdgeMode?.(!viewRef.current._delMode)
  const toggleDelNode  = () => viewRef.current.setDeleteNodeMode?.(!viewRef.current._delNodeMode)

  // Info panel content
  const info = INFO[alg]

  return (
    <>
      <header>
        <h1>Shortest Path Algorithms</h1>

        <div className="themeToggle">
            <button
              className="iconBtn"
              onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {theme === 'dark' ? '☀︎' : '☾'}
            </button>
        </div>

        <div className="controls">
          <label>Visual:&nbsp;
            <select value={visual} onChange={e => setVisual(e.target.value)}>
              <option value="maze">Maze</option>
              <option value="nodes">Nodes</option>
            </select>
          </label>

          <label>Algorithm:&nbsp;
            <select value={alg} onChange={e => { setAlg(e.target.value); }}>
              <option value="dijkstra">Dijkstra</option>
              <option value="astar">A*</option>
              <option value="bellmanFord">Bellman-Ford</option>
              <option value="floydWarshall">Floyd-Warshall</option>
            </select>
          </label>

          <button className="primary" onClick={handlePlay}>Play</button>
          <button onClick={handlePause}>Pause</button>
          <button onClick={handleStep}>Step</button>

          <label>Speed:&nbsp;
            <input type="range" min="10" max="500" value={speed} onChange={e => setSpeed(e.target.value)} />
          </label>

          {/* Node controls */}
          <div className={"modePanel" + (visual === 'nodes' ? ' visible' : '')}>
            <button onClick={addNode}>Add node</button>
            <button id="deleteNode" className={viewRef.current?._delNodeMode ? 'active' : ''} onClick={toggleDelNode}>Delete node</button>
            <button id="addEdge" className={viewRef.current?._edgeMode ? 'active' : ''} onClick={toggleEdgeMode}>Add Edge</button>
            <button id="removeEdge" className={viewRef.current?._delMode ? 'active' : ''} onClick={toggleDelEdge}>Remove Edge</button>
          </div>

          {/* Maze controls */}
          <div className={"modePanel" + (visual === 'maze' ? ' visible' : '')}>
            <button onClick={generateMaze}>Generate maze</button>
            <button onClick={clearMaze}>Clear</button>
          </div>

          {/* Marker drag panel (both modes) */}
          <div className="markerPanel">
            <div id="startMarker" className="marker" draggable onDragStart={e => onMarkerDragStart(e, 'start')}>
              <span className="box" style={{ background: '#0a0' }}></span>Start
            </div>
            <div id="endMarker" className="marker" draggable onDragStart={e => onMarkerDragStart(e, 'end')}>
              <span className="box" style={{ background: 'rgb(254, 43, 43)' }}></span>Goal
            </div>
          </div>
          
          <button className="resetFull" onClick={handleReset}>Reset</button>

        </div>
        
      </header>

      <main>
        {/* Settings Panel */}
        <div id="settingsPanel" className={visual === 'maze' ? 'visible' : ''}>
          
          <button id="settingsToggle" onClick={() => setSettingsOpen(v => !v)}>
            {settingsOpen ? 'Settings ▼' : 'Settings ▲'}
          </button>

          <div id="settingsBox" className={'settingsBox ' + (settingsOpen ? 'visible' : '')}>
            <label>Rows <input id="rowsInput" type="number" min="5" max="100" value={rows} onChange={e => setRows(Number(e.target.value)||19)} /></label>
            <label>Cols <input id="colsInput" type="number" min="5" max="100" value={cols} onChange={e => setCols(Number(e.target.value)||22)} /></label>
            <label>Cell <input id="cellInput" type="number" min="10" max="60" value={cell} onChange={e => setCell(Number(e.target.value)||30)} /></label>
            <label><input type="checkbox" checked={showDetails} onChange={e => setShowDetails(e.target.checked)} /> Show details</label>
          </div>
        </div>

        <div className="canvasWrap">
          <canvas ref={canvasRef} />
          <aside id="infoPanel">
            <h2>{info.title}</h2>
            <section>
              <h3>1 · Need to Know</h3>
              <ul className="bullet">
                {info.req.split('\n').map((line, i) => <li key={i}>{line.trim()}</li>)}
              </ul>
            </section>
            <section>
              <h3>2 · How it works</h3>
              <div>{info.desc}</div>
            </section>
            <section>
              <h3>3 · Pseudocode</h3>
              <pre>{info.code}</pre>
            </section>
          </aside>
        </div>

        <div id="metrics"></div>
      </main>
    </>
  )
}
