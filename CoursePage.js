// =============================================================================
// CoursePage.js — Course Detail + Lesson Player
// =============================================================================
// Route: /course/:id
// Features: course overview, lesson list, video/text/audio player,
//           enrollment + Stripe checkout, progress tracking, certificate
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';
const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const getHeaders = () => ({ Authorization: `Bearer ${getToken()}` });
const getJSONHeaders = () => ({ ...getHeaders(), 'Content-Type': 'application/json' });

const S = {
  page:      { minHeight:'100vh', background:'#06060f', color:'#e0e0e0', fontFamily:'Inter, sans-serif' },
  layout:    { display:'grid', gridTemplateColumns:'1fr 360px', minHeight:'100vh', gap:0 },
  main:      { padding:'32px 32px 32px 32px', overflowY:'auto' },
  sidebar:   { background:'#0a0a14', borderLeft:'1px solid #1a1a2e', padding:24, overflowY:'auto', position:'sticky', top:0, height:'100vh' },
  backBtn:   { color:'#888', textDecoration:'none', fontSize:13, display:'inline-flex', alignItems:'center', gap:6, marginBottom:24 },
  thumbnail: { width:'100%', borderRadius:12, aspectRatio:'16/9', objectFit:'cover', background:'#111', marginBottom:24 },
  title:     { fontSize:26, fontWeight:800, color:'#e0e0e0', marginBottom:8, lineHeight:1.3 },
  meta:      { display:'flex', gap:16, flexWrap:'wrap', marginBottom:20 },
  badge:     (c='#00ffc8') => ({ padding:'3px 10px', borderRadius:10, background:`${c}18`, color:c, fontSize:11, border:`1px solid ${c}33` }),
  desc:      { color:'#aaa', fontSize:14, lineHeight:1.7, marginBottom:24 },
  sTitle:    { fontSize:15, fontWeight:700, color:'#e0e0e0', marginBottom:12 },
  lessonRow: (active, done) => ({
    display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
    borderRadius:8, cursor:'pointer', marginBottom:4,
    background: active ? 'rgba(0,255,200,0.1)' : 'transparent',
    border: `1px solid ${active ? '#00ffc844' : 'transparent'}`,
  }),
  lessonNum: (done) => ({
    width:24, height:24, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:11, fontWeight:700, flexShrink:0,
    background: done ? '#00ffc8' : '#1a1a2e', color: done ? '#06060f' : '#888',
  }),
  lessonTitle:{ fontSize:13, flex:1, color:'#ccc' },
  lessonDur: { fontSize:10, color:'#555' },
  freeBadge: { fontSize:9, color:'#00ffc8', border:'1px solid #00ffc844', borderRadius:8, padding:'1px 5px' },
  priceCard: { background:'#0d0d1a', border:'1px solid #1a1a2e', borderRadius:12, padding:20, marginBottom:16 },
  price:     { fontSize:28, fontWeight:800, color:'#00ffc8', marginBottom:4 },
  enrollBtn: (c='#00ffc8') => ({
    width:'100%', padding:'14px', border:`1px solid ${c}`, borderRadius:8,
    background:`${c}18`, color:c, cursor:'pointer', fontSize:15, fontWeight:700,
    fontFamily:'Inter, sans-serif', marginBottom:12,
  }),
  progress:  { background:'#111', borderRadius:10, height:8, overflow:'hidden', marginBottom:4 },
  progFill:  (pct) => ({ width:`${pct}%`, height:'100%', background:'#00ffc8', borderRadius:10, transition:'width 0.3s' }),
  certCard:  { background:'linear-gradient(135deg,rgba(0,255,200,0.08),rgba(255,102,0,0.06))',
               border:'1px solid #00ffc844', borderRadius:12, padding:20, textAlign:'center' },
  videoWrap: { background:'#000', borderRadius:12, aspectRatio:'16/9', marginBottom:20, overflow:'hidden',
               display:'flex', alignItems:'center', justifyContent:'center' },
  playerTitle:{ fontSize:18, fontWeight:700, marginBottom:8 },
  nextBtn:   { padding:'8px 20px', border:'1px solid #00ffc8', borderRadius:6, background:'rgba(0,255,200,0.1)',
               color:'#00ffc8', cursor:'pointer', fontSize:13, fontFamily:'Inter, sans-serif' },
};

