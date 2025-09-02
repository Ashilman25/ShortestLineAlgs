import React, { useEffect, useMemo, useRef, useState } from 'react'

import GridModel from './models/GridModel.js'
import GridView  from './views/GridView.js'
import NodeModel from './models/NodeModel.js'
import NodeView  from './views/NodeView.js'

import { dijShortestPath, dijkstraNodePath } from './algorithms/dijkstra.js'
import { aStarShortestPath } from './algorithms/astar.js'
import { bellmanFordShortestPath } from './algorithms/bellmanford.js'
import { floydWarsShortestPath } from './algorithms/floydwarshall.js'

const TWO_COL_BP = 1360;

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
    if u == goal: break        
    for each edge (u, v, w):    
      alt := dist[u] + w
      if alt < dist[v]:
        dist[v] := alt
        prev[v] := u
        if v in pq: pq.decreaseKey(v, alt) else pq.insert(v)

  return dist, prev  `
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
    if not updated: break   

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
    code: `function FloydWarshall(dist):  
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

  const [showDetails, setShowDetails] = useState(false)
  const [speed, setSpeed]   = useState(120)
  const [theme, setTheme]   = useState('light')
  const [renderScale, setRenderScale] = useState(1) //1 to 3
  const [nodeUIMode, setNodeUIMode] = useState(null)

  const GRID_SIZE = Math.min(22 * 30, 19 * 30);
  const MIN_N = 5;
  const MAX_N = 100;

  const [n, setN] = useState(19);
  const rows = n;
  const cols = n;

  const cellPx = useMemo(() => GRID_SIZE / n, [n]);

  useEffect(() => {
    const nn = Math.max(MIN_N, Math.min(MAX_N, n));
    if (nn !== n) { setN(nn); return; }
    resetAnim();
    viewRef.current?.draw?.();
    drawGridOverlay();
  }, [n]);




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

  const press = (which) => setNodeUIMode(m => (m === which ? null : which))

  // when you leave Nodes mode, clear any toggle
  useEffect(() => { if (visual !== 'nodes') setNodeUIMode(null) }, [visual])

  // reflect UI mode to NodeView flags
  useEffect(() => {
    const v = viewRef.current
    if (!v) return
    v.setEdgeMode?.(nodeUIMode === 'edge')
    v.setDeleteEdgeMode?.(nodeUIMode === 'delEdge')
    v.setDeleteNodeMode?.(nodeUIMode === 'delNode')
  }, [nodeUIMode])


  const [settingsOpen, setSettingsOpen] = useState(true)

  const canvasRef = useRef(null)
  const modelRef  = useRef(null)  // GridModel | NodeModel
  const viewRef   = useRef(null)  // GridView | NodeView

  const needRef = useRef(null) 
  const howRef = useRef(null)

    // Fit the text inside .need/.how by shrinking font-size (via CSS var) until it fits
    function fitSection(sectionEl, contentSelector, {min=0.70, pad=4} = {}) {
      if (!sectionEl) return
      const content = sectionEl.querySelector(contentSelector)
      const header  = sectionEl.querySelector('h3')
      if (!content) return

      // reset scale
      sectionEl.style.setProperty('--fit-scale', '1')

      const styles = getComputedStyle(sectionEl)
      const pt = parseFloat(styles.paddingTop)  || 0
      const pb = parseFloat(styles.paddingBottom) || 0

      const available = sectionEl.clientHeight - (header?.offsetHeight || 0) - pt - pb - pad
      if (available <= 0) return

      // If it already fits, stop early
      if (content.scrollHeight <= available) return

      // Iteratively shrink to fit
      let lo = min, hi = 1, best = min
      for (let i = 0; i < 10; i++) {          // binary search ~10 steps
        const mid = (lo + hi) / 2
        sectionEl.style.setProperty('--fit-scale', String(mid))
        // force reflow
        // eslint-disable-next-line no-unused-expressions
        content.offsetHeight

        if (content.scrollHeight <= available) { best = mid; hi = mid } else { lo = mid }
      }
      sectionEl.style.setProperty('--fit-scale', String(best))
    }


  // Grid animation state
  const animRef = useRef({
    path: [], pos: 0, branches: [],
    timer: null,      
    playing: false,
    rafId: null,
    lastTs: null,
    acc: 0,
    msPerStep: 120
  })

  // near other refs
  const infoRef = useRef(null)

  // keep the info panel from exceeding the canvas height
  useEffect(() => {
    const canvas = canvasRef.current
    const info   = infoRef.current
    const wrap   = document.querySelector('.canvasWrap')
    if (!canvas || !info || !wrap) return

    const mqTwoCols = window.matchMedia(`(min-width: ${TWO_COL_BP + 1}px)`);

    const runFits = () => {
      if (wrap.classList.contains('stackInfo')) {
        needRef.current?.style.setProperty('--fit-scale', '1')
        howRef.current?.style.setProperty('--fit-scale', '1')
        return
      }
      fitSection(needRef.current, 'ul.bullet')
      fitSection(howRef.current,  '.howBody')
    }

    const check = () => {
      wrap.classList.remove('splitInfo', 'stackInfo')
      info.style.maxHeight = ''
      info.style.height = ''                 // ✨ reset explicit height

      if (!mqTwoCols.matches) { runFits(); return }

      // Use the painted size (incl. borders) to match visually
      const gridH = Math.round(canvas.getBoundingClientRect().height)

      // ✨ hard-lock the panel height to the canvas while side-by-side
      info.style.height    = gridH + 'px'
      info.style.maxHeight = gridH + 'px'    // keep max consistent to avoid clamping

      let overflow = info.scrollHeight > gridH
      if (overflow) {
        // Try split mode (code moves under canvas)
        wrap.classList.add('splitInfo')
        // Re-lock height after layout change
        const gridH2 = Math.round(canvas.getBoundingClientRect().height)
        info.style.height    = gridH2 + 'px' // ✨ lock again
        info.style.maxHeight = gridH2 + 'px'

        void info.offsetHeight
        overflow = info.scrollHeight > gridH2
        if (overflow) {
          // Final fallback: stack everything; let panel grow naturally
          wrap.classList.remove('splitInfo')
          wrap.classList.add('stackInfo')
          info.style.maxHeight = ''
          info.style.height = ''             // ✨ release the lock when stacked
        }
      }
      runFits()
    }

    const ro = new ResizeObserver(check)
    ro.observe(canvas)
    ro.observe(info)
    window.addEventListener('resize', check)
    check()

    return () => { ro.disconnect(); window.removeEventListener('resize', check) }
  }, [visual, n, showDetails, alg, theme])





  // Setup model+view when visual/rows/cols/cell changes
  // Setup model+view when visual/rows/cols/grid size changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (viewRef.current?.destroy) {
      try { viewRef.current.destroy() } catch {}
    }

    // Lock the on-page canvas size to a square; the drawn size matches exactly.
    canvas.style.width  = `${GRID_SIZE}px`
    canvas.style.height = `${GRID_SIZE}px`

    if (visual === 'maze') {
      modelRef.current = new GridModel(n, n)
      const style = getComputedStyle(document.body)
      const grid = style.getPropertyValue('--grid-lines').trim() || (theme==='dark' ? 'rgba(148,163,184,.28)' : 'rgba(229,231,235,.8)')
      const wall = style.getPropertyValue('--wall').trim()       || (theme==='dark' ? '#334155'              : '#0f172a')

      viewRef.current = new GridView(canvas, modelRef.current, {
        cellSize: cellPx,   // exactly GRID_SIZE / n
        bgColor: null,
        gridColor: grid,
        wallColor: wall,
        renderScale
      })

      viewRef.current.draw()
      resetAnim()
    } else {
      modelRef.current = new NodeModel()
      viewRef.current  = new NodeView(canvas, modelRef.current)
    }

    // DnD handlers unchanged...
    const onDragOver = e => e.preventDefault()
    const onDrop = e => {
      e.preventDefault()
      const kind = e.dataTransfer.getData('text/plain')
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
  }, [visual, n, cellPx, renderScale, theme])  // ← no gridW/gridH here



  // Painting for maze mode
  useEffect(() => {
    if (visual !== 'maze') return
    const canvas = canvasRef.current
    let isPainting = false, paintAdd = true, lastRC = null

    const getCell = (ev) => {
      const rect = canvas.getBoundingClientRect()
      const view = viewRef.current
      return view?.cssToCell(ev.clientX - rect.left, ev.clientY - rect.top)
    }
    const applyPaint = ([r, c]) => {
      const model = modelRef.current
      const view = viewRef.current
      if (!model || !view) return
      if (paintAdd) model.addWall(r, c); else model.removeWall(r, c)
      view.draw()
      clearAnim()
    }

    const onDown = e => {
      if (e.button !== 0) return
      const rc = getCell(e)
      if (!rc) return
      const model = modelRef.current
      if (!model) return
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
  }, [visual, n, cellPx])

  // Fix typo True -> true
  // (We can't edit the string above easily; patch quickly by redefining isPainting setter.)

  function clearAnim() {
    const a = animRef.current
    if (a.timer) clearInterval(a.timer)
    if (a.rafId) cancelAnimationFrame(a.rafId)
    animRef.current = {
      path: [], pos: 0, branches: [],
      timer: null, playing: false,
      rafId: null, lastTs: null, acc: 0, msPerStep: Number(speed)
    }
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
  function drawGridOverlay(frac = 0) {
  const v = viewRef.current
  if (!v?.ctx || !animRef.current.path.length) return
  const ctx = v.ctx
  const cs = v.opt.cellSize

  // Small ease for nicer feel
  const smooth = (t) => t * t * (3 - 2 * t)
  const t = Math.min(Math.max(frac, 0), 1)
  const f = smooth(t)

  ctx.save()

  // --- MAIN PATH ---
  // breadcrumbs (visited on main path so far) – adapt color for dark mode visibility
  const breadcrumbColor = theme === 'dark'
    ? 'rgba(255,255,255,0.55)'   // light dots on dark background
    : 'rgba(17,24,39,0.70)'      // dark dots on light background
  ctx.fillStyle = breadcrumbColor

  
  for (let i = 0; i <= animRef.current.pos; i++) {
    const { r, c } = animRef.current.path[i]
    ctx.fillRect(c * cs + cs * .32, r * cs + cs * .32, cs * .18, cs * .18)
  }

  // moving dot (interpolated between pos and pos+1)
  const a = animRef.current
  const p0 = a.path[a.pos]
  const p1 = a.path[Math.min(a.pos + 1, a.path.length - 1)]
  const headX = (p0.c + (p1.c - p0.c) * f) * cs + cs / 2
  const headY = (p0.r + (p1.r - p0.r) * f) * cs + cs / 2

  ctx.fillStyle = '#2563eb'
  ctx.beginPath()
  ctx.arc(headX, headY, cs * .34, 0, Math.PI * 2)
  ctx.fill()

  // --- BRANCHES (smooth) ---
  if (showDetails) {
    // treat squares as centered shapes for clean interpolation
    const onMain = new Set(a.path.map(({ r, c }) => `${r},${c}`))

    const drawCenteredSquare = (cx, cy, size) => {
      const half = size / 2
      ctx.fillRect(cx - half, cy - half, size, size)
    }

    const VISITED_SIZE = cs * .44
    const FRONTIER_SIZE = cs * .44

    // visited style
    const visitedFill = 'rgba(100,116,139,.35)'       // slate-500 @ 35%
    // frontier moving block (slightly stronger)
    const frontierFill = 'rgba(100,116,139,.55)'

    for (const b of a.branches) {
      if (!b.path?.length) continue

      // 1) Draw fully visited squares up to b.pos - 1
      ctx.fillStyle = visitedFill
      for (let i = 0; i < Math.min(b.pos, b.path.length); i++) {
        const { r: br, c: bc } = b.path[i]
        if (onMain.has(`${br},${bc}`)) continue
        const cx = bc * cs + cs / 2
        const cy = br * cs + cs / 2
        drawCenteredSquare(cx, cy, VISITED_SIZE)
      }

      // 2) Interpolated frontier square between b.pos and b.pos+1
      if (b.pos < b.path.length) {
        const b0 = b.path[b.pos]
        const b1 = b.path[Math.min(b.pos + 1, b.path.length - 1)]

        // Skip if frontier is sitting on the main path cell
        const tag0 = `${b0.r},${b0.c}`
        if (!onMain.has(tag0)) {
          const bx = (b0.c + (b1.c - b0.c) * f) * cs + cs / 2
          const by = (b0.r + (b1.r - b0.r) * f) * cs + cs / 2

          // slightly grow/shrink for life
          const pulse = 1 + 0.06 * Math.sin(performance.now() / 180)
          ctx.fillStyle = frontierFill
          drawCenteredSquare(bx, by, FRONTIER_SIZE * pulse)

          // 3) Interpolated frontier ring (orange glow)
          ctx.fillStyle = 'rgba(252,146,31,.45)'
          ctx.beginPath()
          ctx.arc(bx, by, cs * .20, 0, Math.PI * 2)
          ctx.fill()
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

  function startRAF() {
    const a = animRef.current
    if (a.playing) return
    a.playing = true
    a.lastTs = null
    a.acc = 0
    a.msPerStep = Number(speed)   // ms to move 1 cell

    const tick = (ts) => {
      if (!a.playing) return
      if (a.lastTs == null) a.lastTs = ts
      const dt = ts - a.lastTs
      a.lastTs = ts
      a.acc += dt

      // advance whole cells as needed
      while (a.acc >= a.msPerStep && a.pos < a.path.length - 1) {
        a.acc -= a.msPerStep
        a.pos++
        for (const b of a.branches) if (b.pos < b.path.length - 1) b.pos++
      }
      const frac = Math.min(a.acc / a.msPerStep, 1) || 0

      // draw frame
      viewRef.current.draw()
      drawGridOverlay(frac)

      if (a.pos >= a.path.length - 1) { handlePause(); return }
      a.rafId = requestAnimationFrame(tick)
    }
    a.rafId = requestAnimationFrame(tick)
  }

  function handlePlay() {
    if (visual === 'maze') {
      computeIfNeeded()
      startRAF()
    } else {
      const view = viewRef.current
      if (!view.anim.path.length) {
        const path = dijkstraNodePath(modelRef.current)
        if (!path.length) { alert('No path'); return }
        view.startAnim(path)
      } else {
        view.anim.playing = true
        view._tick?.()
      }
    }
  }


  function handlePause() {
    if (visual === 'maze') {
        const a = animRef.current
        if (!a.playing) return
        a.playing = false
        if (a.rafId) cancelAnimationFrame(a.rafId)
        a.rafId = null
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

            <button
              id="addEdge"
              className="toggle"
              aria-pressed={nodeUIMode === 'edge'}
              onClick={() => press('edge')}
            >
              Add Edge
            </button>

            <button
              id="removeEdge"
              className="toggle"
              aria-pressed={nodeUIMode === 'delEdge'}
              onClick={() => press('delEdge')}
            >
              Remove Edge
            </button>

            <button
              id="deleteNode"
              className="toggle"
              aria-pressed={nodeUIMode === 'delNode'}
              onClick={() => press('delNode')}
            >
              Delete node
            </button>
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


        <div className="canvasWrap">
          {/* Settings Panel */}
          <div id="settingsPanel" className={visual === 'maze' ? 'visible' : ''}>
            
            <button id="settingsToggle" onClick={() => setSettingsOpen(v => !v)}>
              {settingsOpen ? 'Settings ▼' : 'Settings ▲'}
            </button>

            <div id="settingsBox" className={'settingsBox ' + (settingsOpen ? 'visible' : '')}>
              <label>
                Grid (n × n)
                <input
                  id="nInput"
                  type="number"
                  min={MIN_N}
                  max={MAX_N}
                  value={n}
                  onChange={e => setN(Number(e.target.value) || n)}
                />
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={showDetails}
                  onChange={e => setShowDetails(e.target.checked)}
                /> Show details
              </label>
            </div>
          </div>

        <canvas ref={canvasRef} />
        <aside id="infoPanel" className="algoInfo" ref={infoRef}>
            <div className="infoHeader">
              <h2>{info.title}</h2>
            </div>

            <div className="infoGrid">
              <section className="need" ref={needRef}>
                <h3>1 · Need to Know</h3>
                <ul className="bullet">
                  {info.req.split('\n').map((line, i) => <li key={i}>{line.trim()}</li>)}
                </ul>
              </section>

              <section className="how" ref={howRef}>
                <h3>2 · How it works</h3>
                <div className="howBody">{info.desc}</div>
              </section>

              <section className="code">
                <h3>3 · Pseudocode</h3>
                <pre className="codeBlock">{info.code}</pre>
              </section>
            </div>
          </aside>


          <section id="codeBelow" className="codeBelow">
            <h3>3 · Pseudocode</h3>
            <pre className="codeBlock">{info.code}</pre>
          </section>


        </div>

        <div id="metrics"></div>
      </main>
    </>
  )
}
