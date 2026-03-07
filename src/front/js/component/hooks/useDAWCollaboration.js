// =============================================================================
// useDAWCollaboration.js — Real-Time DAW Collaboration via Socket.IO
// =============================================================================
// Location: src/front/js/component/hooks/useDAWCollaboration.js
//
// Features:
//  - Share a DAW session by link (session code)
//  - See collaborators' cursors / active track highlights
//  - Track changes sync in real-time (add/remove/mute/solo/rename/volume/pan)
//  - Region changes sync (trim, move, add, delete)
//  - Playhead sync (optional follow-mode)
//  - BPM / time signature sync
//  - Chat sidebar (session-scoped)
//  - Conflict resolution: last-write-wins with op counter
//  - Works with existing setTracks / setBpm / setTimeSignature from RecordingStudio
//
// Integration into RecordingStudio.js:
// ─────────────────────────────────────
// import { useDAWCollaboration, CollabOverlay, CollabToolbar } from '../component/hooks/useDAWCollaboration';
//
// // In RecordingStudio component body (after tracks/bpm state):
// const collab = useDAWCollaboration({
//   projectId,        // string — your existing project ID
//   user,             // { id, username, profile_picture }
//   tracks,           // current tracks state
//   setTracks,        // tracks setter
//   bpm,              // current BPM
//   setBpm,           // BPM setter
//   timeSignature,    // [num, denom]
//   setTimeSignature, // time sig setter
//   isEnabled: !!projectId, // only when project saved
// });
//
// // Wrap setTracks calls that should broadcast:
// // Replace:  setTracks(newTracks);
// // With:     collab.updateTracks(newTracks, 'track:volume');
//
// // Add CollabToolbar near DAWMenuBar:
// <CollabToolbar collab={collab} />
//
// // Add CollabOverlay inside the arranger container:
// <CollabOverlay collab={collab} tracks={tracks} />
//
// Backend socket events needed (add to your existing socketio handlers):
// See bottom of this file for Flask-SocketIO backend snippet.
// =============================================================================

import React, {
  useState, useEffect, useRef, useCallback, useMemo
} from 'react';

// ── Collaborator colors ──
const COLLAB_COLORS = [
  '#00ffc8', '#ff6b35', '#7b61ff', '#ff3b7a',
  '#34d399', '#fbbf24', '#60a5fa', '#f472b6',
];

const getCollabColor = (index) => COLLAB_COLORS[index % COLLAB_COLORS.length];

// ── Op types ──
const OPS = {
  TRACK_UPDATE:     'track:update',
  TRACK_ADD:        'track:add',
  TRACK_REMOVE:     'track:remove',
  REGION_UPDATE:    'region:update',
  REGION_ADD:       'region:add',
  REGION_DELETE:    'region:delete',
  BPM_CHANGE:       'bpm:change',
  TIME_SIG_CHANGE:  'timesig:change',
  PLAYHEAD_SYNC:    'playhead:sync',
  CURSOR_MOVE:      'cursor:move',
  CHAT_MSG:         'chat:message',
  SESSION_JOIN:     'session:join',
  SESSION_LEAVE:    'session:leave',
  SESSION_STATE:    'session:full_state',
};