export default function CoursePage() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const videoRef   = useRef(null);

  const [course,      setCourse]      = useState(null);
  const [lessons,     setLessons]     = useState([]);
  const [enrolled,    setEnrolled]    = useState(false);
  const [activeLesson,setActiveLesson]= useState(null);
  const [completed,   setCompleted]   = useState(new Set());
  const [loading,     setLoading]     = useState(true);
  const [enrolling,   setEnrolling]   = useState(false);
  const [status,      setStatus]      = useState('');
  const [showCert,    setShowCert]    = useState(false);

  const token = getToken();

  const fetchCourse = useCallback(async () => {
    try {
      const res  = await fetch(`${BACKEND}/api/academy/courses/${id}`);
      const data = await res.json();
      setCourse(data.course || data);
    } catch (e) { setStatus('Failed to load course'); }
  }, [id]);

  const fetchLessons = useCallback(async () => {
    try {
      const res  = await fetch(`${BACKEND}/api/academy/courses/${id}/lessons`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setLessons(data);
        if (data.length) setActiveLesson(data[0]);
      }
    } catch (e) {}
  }, [id]);

  const fetchEnrollment = useCallback(async () => {
    if (!token) return;
    try {
      const res  = await fetch(`${BACKEND}/api/academy/my-enrollments`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        const ids  = (data.enrollments || data).map(e => e.course_id || e.id);
        setEnrolled(ids.includes(parseInt(id)));
      }
    } catch (e) {}
  }, [id, token]);

  const fetchProgress = useCallback(async () => {
    if (!token) return;
    try {
      const res  = await fetch(`${BACKEND}/api/academy/courses/${id}/progress`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCompleted(new Set(data.completed_lesson_ids || []));
      }
    } catch (e) {}
  }, [id, token]);

  useEffect(() => {
    Promise.all([fetchCourse(), fetchEnrollment(), fetchProgress()])
      .finally(() => setLoading(false));
  }, [fetchCourse, fetchEnrollment, fetchProgress]);

  useEffect(() => {
    if (enrolled) fetchLessons();
    else {
      // load free preview lessons
      fetch(`${BACKEND}/api/academy/courses/${id}/lessons/preview`)
        .then(r => r.ok ? r.json() : [])
        .then(data => { if (data.length) { setLessons(data); setActiveLesson(data[0]); } })
        .catch(() => {});
    }
  }, [enrolled, id]);

  const handleEnroll = async () => {
    if (!token) { navigate('/login'); return; }
    setEnrolling(true);
    setStatus('');
    try {
      if (course?.price === 0) {
        const res  = await fetch(`${BACKEND}/api/academy/courses/${id}/enroll`, {
          method: 'POST', headers: getJSONHeaders()
        });
        if (res.ok) {
          setEnrolled(true);
          fetchLessons();
          setStatus('✅ Enrolled! Start learning.');
        } else {
          const d = await res.json();
          setStatus(d.error || 'Enrollment failed');
        }
      } else {
        // paid course — Stripe checkout
        const res  = await fetch(`${BACKEND}/api/academy/courses/${id}/checkout`, {
          method: 'POST', headers: getJSONHeaders()
        });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
        else setStatus(data.error || 'Checkout failed');
      }
    } catch (e) {
      setStatus('Error: ' + e.message);
    }
    setEnrolling(false);
  };

  const markComplete = async (lessonId) => {
    if (!token) return;
    try {
      await fetch(`${BACKEND}/api/academy/lessons/${lessonId}/complete`, {
        method: 'POST', headers: getJSONHeaders()
      });
      setCompleted(prev => new Set([...prev, lessonId]));
    } catch (e) {}
  };

  const handleLessonEnd = () => {
    if (!activeLesson) return;
    markComplete(activeLesson.id);
    // auto-advance
    const idx  = lessons.findIndex(l => l.id === activeLesson.id);
    if (idx < lessons.length - 1) {
      setActiveLesson(lessons[idx + 1]);
    } else {
      setShowCert(true);
    }
  };

  const progressPct = lessons.length ? Math.round((completed.size / lessons.length) * 100) : 0;
  const allDone     = lessons.length > 0 && completed.size >= lessons.length;

  if (loading) return (
    <div style={{ ...S.page, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#00ffc8' }}>Loading course…</div>
    </div>
  );

  if (!course) return (
    <div style={{ ...S.page, padding:40 }}>
      <div style={{ color:'#ff4444' }}>Course not found.</div>
      <Link to="/creator-academy" style={{ color:'#00ffc8' }}>← Back to Academy</Link>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.layout}>

        {/* ── Main content ── */}
        <div style={S.main}>
          <Link to="/creator-academy" style={S.backBtn}>← Back to Academy</Link>

          {/* Course header */}
          {course.thumbnail_url && (
            <img src={course.thumbnail_url} alt={course.title} style={S.thumbnail} />
          )}
          <h1 style={S.title}>{course.title}</h1>
          <div style={S.meta}>
            <span style={S.badge('#00ffc8')}>{course.category?.replace(/-/g,' ')}</span>
            <span style={S.badge('#888')}>{course.level || 'All levels'}</span>
            <span style={S.badge('#FF6600')}>
              {course.lesson_count || lessons.length} lessons
            </span>
            {course.avg_rating && (
              <span style={S.badge('#ffdd00')}>⭐ {course.avg_rating.toFixed(1)}</span>
            )}
            <span style={{ color:'#888', fontSize:12 }}>by {course.creator_name}</span>
          </div>
          <p style={S.desc}>{course.description || 'No description provided.'}</p>

          {/* Active lesson player */}
          {activeLesson && enrolled && (
            <div style={{ marginBottom:32 }}>
              <div style={S.playerTitle}>{activeLesson.title}</div>

              {/* Video */}
              {activeLesson.content_type === 'video' && activeLesson.video_url && (
                <div style={S.videoWrap}>
                  <video
                    ref={videoRef}
                    src={activeLesson.video_url}
                    controls
                    style={{ width:'100%', height:'100%' }}
                    onEnded={handleLessonEnd}
                  />
                </div>
              )}

              {/* Audio */}
              {activeLesson.content_type === 'audio' && activeLesson.video_url && (
                <div style={{ background:'#0d0d1a', borderRadius:12, padding:24, marginBottom:20 }}>
                  <audio src={activeLesson.video_url} controls style={{ width:'100%' }} onEnded={handleLessonEnd} />
                </div>
              )}

              {/* Text */}
              {activeLesson.content_type === 'text' && (
                <div style={{ background:'#0d0d1a', borderRadius:12, padding:24, marginBottom:20,
                  color:'#ccc', lineHeight:1.8, fontSize:14 }}>
                  {activeLesson.text_content || 'No content for this lesson.'}
                </div>
              )}

              {activeLesson.description && (
                <p style={{ color:'#888', fontSize:13, lineHeight:1.6, marginBottom:16 }}>
                  {activeLesson.description}
                </p>
              )}

              <div style={{ display:'flex', gap:10 }}>
                <button style={S.nextBtn} onClick={handleLessonEnd}>
                  {completed.has(activeLesson.id) ? '✓ Completed' : 'Mark Complete & Next →'}
                </button>
                {allDone && (
                  <button style={{ ...S.nextBtn, borderColor:'#FF6600', color:'#FF6600', background:'rgba(255,102,0,0.1)' }}
                    onClick={() => setShowCert(true)}>
                    🎓 Get Certificate
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Certificate */}
          {showCert && (
            <div style={S.certCard}>
              <div style={{ fontSize:40, marginBottom:8 }}>🎓</div>
              <div style={{ fontSize:20, fontWeight:800, color:'#00ffc8', marginBottom:4 }}>
                Course Complete!
              </div>
              <div style={{ color:'#888', fontSize:13, marginBottom:16 }}>
                You've completed <strong style={{ color:'#e0e0e0' }}>{course.title}</strong>
              </div>
              <button
                style={{ ...S.enrollBtn('#00ffc8'), width:'auto', padding:'10px 24px' }}
                onClick={async () => {
                  try {
                    const res  = await fetch(`${BACKEND}/api/academy/courses/${id}/certificate`, {
                      method: 'POST', headers: getJSONHeaders()
                    });
                    const data = await res.json();
                    if (data.certificate_url) window.open(data.certificate_url, '_blank');
                    else setStatus('Certificate generated — check your email');
                  } catch (e) {
                    setStatus('Certificate error: ' + e.message);
                  }
                }}
              >
                Download Certificate
              </button>
            </div>
          )}

          {/* Lesson list (below player for context) */}
          {enrolled && lessons.length > 0 && (
            <div style={{ marginTop:32 }}>
              <div style={S.sTitle}>📚 All Lessons</div>
              {lessons.map((lesson, i) => (
                <div
                  key={lesson.id}
                  style={S.lessonRow(activeLesson?.id === lesson.id, completed.has(lesson.id))}
                  onClick={() => setActiveLesson(lesson)}
                >
                  <div style={S.lessonNum(completed.has(lesson.id))}>
                    {completed.has(lesson.id) ? '✓' : i + 1}
                  </div>
                  <span style={S.lessonTitle}>{lesson.title}</span>
                  {lesson.is_free_preview && <span style={S.freeBadge}>FREE</span>}
                  {lesson.duration_secs && (
                    <span style={S.lessonDur}>{Math.ceil(lesson.duration_secs / 60)}m</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div style={S.sidebar}>

          {/* Price + enroll */}
          <div style={S.priceCard}>
            <div style={S.price}>
              {course.price === 0 ? 'FREE' : `$${course.price?.toFixed(2)}`}
            </div>
            {enrolled ? (
              <>
                <div style={{ color:'#00ffc8', fontSize:13, marginBottom:12 }}>✅ You're enrolled</div>
                <div style={{ marginBottom:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#888', marginBottom:4 }}>
                    <span>Progress</span><span>{progressPct}%</span>
                  </div>
                  <div style={S.progress}>
                    <div style={S.progFill(progressPct)} />
                  </div>
                </div>
                <div style={{ color:'#666', fontSize:11 }}>
                  {completed.size} / {lessons.length} lessons completed
                </div>
              </>
            ) : (
              <>
                <button style={S.enrollBtn()} onClick={handleEnroll} disabled={enrolling}>
                  {enrolling ? 'Processing…' : course.price === 0 ? 'Enroll Free' : `Enroll — $${course.price?.toFixed(2)}`}
                </button>
                <div style={{ color:'#555', fontSize:11, textAlign:'center' }}>
                  {course.price > 0 ? '90% goes to the creator • Stripe secure checkout' : 'Free forever'}
                </div>
              </>
            )}
            {status && <div style={{ color: status.includes('✅') ? '#00ffc8' : '#ff4444', fontSize:12, marginTop:8 }}>{status}</div>}
          </div>

          {/* Course stats */}
          <div style={{ marginBottom:20 }}>
            {[
              ['👥', 'Students', course.enrollment_count || 0],
              ['📖', 'Lessons', course.lesson_count || lessons.length],
              ['⭐', 'Rating', course.avg_rating ? `${course.avg_rating.toFixed(1)} (${course.review_count} reviews)` : 'No ratings yet'],
            ].map(([icon, label, val]) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0',
                borderBottom:'1px solid #111', fontSize:13 }}>
                <span style={{ color:'#888' }}>{icon} {label}</span>
                <span style={{ color:'#ccc' }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Lesson list in sidebar (not enrolled = preview only) */}
          {!enrolled && (
            <div>
              <div style={S.sTitle}>📋 Lessons</div>
              {(course.lessons || []).slice(0,5).map((l, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0',
                  borderBottom:'1px solid #0d0d1a', fontSize:12 }}>
                  <span style={{ color:'#555', width:20 }}>{i+1}</span>
                  <span style={{ color:'#aaa', flex:1 }}>{l}</span>
                </div>
              ))}
              {(course.lessons?.length || 0) > 5 && (
                <div style={{ color:'#555', fontSize:11, marginTop:6 }}>
                  + {course.lessons.length - 5} more lessons after enrollment
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop:20 }}>
            <Link to="/creator-academy" style={{ color:'#555', fontSize:12, textDecoration:'none' }}>
              ← Back to all courses
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
