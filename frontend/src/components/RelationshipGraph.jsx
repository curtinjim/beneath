import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

const ACTOR_TYPE_COLOUR = {
  individual:   'var(--rock)',
  organisation: 'var(--bedrock)',
  network:      '#9a70d0',
  entity:       '#4090a0',
}

const REL_TYPE_COLOUR = {
  ally:        'var(--bedrock)',
  adversary:   'var(--crimson)',
  associate:   'var(--rock)',
  subordinate: 'rgba(245,244,240,0.5)',
  superior:    'rgba(245,244,240,0.5)',
  contact:     'var(--mgrey)',
}

function nodeColour(actor, centralId) {
  if (actor.id === centralId) return 'var(--gold)'
  return ACTOR_TYPE_COLOUR[actor.actor_type] ?? 'var(--mgrey)'
}

function linkColour(rel) {
  return REL_TYPE_COLOUR[rel.relationship_type] ?? 'var(--rule)'
}

export default function RelationshipGraph({ relationships, centralActor }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!relationships?.length || !centralActor) return

    const el = svgRef.current
    const width  = el.clientWidth  || 700
    const height = el.clientHeight || 420

    d3.select(el).selectAll('*').remove()

    const svg = d3.select(el)
      .attr('width', width)
      .attr('height', height)

    const g = svg.append('g')

    svg.call(
      d3.zoom()
        .scaleExtent([0.3, 3])
        .on('zoom', (event) => g.attr('transform', event.transform))
    )

    // Build node + link sets
    const nodeMap = new Map()
    nodeMap.set(centralActor.id, { ...centralActor })

    relationships.forEach(rel => {
      const other = rel.source_actor_id === centralActor.id ? rel.target_actor : rel.source_actor
      if (other && !nodeMap.has(other.id)) {
        nodeMap.set(other.id, { ...other })
      }
    })

    const nodes = Array.from(nodeMap.values()).map(n => ({ ...n }))
    const links = relationships
      .filter(rel => {
        const src = rel.source_actor_id
        const tgt = rel.target_actor_id
        return nodeMap.has(src) && nodeMap.has(tgt)
      })
      .map(rel => ({
        source: rel.source_actor_id,
        target: rel.target_actor_id,
        relationship_type: rel.relationship_type,
        reliability_grade: rel.reliability_grade,
        _rel: rel,
      }))

    const central = nodes.find(n => n.id === centralActor.id)
    if (central) {
      central.fx = width / 2
      central.fy = height / 2
    }

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(130).strength(0.7))
      .force('charge', d3.forceManyBody().strength(-320))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(40))

    // Arrow markers
    svg.append('defs').selectAll('marker')
      .data(['arrow'])
      .join('marker')
        .attr('id', 'arrow')
        .attr('viewBox', '0 -4 8 8')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
      .append('path')
        .attr('d', 'M0,-4L8,0L0,4')
        .attr('fill', 'var(--rule)')

    const link = g.append('g').selectAll('line')
      .data(links)
      .join('line')
        .attr('stroke', d => linkColour(d))
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.6)
        .attr('marker-end', 'url(#arrow)')

    const linkLabel = g.append('g').selectAll('text')
      .data(links)
      .join('text')
        .attr('fill', 'var(--mgrey)')
        .attr('font-size', 9)
        .attr('text-anchor', 'middle')
        .attr('pointer-events', 'none')
        .attr('opacity', 0.7)
        .text(d => d.relationship_type?.replace('_', ' ') ?? '')

    const node = g.append('g').selectAll('g')
      .data(nodes)
      .join('g')
        .attr('cursor', d => d.id === centralActor.id ? 'default' : 'grab')
        .call(
          d3.drag()
            .on('start', (event, d) => {
              if (!event.active) sim.alphaTarget(0.3).restart()
              d.fx = d.x; d.fy = d.y
            })
            .on('drag', (event, d) => {
              d.fx = event.x; d.fy = event.y
            })
            .on('end', (event, d) => {
              if (!event.active) sim.alphaTarget(0)
              if (d.id !== centralActor.id) { d.fx = null; d.fy = null }
            })
        )

    node.append('circle')
      .attr('r', d => d.id === centralActor.id ? 14 : 9)
      .attr('fill', d => nodeColour(d, centralActor.id))
      .attr('stroke', d => d.id === centralActor.id ? 'var(--br-bone-white)' : 'var(--s0)')
      .attr('stroke-width', d => d.id === centralActor.id ? 2 : 1)

    node.append('text')
      .attr('dy', d => d.id === centralActor.id ? 26 : 21)
      .attr('text-anchor', 'middle')
      .attr('fill', d => d.id === centralActor.id ? 'var(--gold)' : 'var(--br-bone-white)')
      .attr('font-size', d => d.id === centralActor.id ? 11 : 10)
      .attr('font-weight', d => d.id === centralActor.id ? 700 : 400)
      .attr('pointer-events', 'none')
      .text(d => {
        const name = d.display_name ?? ''
        return name.length > 20 ? name.slice(0, 18) + '…' : name
      })

    sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)

      linkLabel
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2 - 4)

      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => sim.stop()
  }, [relationships, centralActor])

  // Legend
  const typeEntries = Object.entries(ACTOR_TYPE_COLOUR)

  return (
    <div>
      <svg
        ref={svgRef}
        style={{ width:'100%', height:'420px', background:'var(--s0)', borderRadius:'2px', border:'1px solid var(--rule)' }}
      />
      <div style={{ display:'flex', gap:'16px', marginTop:'10px', flexWrap:'wrap' }}>
        {typeEntries.map(([k, c]) => (
          <div key={k} style={{ display:'flex', alignItems:'center', gap:'4px' }}>
            <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:c }} />
            <span style={{ fontSize:'10px', color:'var(--mgrey)', opacity:0.6 }}>{k}</span>
          </div>
        ))}
        <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'var(--gold)' }} />
          <span style={{ fontSize:'10px', color:'var(--mgrey)', opacity:0.6 }}>selected actor</span>
        </div>
      </div>
      <p style={{ fontSize:'10px', color:'var(--mgrey)', opacity:0.5, marginTop:'6px' }}>
        Drag nodes to reposition · scroll to zoom
      </p>
    </div>
  )
}
