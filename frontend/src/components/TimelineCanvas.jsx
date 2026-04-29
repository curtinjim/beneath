import { useState, useMemo } from 'react'

const GRADE_COLOUR = {
  bedrock: 'var(--bedrock)',
  rock:    'var(--rock)',
  sand:    'var(--sand)',
  mud:     'var(--mud)',
  fog:     'var(--fog)',
}

const TYPE_COLOUR = {
  claim:              'var(--rock)',
  commitment:         'var(--bedrock)',
  admission:          '#9a70d0',
  denial:             '#d06060',
  action:             'var(--sand)',
  silence:            'var(--fog)',
  position:           '#5070c0',
  affiliation_change: '#b060b0',
  communication:      '#4090a0',
  signal:             'var(--br-divergent-text)',
  meeting:            '#408060',
  operator_note:      'var(--mgrey)',
}

function parseDate(str) {
  if (!str) return null
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

export default function TimelineCanvas({ events, actorName, colorMode = 'grade' }) {
  const [hoverId, setHoverId] = useState(null)

  const dated = useMemo(() =>
    events
      .map(e => ({ ...e, _date: parseDate(e.event_date) }))
      .filter(e => e._date)
      .sort((a, b) => a._date - b._date),
    [events]
  )

  const undated = useMemo(() => events.filter(e => !parseDate(e.event_date)), [events])

  if (dated.length === 0) {
    return (
      <p style={{ fontSize:'13px', color:'var(--mgrey)', padding:'16px 0' }}>
        No dated events to display on canvas.
        {undated.length > 0 && ` (${undated.length} event${undated.length > 1 ? 's' : ''} have no date)`}
      </p>
    )
  }

  const minTs = dated[0]._date.getTime()
  const maxTs = dated[dated.length - 1]._date.getTime()
  const span  = maxTs - minTs || 1

  function xPct(event) {
    return ((event._date.getTime() - minTs) / span) * 94 + 3
  }

  function dotColour(event) {
    return colorMode === 'type'
      ? (TYPE_COLOUR[event.event_type] ?? 'var(--mgrey)')
      : (GRADE_COLOUR[event.reliability_grade] ?? 'var(--mgrey)')
  }

  const hovered = hoverId ? dated.find(e => e.id === hoverId) : null

  return (
    <div>
      {/* Controls */}
      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px' }}>
        {actorName && (
          <span style={{ fontSize:'11px', color:'var(--gold)', fontWeight:600 }}>{actorName}</span>
        )}
        <span style={{ fontSize:'11px', color:'var(--mgrey)' }}>{dated.length} dated events</span>
        {undated.length > 0 && (
          <span style={{ fontSize:'11px', color:'var(--mgrey)', opacity:0.5 }}>{undated.length} undated</span>
        )}
      </div>

      {/* Canvas */}
      <div style={{ position:'relative', height:'80px', marginBottom:'8px' }}>
        {/* Axis line */}
        <div style={{
          position:'absolute', top:'36px', left:0, right:0,
          height:'1px', background:'var(--rule)',
        }} />

        {/* Year labels */}
        {(() => {
          const minYear = dated[0]._date.getFullYear()
          const maxYear = dated[dated.length - 1]._date.getFullYear()
          const years = []
          for (let y = minYear; y <= maxYear; y++) {
            const ts = new Date(y, 0, 1).getTime()
            if (ts < minTs || ts > maxTs) continue
            const pct = ((ts - minTs) / span) * 94 + 3
            years.push(
              <span key={y} style={{
                position:'absolute', left:`${pct}%`, top:'44px',
                transform:'translateX(-50%)',
                fontSize:'9px', color:'var(--mgrey)', opacity:0.5,
                pointerEvents:'none', userSelect:'none',
              }}>
                {y}
              </span>
            )
          }
          return years
        })()}

        {/* Event dots */}
        {dated.map(event => {
          const pct = xPct(event)
          const isHovered = hoverId === event.id
          return (
            <div
              key={event.id}
              onMouseEnter={() => setHoverId(event.id)}
              onMouseLeave={() => setHoverId(null)}
              style={{
                position: 'absolute',
                left:   `${pct}%`,
                top:    '28px',
                width:  isHovered ? '14px' : '8px',
                height: isHovered ? '14px' : '8px',
                marginLeft: isHovered ? '-7px' : '-4px',
                marginTop:  isHovered ? '-7px' : '-4px',
                borderRadius: '50%',
                background: dotColour(event),
                border: isHovered ? '2px solid var(--br-bone-white)' : '1px solid var(--s0)',
                cursor: 'pointer',
                zIndex: isHovered ? 10 : 1,
                transition: 'all 0.1s',
              }}
            />
          )
        })}
      </div>

      {/* Tooltip */}
      <div style={{
        minHeight: '60px',
        padding: '10px 14px',
        background: 'var(--s1)',
        border: `1px solid ${hovered ? (GRADE_COLOUR[hovered.reliability_grade] ?? 'var(--rule)') : 'var(--rule)'}`,
        borderRadius: '2px',
        transition: 'border-color 0.15s',
      }}>
        {hovered ? (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
              <span style={{ fontSize:'10px', fontWeight:700, color: TYPE_COLOUR[hovered.event_type] ?? 'var(--mgrey)', letterSpacing:'0.10em', textTransform:'uppercase' }}>
                {hovered.event_type.replace('_',' ')}
              </span>
              <span style={{ fontSize:'10px', color: GRADE_COLOUR[hovered.reliability_grade] ?? 'var(--mgrey)' }}>
                {hovered.reliability_grade}
              </span>
              <span style={{ fontSize:'10px', color:'var(--mgrey)', marginLeft:'auto' }}>
                {hovered.event_date}
              </span>
            </div>
            <p style={{ fontSize:'12px', color:'var(--br-bone-white)', lineHeight:'1.5' }}>{hovered.summary}</p>
          </div>
        ) : (
          <p style={{ fontSize:'11px', color:'var(--mgrey)', opacity:0.5, lineHeight:'60px', textAlign:'center' }}>
            Hover an event to see details
          </p>
        )}
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:'12px', marginTop:'10px', flexWrap:'wrap' }}>
        {Object.entries(colorMode === 'type' ? TYPE_COLOUR : GRADE_COLOUR).map(([k, c]) => (
          <div key={k} style={{ display:'flex', alignItems:'center', gap:'4px' }}>
            <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:c }} />
            <span style={{ fontSize:'10px', color:'var(--mgrey)', opacity:0.6 }}>{k.replace('_',' ')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
