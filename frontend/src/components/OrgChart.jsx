import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

const CATEGORY_COLOUR = {
  personnel:     'var(--bedrock)',
  affiliation:   'var(--rock)',
  operational:   'var(--sand)',
  location:      '#4090a0',
  access_zone:   '#9a70d0',
  background:    'var(--mgrey)',
}

export default function OrgChart({ terrain, centralActor }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!terrain || !centralActor) return

    const el     = svgRef.current
    const width  = el.clientWidth || 700
    const height = el.clientHeight || 380

    d3.select(el).selectAll('*').remove()

    // Build hierarchy: root = central actor, children grouped by category
    const byCategory = {}
    terrain.forEach(t => {
      const cat = t.category
      if (!byCategory[cat]) byCategory[cat] = []
      byCategory[cat].push({
        name:     t.related_actor ? t.related_actor.display_name : t.label,
        value:    t.value,
        category: cat,
        grade:    t.reliability_grade,
      })
    })

    const rootData = {
      name:     centralActor.display_name,
      isCentral: true,
      children: Object.entries(byCategory).map(([cat, items]) => ({
        name:       cat.replace('_', ' '),
        isCategory: true,
        category:   cat,
        children:   items.map(item => ({ ...item, isLeaf: true })),
      })),
    }

    const root = d3.hierarchy(rootData)

    const treeLayout = d3.tree()
      .size([width - 80, height - 80])
      .separation((a, b) => (a.parent === b.parent ? 1.4 : 2))

    treeLayout(root)

    const svg = d3.select(el)
      .attr('width', width)
      .attr('height', height)

    const g = svg.append('g').attr('transform', 'translate(40,40)')

    svg.call(
      d3.zoom().scaleExtent([0.3, 2]).on('zoom', e => g.attr('transform', e.transform))
    )

    // Links
    g.append('g').selectAll('path')
      .data(root.links()).join('path')
        .attr('d', d3.linkVertical().x(d => d.x).y(d => d.y))
        .attr('fill', 'none')
        .attr('stroke', 'var(--rule)')
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.6)

    // Nodes
    const node = g.append('g').selectAll('g')
      .data(root.descendants()).join('g')
        .attr('transform', d => `translate(${d.x},${d.y})`)

    node.append('circle')
      .attr('r', d => d.data.isCentral ? 14 : d.data.isCategory ? 8 : 6)
      .attr('fill', d => {
        if (d.data.isCentral) return 'var(--gold)'
        if (d.data.isCategory) return CATEGORY_COLOUR[d.data.category] ?? 'var(--mgrey)'
        return CATEGORY_COLOUR[d.data.category] ?? 'var(--mgrey)'
      })
      .attr('stroke', d => d.data.isCentral ? 'var(--br-bone-white)' : 'var(--s0)')
      .attr('stroke-width', d => d.data.isCentral ? 2 : 1)
      .attr('opacity', d => d.data.isLeaf ? 0.7 : 1)

    node.append('text')
      .attr('dy', d => d.data.isCentral ? -22 : d.depth === 1 ? -16 : 18)
      .attr('text-anchor', 'middle')
      .attr('fill', d => d.data.isCentral ? 'var(--gold)' : 'var(--br-bone-white)')
      .attr('font-size', d => d.data.isCentral ? 11 : d.data.isCategory ? 10 : 9)
      .attr('font-weight', d => d.data.isCentral ? 700 : d.data.isCategory ? 600 : 400)
      .attr('opacity', d => d.data.isLeaf ? 0.8 : 1)
      .attr('pointer-events', 'none')
      .text(d => {
        const n = d.data.name ?? ''
        return n.length > 16 ? n.slice(0, 14) + '…' : n
      })

    return () => {}
  }, [terrain, centralActor])

  return (
    <div>
      <svg
        ref={svgRef}
        style={{ width:'100%', height:'380px', background:'var(--s0)', border:'1px solid var(--rule)', borderRadius:'2px', overflow:'hidden' }}
      />
      <p style={{ fontSize:'10px', color:'var(--mgrey)', opacity:0.4, marginTop:'4px' }}>
        Categories as branches · scroll to zoom
      </p>
    </div>
  )
}
