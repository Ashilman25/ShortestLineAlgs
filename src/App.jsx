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
    req: 'Shortest path on non‑negative weighted graphs.',
    desc: 'Extracts the minimum tentative distance via a priority queue, relaxes neighbours, repeats until the goal is reached.',
    code: `dist[start] = 0
pq = { (0,start) }
while pq:
  d,u = pop_min(pq)
  if u == goal: break
  for each edge (u,v,w):
    if d+w < dist[v]:
      dist[v] = d+w
      prev[v] = u
      push(pq,(dist[v],v))`
  },
  astar: {
    title: 'A*',
    req: 'Heuristic h(v) that never over‑estimates to goal.',
    desc: 'Like Dijkstra but pops min (g+h). Optimal when h is admissible.',
    code: `f[v] = g[v] + h[v]
open = { (f[start], start) }`
  },
  bellmanFord: {
    title: 'Bellman‑Ford',
    req: 'Graphs with negative edges but no negative cycles.',
    desc: '|V|-1 passes relaxing all edges; detects negative cycle on pass |V|.',
    code: `for i in 1..|V|-1:
  for each edge (u,v,w):
    dist[v] = min(dist[v], dist[u]+w)`
  },
  floydWarshall: {
    title: 'Floyd‑Warshall',
    req: 'All‑pairs shortest path, O(V³).',
    desc: 'Dynamic programming over intermediate vertices.',
    code: `for k in V:
  for i in V:
    for j in V:
      d[i][j] = min(d[i][j], d[i][k]+d[k][j])`
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
      viewRef.current  = new GridView(canvas, modelRef.current, { cellSize: cell })
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
    // draw breadcrumb
    ctx.fillStyle = '#000'
    for (let i = 0; i <= animRef.current.pos; i++) {
      const { r, c } = animRef.current.path[i]
      ctx.fillRect(c * cs + cs * .3, r * cs + cs * .3, cs * .2, cs * .2)
    }
    // moving dot
    const { r, c } = animRef.current.path[animRef.current.pos]
    ctx.fillStyle = '#03f'
    ctx.beginPath(); ctx.arc(c * cs + cs/2, r * cs + cs/2, cs * .35, 0, Math.PI*2); ctx.fill()

    if (showDetails) {
      ctx.fillStyle = 'rgba(128,128,128,0.35)'
      const onMain = new Set(animRef.current.path.map(({ r, c }) => `${r},${c}`))
      for (const b of animRef.current.branches) {
        for (let i = 0; i <= b.pos; i++) {
          const { r: br, c: bc } = b.path[i]
          if (onMain.has(`${br},${bc}`)) continue
          ctx.fillRect(bc * cs + cs * .3, br * cs + cs * .3, cs * .4, cs * .4)
        }
        if (b.pos < b.path.length - 1) {
          const { r: br, c: bc } = b.path[b.pos]
          if (!onMain.has(`${br},${bc}`)) {
            ctx.fillStyle = 'rgba(252,144,3,0.4)'
            ctx.beginPath(); ctx.arc(bc * cs + cs/2, br * cs + cs/2, cs * .2, 0, Math.PI*2); ctx.fill()
            ctx.fillStyle = 'rgba(128,128,128,0.35)'
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
  const generateMaze = () => { modelRef.current.randomFill(); viewRef.current.draw(); clearAnim() }
  const clearMaze   = () => { modelRef.current.clear(); modelRef.current.clearMarker('start'); modelRef.current.clearMarker('end'); viewRef.current.draw(); clearAnim() }

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
        <h1>Shortest-Path Algorithms (React MVP)</h1>

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

          <button onClick={handlePlay}>Play</button>
          <button onClick={handlePause}>Pause</button>
          <button onClick={handleStep}>Step</button>
          <button onClick={handleReset}>Reset</button>

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
        </div>
      </header>

      <main>
        {/* Settings Panel */}
        <div id="settingsPanel" className={settingsOpen && visual === 'maze' ? 'visible' : ''}>
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