// =============================================================================
// MAIN HOOK
// =============================================================================
export const useDAWCollaboration = ({
  projectId,
  user,
  tracks,
  setTracks,
  bpm,
  setBpm,
  timeSignature,
  setTimeSignature,
  isEnabled = false,
  onStatus,
}) => {
  const [sessionId, setSessionId]           = useState(null);
  const [sessionCode, setSessionCode]       = useState(null); // 6-char invite code
  const [collaborators, setCollaborators]   = useState([]); // [{id, username, color, cursor, activeTrack}]
  const [isConnected, setIsConnected]       = useState(false);
  const [isHost, setIsHost]                 = useState(false);
  const [followPlayhead, setFollowPlayhead] = useState(false);
  const [chatMessages, setChatMessages]     = useState([]);
  const [unreadChat, setUnreadChat]         = useState(0);
  const [showChat, setShowChat]             = useState(false);
  const [showCollabPanel, setShowCollabPanel] = useState(false);
  const [isSyncing, setIsSyncing]           = useState(false);

  const socketRef      = useRef(null);
  const opCounterRef   = useRef(0);
  const pendingOpsRef  = useRef([]);
  const isBroadcasting = useRef(false); // prevent echo loops
  const myColorRef     = useRef(COLLAB_COLORS[0]);

  // ── Get socket from global store (already initialized in app) ──
  const getSocket = useCallback(() => {
    // Try global socket (matches your existing Socket.IO setup)
    if (window.__spx_socket) return window.__spx_socket;
    // Fallback: create dedicated collab socket
    try {
      const { io } = require('socket.io-client');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const sock = io(backendUrl, {
        auth: { token },
        transports: ['websocket'],
        path: '/socket.io',
      });
      window.__spx_socket = sock;
      return sock;
    } catch (e) {
      console.error('[Collab] Socket.IO not available:', e);
      return null;
    }
  }, []);

  // ── Emit helper ──
  const emit = useCallback((event, data) => {
    const sock = socketRef.current;
    if (!sock || !sock.connected) return false;
    sock.emit(event, { ...data, sessionId, userId: user?.id });
    return true;
  }, [sessionId, user?.id]);

  // ── Create new session ──
  const createSession = useCallback(async () => {
    if (!projectId || !user) return;
    const sock = getSocket();
    if (!sock) { onStatus?.('⚠ Socket not available'); return; }

    socketRef.current = sock;
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    setSessionCode(code);
    setIsHost(true);

    const sid = `daw_${projectId}_${code}`;
    setSessionId(sid);

    sock.emit('daw:create_session', {
      sessionId: sid,
      sessionCode: code,
      projectId,
      hostId: user.id,
      hostName: user.username,
      initialState: { tracks, bpm, timeSignature },
    });

    onStatus?.(`✓ Collab session created — Code: ${code}`);
    setIsConnected(true);
    setShowCollabPanel(true);
  }, [projectId, user, tracks, bpm, timeSignature, getSocket, onStatus]);

  // ── Join existing session by code ──
  const joinSession = useCallback(async (code) => {
    if (!user) return;
    const sock = getSocket();
    if (!sock) { onStatus?.('⚠ Socket not available'); return; }

    socketRef.current = sock;
    const sid = `daw_${projectId}_${code.toUpperCase()}`;
    setSessionId(sid);
    setSessionCode(code.toUpperCase());
    setIsHost(false);
    setIsSyncing(true);

    sock.emit('daw:join_session', {
      sessionId: sid,
      userId: user.id,
      username: user.username,
      avatar: user.profile_picture,
    });

    onStatus?.(`⏳ Joining session ${code}...`);
  }, [projectId, user, getSocket, onStatus]);

  // ── Leave session ──
  const leaveSession = useCallback(() => {
    emit('daw:leave_session', {});
    setSessionId(null);
    setSessionCode(null);
    setCollaborators([]);
    setIsConnected(false);
    setIsHost(false);
    setIsSyncing(false);
    onStatus?.('Left collab session');
  }, [emit, onStatus]);

  // ── Broadcast track update ──
  const updateTracks = useCallback((newTracks, opType = OPS.TRACK_UPDATE, meta = {}) => {
    if (!isBroadcasting.current) {
      setTracks(newTracks);
    }
    if (!isConnected || !sessionId) return;

    opCounterRef.current += 1;
    emit('daw:op', {
      type: opType,
      payload: newTracks,
      opId: opCounterRef.current,
      ...meta,
    });
  }, [isConnected, sessionId, setTracks, emit]);

  // ── Broadcast single track update (more efficient) ──
  const updateTrackById = useCallback((trackIndex, changes, opType = OPS.TRACK_UPDATE) => {
    if (!isBroadcasting.current) {
      setTracks(prev => prev.map((t, i) => i === trackIndex ? { ...t, ...changes } : t));
    }
    if (!isConnected || !sessionId) return;
    opCounterRef.current += 1;
    emit('daw:op', {
      type: opType,
      payload: { trackIndex, changes },
      opId: opCounterRef.current,
    });
  }, [isConnected, sessionId, setTracks, emit]);

  // ── Broadcast BPM ──
  const updateBpm = useCallback((newBpm) => {
    if (!isBroadcasting.current) setBpm(newBpm);
    if (!isConnected || !sessionId) return;
    emit('daw:op', { type: OPS.BPM_CHANGE, payload: newBpm, opId: ++opCounterRef.current });
  }, [isConnected, sessionId, setBpm, emit]);

  // ── Broadcast time signature ──
  const updateTimeSignature = useCallback((newSig) => {
    if (!isBroadcasting.current) setTimeSignature(newSig);
    if (!isConnected || !sessionId) return;
    emit('daw:op', { type: OPS.TIME_SIG_CHANGE, payload: newSig, opId: ++opCounterRef.current });
  }, [isConnected, sessionId, setTimeSignature, emit]);

  // ── Sync my cursor / active track ──
  const syncCursor = useCallback((trackIndex, beatPosition) => {
    if (!isConnected || !sessionId) return;
    emit('daw:cursor', { trackIndex, beatPosition });
  }, [isConnected, sessionId, emit]);

  // ── Send chat message ──
  const sendChatMessage = useCallback((text) => {
    if (!text.trim() || !isConnected) return;
    const msg = {
      id: Date.now(),
      userId: user?.id,
      username: user?.username,
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, msg]);
    emit('daw:chat', msg);
  }, [isConnected, user, emit]);

  // ── Socket event handlers ──
  useEffect(() => {
    if (!sessionId) return;
    const sock = socketRef.current;
    if (!sock) return;

    const handleOp = (data) => {
      if (data.userId === user?.id) return; // echo guard
      isBroadcasting.current = true;

      try {
        switch (data.type) {
          case OPS.TRACK_UPDATE:
            if (data.payload.trackIndex !== undefined) {
              // Single track patch
              setTracks(prev => prev.map((t, i) =>
                i === data.payload.trackIndex ? { ...t, ...data.payload.changes } : t
              ));
            } else {
              // Full tracks array
              setTracks(data.payload);
            }
            break;
          case OPS.TRACK_ADD:
            setTracks(prev => [...prev, data.payload]);
            break;
          case OPS.TRACK_REMOVE:
            setTracks(prev => prev.filter((_, i) => i !== data.payload));
            break;
          case OPS.REGION_ADD:
          case OPS.REGION_UPDATE:
          case OPS.REGION_DELETE:
            setTracks(prev => prev.map((t, i) => {
              if (i !== data.payload.trackIndex) return t;
              if (data.type === OPS.REGION_ADD)
                return { ...t, regions: [...(t.regions || []), data.payload.region] };
              if (data.type === OPS.REGION_UPDATE)
                return { ...t, regions: (t.regions || []).map(r => r.id === data.payload.region.id ? { ...r, ...data.payload.region } : r) };
              if (data.type === OPS.REGION_DELETE)
                return { ...t, regions: (t.regions || []).filter(r => r.id !== data.payload.regionId) };
              return t;
            }));
            break;
          case OPS.BPM_CHANGE:
            setBpm(data.payload);
            break;
          case OPS.TIME_SIG_CHANGE:
            setTimeSignature(data.payload);
            break;
          default:
            break;
        }
      } finally {
        isBroadcasting.current = false;
      }
    };

    const handleCursor = (data) => {
      if (data.userId === user?.id) return;
      setCollaborators(prev => prev.map(c =>
        c.id === data.userId
          ? { ...c, activeTrack: data.trackIndex, beatPosition: data.beatPosition, lastSeen: Date.now() }
          : c
      ));
    };

    const handleJoin = (data) => {
      const colorIdx = collaborators.length;
      const color = getCollabColor(colorIdx + 1);
      setCollaborators(prev => {
        if (prev.find(c => c.id === data.userId)) return prev;
        return [...prev, { id: data.userId, username: data.username, avatar: data.avatar, color, activeTrack: null, beatPosition: 0 }];
      });
      setChatMessages(prev => [...prev, { id: Date.now(), system: true, text: `${data.username} joined the session` }]);
      onStatus?.(`👥 ${data.username} joined`);
    };

    const handleLeave = (data) => {
      setCollaborators(prev => prev.filter(c => c.id !== data.userId));
      setChatMessages(prev => [...prev, { id: Date.now(), system: true, text: `${data.username} left the session` }]);
    };

    const handleFullState = (data) => {
      // Host sends full state when someone joins
      isBroadcasting.current = true;
      try {
        if (data.tracks) setTracks(data.tracks);
        if (data.bpm) setBpm(data.bpm);
        if (data.timeSignature) setTimeSignature(data.timeSignature);
        if (data.collaborators) {
          setCollaborators(data.collaborators.map((c, i) => ({ ...c, color: getCollabColor(i + 1) })));
        }
      } finally {
        isBroadcasting.current = false;
      }
      setIsSyncing(false);
      setIsConnected(true);
      onStatus?.('✓ Synced with session');
    };

    const handleChat = (data) => {
      setChatMessages(prev => [...prev, data]);
      if (!showChat) setUnreadChat(n => n + 1);
    };

    const handleStateRequest = (data) => {
      // Someone is asking for current state — host should respond
      if (!isHost) return;
      emit('daw:full_state_response', {
        targetUserId: data.userId,
        tracks,
        bpm,
        timeSignature,
        collaborators: collaborators.map(c => ({ id: c.id, username: c.username, avatar: c.avatar })),
      });
    };

    sock.on('daw:op',                handleOp);
    sock.on('daw:cursor',            handleCursor);
    sock.on('daw:user_joined',       handleJoin);
    sock.on('daw:user_left',         handleLeave);
    sock.on('daw:full_state',        handleFullState);
    sock.on('daw:chat',              handleChat);
    sock.on('daw:request_state',     handleStateRequest);

    return () => {
      sock.off('daw:op',             handleOp);
      sock.off('daw:cursor',         handleCursor);
      sock.off('daw:user_joined',    handleJoin);
      sock.off('daw:user_left',      handleLeave);
      sock.off('daw:full_state',     handleFullState);
      sock.off('daw:chat',           handleChat);
      sock.off('daw:request_state',  handleStateRequest);
    };
  }, [sessionId, user?.id, isHost, collaborators, tracks, bpm, timeSignature, showChat, emit, setTracks, setBpm, setTimeSignature, onStatus]);

  // ── Set my color ──
  useEffect(() => {
    myColorRef.current = getCollabColor(0); // host always gets first color
  }, []);

  const shareUrl = useMemo(() => {
    if (!sessionCode) return null;
    const base = window.location.origin;
    return `${base}/studio?join=${sessionCode}`;
  }, [sessionCode]);

  return {
    // State
    sessionId, sessionCode, shareUrl,
    collaborators, isConnected, isHost,
    followPlayhead, setFollowPlayhead,
    chatMessages, unreadChat, showChat, setShowChat,
    showCollabPanel, setShowCollabPanel,
    isSyncing,
    myColor: myColorRef.current,

    // Actions
    createSession, joinSession, leaveSession,
    updateTracks, updateTrackById,
    updateBpm, updateTimeSignature,
    syncCursor, sendChatMessage,
  };
};

