// BFS / DFS for NodeModel (directed graph). Returns path as array of node IDs.

export function bfsNodePath(model) {
  const start = model.start, goal = model.goal
  if (!start || !goal) return []

  const id2node = id => model.nodes.find(n => n.id === id)
  const q = [start]
  const seen = new Set([start])
  const prev = new Map()

  while (q.length) {
    const u = q.shift()
    if (u === goal) break
    const uNode = id2node(u)
    if (!uNode) continue
    for (const { node: vNode } of model.neighbours(uNode)) {
      if (!vNode) continue
      const v = vNode.id
      if (!seen.has(v)) {
        seen.add(v)
        prev.set(v, u)
        q.push(v)
      }
    }
  }

  if (!seen.has(goal)) return []
  const path = []
  for (let cur = goal; cur != null; cur = prev.get(cur)) {
    path.push(cur)
    if (cur === start) break
  }
  if (path[path.length - 1] !== start) return []
  return path.reverse()
}

export function dfsNodePath(model) {
  const start = model.start, goal = model.goal
  if (!start || !goal) return []

  const id2node = id => model.nodes.find(n => n.id === id)
  const st = [start]
  const seen = new Set([start])
  const prev = new Map()
  let found = false

  while (st.length) {
    const u = st.pop()
    if (u === goal) { found = true; break }
    const uNode = id2node(u)
    if (!uNode) continue

    // push neighbors in reverse for a slightly more natural LIFO order
    const nbrs = model.neighbours(uNode).map(({ node }) => node).filter(Boolean).reverse()
    for (const vNode of nbrs) {
      const v = vNode.id
      if (!seen.has(v)) {
        seen.add(v)
        prev.set(v, u)
        st.push(v)
      }
    }
  }

  if (!found) return []
  const path = []
  for (let cur = goal; cur != null; cur = prev.get(cur)) {
    path.push(cur)
    if (cur === start) break
  }
  if (path[path.length - 1] !== start) return []
  return path.reverse()
}
