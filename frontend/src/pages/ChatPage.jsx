// BD-309 — ChatPage redesign
import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import SynthesisPanel from '../components/SynthesisPanel'

const VOICES = [
  { id: 'maisie',  label: 'Maisie',  desc: 'Lead analyst'             },
  { id: 'pippa',   label: 'Pippa',   desc: 'CI & BD'                  },
  { id: 'cate',    label: 'Cate',    desc: 'Legal & financial'         },
  { id: 'lance',   label: 'Lance',   desc: 'Tactical'                  },
  { id: 'jack',    label: 'Jack',    desc: 'SOF cultural'              },
  { id: 'jackson', label: 'Jackson', desc: 'Narrative & investigative' },
]

// ─── Chat thread (main area when a session is open) ──────────────────────────

function ChatThread({ sessionId, onVoiceChange }) {
  const qc       = useQueryClient()
  const [text,   setText]     = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(null)
  const [synthesisPendingUntil, setSynthesisPendingUntil] = useState(null)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  const { data, isLoading } = useQuery({
    queryKey: ['chat-session', sessionId],
    queryFn: () => api.get(`/chat/sessions/${sessionId}`).then(r => r.data.data),
    staleTime: 0,
    refetchInterval: synthesisPendingUntil && Date.now() < synthesisPendingUntil ? 2000 : false,
  })

  const session  = data
  const messages = session?.messages ?? []
  const voice    = VOICES.find(v => v.id === session?.voice) ?? VOICES[0]

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, sending])

  const switchVoice = useMutation({
    mutationFn: (voiceId) => api.patch(`/chat/sessions/${sessionId}`, { voice: voiceId }),
    onMutate: async (voiceId) => {
      // Optimistic update — swap voice immediately in cached session
      await qc.cancelQueries({ queryKey: ['chat-session', sessionId] })
      const prev = qc.getQueryData(['chat-session', sessionId])
      qc.setQueryData(['chat-session', sessionId], old => old ? { ...old, voice: voiceId } : old)
      return { prev }
    },
    onError: (_err, _voiceId, ctx) => {
      if (ctx?.prev) qc.setQueryData(['chat-session', sessionId], ctx.prev)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-session', sessionId] })
      qc.invalidateQueries({ queryKey: ['chat-sessions'] })
      onVoiceChange?.()
    },
  })

  async function handleSend() {
    const content = text.trim()
    if (!content || sending) return
    setSending(true)
    setSendError(null)
    setText('')
    try {
      const res = await api.post(`/chat/sessions/${sessionId}/messages`, { content })
      const { user_message, assistant_message } = res.data.data
      qc.setQueryData(['chat-session', sessionId], old => old ? {
        ...old,
        messages: [...(old.messages ?? []), user_message, assistant_message],
      } : old)
      qc.invalidateQueries({ queryKey: ['chat-sessions'] })
    } catch (err) {
      const message =
        err.response?.data?.message ??
        err.response?.data?.detail ??
        'Message failed. Please try again.'
      setSendError(message)
      setText(content)
    } finally {
      setSending(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleSynthesisDispatched() {
    setSynthesisPendingUntil(Date.now() + 30000)
  }

  if (isLoading) {
    return (
      <div className="state-loading" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Loading…</span>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

      {/* Header */}
      <div className="chat-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session?.title ?? 'New chat'}
          </span>

          {/* Voice pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {VOICES.map(v => (
              <button
                key={v.id}
                className={`voice-pill${session?.voice === v.id ? ' active' : ''}`}
                onClick={() => switchVoice.mutate(v.id)}
                title={v.desc}
              >
                {v.label}
              </button>
            ))}
            <div style={{ marginLeft: 'auto' }}>
              <SynthesisPanel
                sessionId={sessionId}
                projectId={session?.project_id ?? null}
                onDispatched={handleSynthesisDispatched}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && !sending && (
          <div style={{ textAlign: 'center', paddingTop: '48px' }}>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              You are speaking with <strong style={{ color: 'var(--color-navy)' }}>{voice.label}</strong>
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{voice.desc}</p>
          </div>
        )}

        {messages.map(msg => {
          const isUser  = msg.role === 'user'
          const msgVoice = VOICES.find(v => v.id === msg.voice)
          return (
            <div
              key={msg.id}
              style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', marginBottom: '16px' }}
            >
              {!isUser && msgVoice && (
                <span className="chat-bubble-voice-label">{msgVoice.label}</span>
              )}
              <div className={isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'}>
                {msg.content}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                {msg.created_at
                  ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : ''}
              </span>
            </div>
          )
        })}

        {sending && (
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div className="chat-bubble-assistant">
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                {voice.label} is thinking…
              </span>
            </div>
          </div>
        )}

        {synthesisPendingUntil && Date.now() < synthesisPendingUntil && (
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div className="chat-bubble-assistant" style={{ borderColor: 'var(--color-gold)' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-gold)', fontStyle: 'italic' }}>
                Synthesising…
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="chat-input-area">
        {sessionId && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <SynthesisPanel
              sessionId={sessionId}
              projectId={session?.project_id ?? null}
              onDispatched={handleSynthesisDispatched}
              renderTrigger={(onClick) => (
                <button className="btn-ghost" onClick={onClick}>
                  Synthesise
                </button>
              )}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            className="textarea"
            value={text}
            onChange={e => { setText(e.target.value); if (sendError) setSendError(null) }}
            onKeyDown={handleKey}
            placeholder={`Ask ${voice.label} anything…`}
            disabled={sending}
            rows={3}
            style={{ flex: 1, minHeight: '80px', resize: 'vertical' }}
          />
          <button
            className="btn"
            disabled={sending || !text.trim()}
            onClick={handleSend}
            style={{ flexShrink: 0, alignSelf: 'flex-end' }}
          >
            {sending ? '…' : 'Send'}
          </button>
        </div>

        {sendError && (
          <div className="banner-alert" style={{ marginTop: '8px' }}>
            Message failed — {sendError}
          </div>
        )}

        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '6px', opacity: 0.7 }}>
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function ChatPage() {
  const qc       = useQueryClient()
  const location = useLocation()
  const [sessionId, setSessionId] = useState(location.state?.sessionId ?? null)

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: () => api.get('/chat/sessions').then(r => r.data.data),
    staleTime: 30000,
  })

  const createSession = useMutation({
    mutationFn: () => api.post('/chat/sessions', { title: 'New chat', voice: 'maisie' }),
    onSuccess: (res) => {
      qc.invalidateQueries(['chat-sessions'])
      setSessionId(res.data.data.id)
    },
  })

  const deleteSession = useMutation({
    mutationFn: (id) => api.delete(`/chat/sessions/${id}`),
    onSuccess: (_, deletedId) => {
      qc.invalidateQueries(['chat-sessions'])
      if (sessionId === deletedId) setSessionId(null)
    },
  })

  // Auto-select first session on load
  useEffect(() => {
    if (!sessionId && sessions.length > 0) {
      setSessionId(sessions[0].id)
    }
  }, [sessions, sessionId])

  const voiceForSession = (s) => VOICES.find(v => v.id === s.voice) ?? VOICES[0]

  return (
    <div className="chat-shell">

      {/* Sessions column */}
      <div className="chat-sessions-col">
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
          <button
            className="btn-outline"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={createSession.isPending}
            onClick={() => createSession.mutate()}
          >
            + New Chat
          </button>
        </div>

        <div className="chat-sessions-list">
          {isLoading && (
            <p style={{ padding: '16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>Loading…</p>
          )}
          {!isLoading && sessions.length === 0 && (
            <p style={{ padding: '16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>No sessions yet.</p>
          )}
          {sessions.map(s => {
            const v      = voiceForSession(s)
            const active = s.id === sessionId
            return (
              <div
                key={s.id}
                className={`chat-session-item${active ? ' active' : ''}`}
                onClick={() => setSessionId(s.id)}
              >
                <span className="chat-session-item__title">{s.title}</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="chat-session-item__meta">
                    {v.label}
                    {s.updated_at && ` · ${new Date(s.updated_at).toLocaleDateString()}`}
                  </span>
                  <button
                    style={{ fontSize: '13px', color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}
                    onClick={e => { e.stopPropagation(); deleteSession.mutate(s.id) }}
                  >
                    ×
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main chat area */}
      <div className="chat-main">
        {sessionId ? (
          <ChatThread
            key={sessionId}
            sessionId={sessionId}
            onVoiceChange={() => qc.invalidateQueries(['chat-sessions'])}
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Select a session or start a new one.
            </p>
            <button className="btn-outline" onClick={() => createSession.mutate()}>
              New chat
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