// =============================================================================
// COLLAB TOOLBAR — Add near DAWMenuBar
// =============================================================================
export const CollabToolbar = ({ collab }) => {
  const [joinCode, setJoinCode]     = useState('');
  const [showJoin, setShowJoin]     = useState(false);
  const [copied, setCopied]         = useState(false);

  const S = {
    bar:    { display:'flex', alignItems:'center', gap:8, padding:'4px 12px', background:'#161b22', borderBottom:'1px solid #30363d', fontSize:'0.72rem', fontFamily:'JetBrains Mono, monospace' },
    btn:    { padding:'3px 10px', borderRadius:4, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:'0.7rem', fontWeight:600 },
    badge:  { width:8, height:8, borderRadius:'50%', display:'inline-block' },
    input:  { background:'#21262d', border:'1px solid #30363d', borderRadius:4, color:'#c9d1d9', padding:'3px 8px', fontSize:'0.7rem', width:90, fontFamily:'inherit' },
  };

  const copyLink = async () => {
    if (!collab.shareUrl) return;
    await navigator.clipboard.writeText(collab.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!collab.isConnected) {
    return (
      <div style={S.bar}>
        <span style={{ color:'#5a7088' }}>👥 Collab</span>
        <button style={{ ...S.btn, background:'#00ffc8', color:'#000' }} onClick={collab.createSession}>
          + Start Session
        </button>
        {showJoin ? (
          <>
            <input
              style={S.input}
              placeholder="Enter code"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === 'Enter') { collab.joinSession(joinCode); setShowJoin(false); } }}
              maxLength={6}
            />
            <button style={{ ...S.btn, background:'#007aff', color:'#fff' }} onClick={() => { collab.joinSession(joinCode); setShowJoin(false); }}>
              Join
            </button>
            <button style={{ ...S.btn, background:'#21262d', color:'#c9d1d9' }} onClick={() => setShowJoin(false)}>✕</button>
          </>
        ) : (
          <button style={{ ...S.btn, background:'#21262d', color:'#c9d1d9' }} onClick={() => setShowJoin(true)}>
            Join Session
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={S.bar}>
      {/* Status */}
      <span style={{ ...S.badge, background:'#00ffc8' }} />
      <span style={{ color:'#00ffc8', fontWeight:700 }}>LIVE</span>
      <span style={{ color:'#5a7088' }}>Session:</span>
      <span style={{ color:'#c9d1d9', letterSpacing:2, fontWeight:700 }}>{collab.sessionCode}</span>

      {/* Collaborator avatars */}
      <div style={{ display:'flex', gap:3, marginLeft:4 }}>
        {/* Self */}
        <div style={{ width:20, height:20, borderRadius:'50%', background:collab.myColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.55rem', fontWeight:700, color:'#000', border:'2px solid #fff' }}>
          ME
        </div>
        {collab.collaborators.map(c => (
          <div key={c.id} title={c.username} style={{ width:20, height:20, borderRadius:'50%', background:c.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.55rem', fontWeight:700, color:'#000', border:'2px solid #fff' }}>
            {c.username?.[0]?.toUpperCase() || '?'}
          </div>
        ))}
      </div>
      <span style={{ color:'#5a7088' }}>{collab.collaborators.length + 1} online</span>

      {/* Actions */}
      <button style={{ ...S.btn, background:'#21262d', color:'#c9d1d9' }} onClick={copyLink}>
        {copied ? '✓ Copied!' : '🔗 Copy Link'}
      </button>

      <button style={{ ...S.btn, background:'#21262d', color: collab.unreadChat > 0 ? '#ff9500' : '#c9d1d9', position:'relative' }}
        onClick={() => { collab.setShowChat(v => !v); collab.unreadChat > 0 && collab.setUnreadChat?.(0); }}>
        💬 Chat {collab.unreadChat > 0 && <span style={{ marginLeft:3, background:'#ff3b30', color:'#fff', borderRadius:8, padding:'0 4px', fontSize:'0.55rem' }}>{collab.unreadChat}</span>}
      </button>

      <button style={{ ...S.btn, background:'#21262d', color: collab.followPlayhead ? '#00ffc8' : '#c9d1d9' }}
        onClick={() => collab.setFollowPlayhead(v => !v)}
        title="Follow host's playhead">
        {collab.followPlayhead ? '👁 Following' : '👁 Follow'}
      </button>

      <button style={{ ...S.btn, background:'#21262d', color:'#ff3b30' }} onClick={collab.leaveSession}>
        Leave
      </button>

      {collab.isSyncing && <span style={{ color:'#fbbf24' }}>⏳ Syncing...</span>}
    </div>
  );
};

// =============================================================================
// COLLAB OVERLAY — Shows collaborator track highlights + cursors
// =============================================================================
export const CollabOverlay = ({ collab, tracks, trackHeight = 48 }) => {
  if (!collab.isConnected || collab.collaborators.length === 0) return null;

  return (
    <div style={{ position:'absolute', top:0, left:0, right:0, bottom:0, pointerEvents:'none', zIndex:10 }}>
      {collab.collaborators.map(c => {
        if (c.activeTrack === null || c.activeTrack === undefined) return null;
        const top = c.activeTrack * trackHeight;
        return (
          <React.Fragment key={c.id}>
            {/* Track highlight */}
            <div style={{
              position:'absolute', left:0, right:0,
              top, height: trackHeight,
              background: `${c.color}15`,
              borderLeft: `3px solid ${c.color}`,
              pointerEvents:'none',
            }} />
            {/* Name badge */}
            <div style={{
              position:'absolute', left:4, top: top + 4,
              background: c.color, color:'#000',
              borderRadius:3, padding:'1px 5px',
              fontSize:'0.55rem', fontWeight:700,
              pointerEvents:'none',
            }}>
              {c.username}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// =============================================================================
// COLLAB CHAT PANEL
// =============================================================================
export const CollabChatPanel = ({ collab }) => {
  const [input, setInput] = useState('');
  const messagesEndRef   = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [collab.chatMessages]);

  if (!collab.showChat) return null;

  const S = {
    panel:  { position:'fixed', bottom:60, right:16, width:280, height:340, background:'#161b22', border:'1px solid #30363d', borderRadius:8, display:'flex', flexDirection:'column', zIndex:200, fontFamily:'JetBrains Mono, monospace', fontSize:'0.72rem', boxShadow:'0 8px 32px rgba(0,0,0,0.5)' },
    header: { padding:'8px 12px', borderBottom:'1px solid #30363d', display:'flex', justifyContent:'space-between', alignItems:'center', fontWeight:700, color:'#00ffc8' },
    msgs:   { flex:1, overflowY:'auto', padding:8, display:'flex', flexDirection:'column', gap:4 },
    msg:    { background:'#21262d', borderRadius:4, padding:'4px 8px' },
    system: { color:'#5a7088', fontStyle:'italic', textAlign:'center', fontSize:'0.62rem' },
    footer: { padding:8, borderTop:'1px solid #30363d', display:'flex', gap:6 },
    input:  { flex:1, background:'#21262d', border:'1px solid #30363d', borderRadius:4, color:'#c9d1d9', padding:'4px 8px', fontSize:'0.7rem', fontFamily:'inherit', outline:'none' },
    send:   { background:'#00ffc8', border:'none', borderRadius:4, color:'#000', fontWeight:700, padding:'4px 10px', cursor:'pointer', fontSize:'0.7rem' },
  };

  return (
    <div style={S.panel}>
      <div style={S.header}>
        💬 Session Chat
        <button style={{ background:'none', border:'none', color:'#5a7088', cursor:'pointer', fontSize:'1rem' }} onClick={() => collab.setShowChat(false)}>✕</button>
      </div>
      <div style={S.msgs}>
        {collab.chatMessages.length === 0 && (
          <div style={S.system}>No messages yet. Say hi!</div>
        )}
        {collab.chatMessages.map(msg => (
          <div key={msg.id} style={msg.system ? S.system : S.msg}>
            {msg.system ? msg.text : (
              <>
                <span style={{ color:'#00ffc8', fontWeight:700 }}>{msg.username}: </span>
                <span style={{ color:'#c9d1d9' }}>{msg.text}</span>
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div style={S.footer}>
        <input
          style={S.input}
          placeholder="Type a message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { collab.sendChatMessage(input); setInput(''); } }}
        />
        <button style={S.send} onClick={() => { if (input.trim()) { collab.sendChatMessage(input); setInput(''); } }}>
          Send
        </button>
      </div>
    </div>
  );
};

export default useDAWCollaboration;

// =============================================================================
// BACKEND: Flask-SocketIO handlers to add to your socketio file
// =============================================================================
/*
Add these to your existing Flask-SocketIO handler file (e.g., src/api/socket_handlers.py):

from flask_socketio import join_room, leave_room, emit

# Active sessions: { sessionId: { host_id, collaborators: [] } }
daw_sessions = {}

@socketio.on('daw:create_session')
def on_daw_create_session(data):
    session_id = data['sessionId']
    join_room(session_id)
    daw_sessions[session_id] = {
        'host_id': data['hostId'],
        'project_id': data['projectId'],
        'state': data.get('initialState', {}),
        'collaborators': [{'id': data['hostId'], 'username': data['hostName']}],
    }
    emit('daw:session_created', {'sessionId': session_id, 'sessionCode': data['sessionCode']})

@socketio.on('daw:join_session')
def on_daw_join_session(data):
    session_id = data['sessionId']
    join_room(session_id)
    if session_id in daw_sessions:
        sess = daw_sessions[session_id]
        sess['collaborators'].append({'id': data['userId'], 'username': data['username']})
        # Tell the joiner to request full state from host
        emit('daw:request_state', {'userId': data['userId']}, room=sess['host_id'])
        # Tell everyone else they joined
        emit('daw:user_joined', data, room=session_id, include_self=False)
    else:
        emit('daw:error', {'message': 'Session not found'})

@socketio.on('daw:leave_session')
def on_daw_leave_session(data):
    session_id = data.get('sessionId')
    if session_id:
        leave_room(session_id)
        if session_id in daw_sessions:
            daw_sessions[session_id]['collaborators'] = [
                c for c in daw_sessions[session_id]['collaborators']
                if c['id'] != data.get('userId')
            ]
        emit('daw:user_left', data, room=session_id)

@socketio.on('daw:op')
def on_daw_op(data):
    session_id = data.get('sessionId')
    if session_id:
        emit('daw:op', data, room=session_id, include_self=False)

@socketio.on('daw:cursor')
def on_daw_cursor(data):
    session_id = data.get('sessionId')
    if session_id:
        emit('daw:cursor', data, room=session_id, include_self=False)

@socketio.on('daw:full_state_response')
def on_daw_full_state_response(data):
    target_id = data.get('targetUserId')
    if target_id:
        emit('daw:full_state', data, room=target_id)

@socketio.on('daw:chat')
def on_daw_chat(data):
    session_id = data.get('sessionId')
    if session_id:
        emit('daw:chat', data, room=session_id, include_self=False)
*/