import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

const CATEGORY_COLOUR = {
  location:      '#4090a0',
  access_zone:   '#9a70d0',
  affiliation:   'var(--rock)',
  background:    'var(--mgrey)',
  operational:   'var(--sand)',
  personnel:     'var(--bedrock)',
}

const CATEGORY_SHAPE = {
  location:      'rect',
  access_zone:   'diamond',
  affiliation:   'circle',
  background:    'circle',
  operational:   'circle',
  personnel:     'circle',
}

export default function TerrainGraph({ terrain, centralActor }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!terrain || !centralActor) return

    const el    = svgRef.current
    const width  = el.clientWidth || 700
    const height = el.clientHeight || 380

    d3.select(el).selectAll('*').remove()

    const svg = d3.select(el)
      .attr('width', width)
      .attr('height', height)

    const g = svg.append('g')

    svg.call(
      d3.zoom().scaleExtent([0.3, 3]).on('zoom', e => g.attr('transform', e.transform))
    )

    // Build node list: central actor + one node per terrain entry
    const nodes = [
      { id: '__central__', label: centralActor.display_name, isCentral: true },
      ...terrain.map(t => ({
        id:       t.id,
        label:    t.related_actor ? t.related_actor.display_name : t.label,
        category: t.category,
        value:    t.value,
        grade:    t.reliability_grade,
        isCentral: false,
      })),
    ]

    const links = terrain.map(t => ({ source: '__central__', target: t.id }))

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(110).strength(0.8))
      .force('charge', d3.forceManyBody().strength(-260))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(36))

    const central = nodes.find(n => n.isCentral)
    if (central) { central.fx = width / 2; central.fy = height / 2 }

    const link = g.append('g').selectAll('line')
      .data(links).join('line')
        .attr('stroke', 'var(--rule)')
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.5)

    const node = g.append('g').selectAll('g')
      .data(nodes).join('g')
        .attr('cursor', d => d.isCentral ? 'default' : 'grab')
        .call(d3.drag()
          .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
          .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y })
          .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); if (!d.isCentral) { d.fx = null; d.fy = null } })
        )

    // Central actor as large gold circle
    node.filter(d => d.isCentral)
      .append('circle')
        .attr('r', 16)
        .attr('fill', 'var(--gold)')
        .attr('stroke', 'var(--br-bone-white)')
        .attr('stroke-width', 2)

    // Terrain entry nodes
    const entryNodes = node.filter(d => !d.isCentral)
    entryNodes.append('circle')
      .attr('r', 9)
      .attr('fill', d => CATEGORY_COLOUR[d.category] ?? 'var(--mgrey)')
      .attr('stroke', 'var(--s0)')
      .attr('stroke-width', 1)

    node.append('text')
      .attr('dy', d => d.isCentral ? 30 : 22)
      .attr('text-anchor', 'middle')
      .attr('fill', d => d.isCentral ? 'var(--gold)' : 'var(--br-bone-white)')
      .attr('font-size', d => d.isCentral ? 11 : 10)
      .attr('font-weight', d => d.isCentral ? 700 : 400)
      .attr('pointer-events', 'none')
      .text(d => {
        const l = d.label ?? ''
        return l.length > 18 ? l.slice(0, 16) + '…' : l
      })

    sim.on('tick', () => {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => sim.stop()
  }, [terrain, centralActor])

  return (
    <div>
      <svg
        ref={svgRef}
        style={{ width:'100%', height:'380px', background:'var(--s0)', border:'1px solid var(--rule)', borderRadius:'2px' }}
      />
      <div style={{ display:'flex', gap:'14px', marginTop:'8px', flexWrap:'wrap' }}>
        {Object.entries(CATEGORY_COLOUR).map(([k, c]) => (
          <div key={k} style={{ display:'flex', alignItems:'center', gap:'4px' }}>
            <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:c }} />
            <span style={{ fontSize:'10px', color:'var(--mgrey)', opacity:0.6 }}>{k.replace('_',' ')}</span>
          </div>
        ))}
      </div>
      <p style={{ fontSize:'10px', color:'var(--mgrey)', opacity:0.4, marginTop:'4px' }}>Drag · scroll to zoom</p>
    </div>
  )
}
