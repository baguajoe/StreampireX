// =============================================================================
// CoursePlayer.js — Student: Watch Lessons + Track Progress
// =============================================================================
// Location: src/front/js/pages/CoursePlayer.js
// Route: /course/:courseId
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

const CoursePlayer = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [activeLesson, setActiveLesson] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [progress, setProgress] = useState({ progress_pct: 0, completed_lessons: [] });
  const [reviews, setReviews] = useState([]);
  const [enrolling, setEnrolling] = useState(false);
  const [tab, setTab] = useState("content"); // content | overview | reviews
  const [myReview, setMyReview] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [narrating, setNarrating] = useState(false);
  const [narrateAudio, setNarrateAudio] = useState(null);
  const [narrateError, setNarrateError] = useState("");
  const audioRef = useRef(null);
  const [loading, setLoading] = useState(true);

  const videoRef = useRef(null);
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [courseRes, progressRes] = await Promise.allSettled([
        fetch(`${BACKEND_URL}/api/academy/courses/${courseId}`),
        token ? fetch(`${BACKEND_URL}/api/academy/courses/${courseId}/progress`, { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve(null),
      ]);

      if (courseRes.status === "fulfilled" && courseRes.value.ok) {
        const d = await courseRes.value.json();
        setCourse(d);
        setLessons(d.lessons || []);
        setReviews(d.reviews || []);
        if (d.lessons?.length) setActiveLesson(d.lessons[0]);
      }

      if (progressRes.status === "fulfilled" && progressRes.value?.ok) {
        const d = await progressRes.value.json();
        setProgress({ progress_pct: d.progress_pct || 0, completed_lessons: d.completed_lessons || [] });
        setEnrollment(d.enrolled ? d : null);
      }
    } catch (e) {}
    setLoading(false);
  }, [courseId, token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const isCompleted = (id) => progress.completed_lessons.includes(id);
  const isEnrolled = !!enrollment?.enrolled;

  const markComplete = async (lessonId) => {
    if (!isEnrolled) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/academy/lessons/${lessonId}/complete`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setProgress({ progress_pct: d.progress_pct, completed_lessons: d.completed_lessons });
      }
    } catch (e) {
      // Optimistic
      const newCompleted = [...new Set([...progress.completed_lessons, lessonId])];
      setProgress((prev) => ({ progress_pct: Math.round(newCompleted.length / lessons.length * 100), completed_lessons: newCompleted }));
    }
  };

  const enroll = async () => {
    if (!token) { navigate("/login"); return; }
    if (course.price === 0) {
      setEnrolling(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/academy/courses/${courseId}/enroll`, {
          method: "POST", headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setEnrollment({ enrolled: true, progress_pct: 0, completed_lessons: [] });
          setProgress({ progress_pct: 0, completed_lessons: [] });
        }
      } catch (e) {
        setEnrollment({ enrolled: true, progress_pct: 0, completed_lessons: [] });
      }
      setEnrolling(false);
    } else {
      // Route to checkout
      navigate(`/checkout/course/${courseId}`);
    }
  };

  const submitReview = async () => {
    setSubmittingReview(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/academy/courses/${courseId}/reviews`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ rating: reviewRating, body: reviewBody }),
      });
      if (res.ok) {
        const r = await res.json();
        setMyReview(r); setReviews((prev) => [r, ...prev]);
      }
    } catch (e) {}
    setSubmittingReview(false);
  };

  const nextLesson = () => {
    if (!activeLesson) return;
    const idx = lessons.findIndex((l) => l.id === activeLesson.id);
    if (idx < lessons.length - 1) { markComplete(activeLesson.id); setActiveLesson(lessons[idx + 1]); }
  };

  const prevLesson = () => {
    if (!activeLesson) return;
    const idx = lessons.findIndex((l) => l.id === activeLesson.id);
    if (idx > 0) setActiveLesson(lessons[idx - 1]);
  };

  if (loading) return <div style={P.loading}><div style={P.spinner} /><p style={{ color: "#4a6070" }}>Loading course...</p></div>;
  if (!course) return <div style={P.loading}><p style={{ color: "#ff4444" }}>Course not found.</p></div>;

  const currentIdx = activeLesson ? lessons.findIndex((l) => l.id === activeLesson.id) : -1;

  const narrateLesson = async () => {
    if (!currentLesson?.text_content) return;
    setNarrating(true); setNarrateError(""); setNarrateAudio(null);
    const token = localStorage.getItem("token");
    // Strip markdown for cleaner narration
    const cleanText = currentLesson.text_content
      .replace(/#{1,6} /g, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/\|[^\n]+\|/g, "")
      .replace(/[-•]/g, "")
      .replace(/
{3,}/g, "\n\n")
      .substring(0, 2000);
    try {
      const res = await fetch(\`\${BACKEND_URL}/api/voice/narration\`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: \`Bearer \${token}\` },
        body: JSON.stringify({ text: cleanText, title: currentLesson.title, voice_style: "educational" })
      });
      const data = await res.json();
      if (data.audio_url) {
        setNarrateAudio(data.audio_url);
        setTimeout(() => { if (audioRef.current) audioRef.current.play(); }, 100);
      } else {
        setNarrateError(data.error || "Could not generate audio");
      }
    } catch (e) { setNarrateError("Narration failed — check your AI credits"); }
    setNarrating(false);
  };

  return (
    <div style={P.page}>
      {/* Top bar */}
      <div style={P.topBar}>
        <button style={P.backBtn} onClick={() => navigate("/creator-academy")}>← Academy</button>
        <div style={P.courseTitle}>{course.title}</div>
        <div style={P.progressWrap}>
          <div style={P.progressBar}>
            <div style={{ ...P.progressFill, width: `${progress.progress_pct}%` }} />
          </div>
          <span style={P.progressPct}>{progress.progress_pct}%</span>
        </div>
      </div>

      <div style={P.layout}>
        {/* Sidebar */}
        <div style={P.sidebar}>
          <div style={P.sidebarHeader}>
            <h3 style={P.sidebarTitle}>Course Content</h3>
            <span style={P.sidebarCount}>{lessons.length} lessons</span>
          </div>
          <div style={P.lessonList}>
            {lessons.map((lesson, i) => {
              const isActive = activeLesson?.id === lesson.id;
              const done = isCompleted(lesson.id);
              const locked = !isEnrolled && !lesson.is_free_preview;
              return (
                <div
                  key={lesson.id}
                  style={{ ...P.lessonItem, ...(isActive ? P.lessonItemActive : {}), ...(locked ? P.lessonItemLocked : {}) }}
                  onClick={() => { if (!locked) setActiveLesson(lesson); }}
                >
                  <div style={P.lessonCheck}>
                    {done ? <span style={P.checkDone}>✓</span> : locked ? <span style={P.lockIcon}>🔒</span> : <span style={P.checkEmpty}>{i + 1}</span>}
                  </div>
                  <div style={P.lessonMeta}>
                    <span style={P.lessonName}>{lesson.title}</span>
                    <div style={P.lessonMetaRow}>
                      <span style={{ ...P.lessonTypeBadge, color: lesson.content_type === "video" ? "#4a9eff" : "#00ffc8" }}>
                        {lesson.content_type === "video" ? "📹" : lesson.content_type === "audio" ? "🎧" : "📄"}
                      </span>
                      {lesson.is_free_preview && <span style={P.freeTag}>Free</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main content */}
        <div style={P.main}>
          {activeLesson ? (
            <>
              {/* Video / content player */}
              {(isEnrolled || activeLesson.is_free_preview) ? (
                <div style={P.playerWrap}>
                  {activeLesson.content_type === "video" && activeLesson.video_url ? (
                    <video ref={videoRef} src={activeLesson.video_url} controls style={P.video} onEnded={() => markComplete(activeLesson.id)} />
                  ) : activeLesson.content_type === "audio" && activeLesson.video_url ? (
                    <div style={P.audioPlayer}>
                      <div style={P.audioIcon}>🎧</div>
                      <h3 style={P.audioTitle}>{activeLesson.title}</h3>
                      <audio src={activeLesson.video_url} controls style={P.audioEl} onEnded={() => markComplete(activeLesson.id)} />
                    </div>
                  ) : activeLesson.content_type === "text" ? (
                    <div style={P.textLesson}>
                      <h2 style={P.textTitle}>{activeLesson.title}</h2>
                      {/* AI Voice Narration Bar */}
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20, padding:"12px 16px", background:"rgba(0,255,200,0.05)", borderRadius:10, border:"1px solid rgba(0,255,200,0.15)" }}>
                        <span style={{ fontSize:18 }}>🎙</span>
                        <span style={{ color:"#888", fontSize:13, flex:1 }}>Listen to this lesson</span>
                        <button onClick={narrateLesson} disabled={narrating} style={{ padding:"7px 16px", background:narrating?"#333":"rgba(0,255,200,0.15)", border:"1px solid #00ffc8", color:narrating?"#666":"#00ffc8", borderRadius:8, cursor:narrating?"not-allowed":"pointer", fontSize:13, fontWeight:700 }}>
                          {narrating ? "⏳ Generating..." : narrateAudio ? "🔄 Regenerate" : "▶ Listen"}
                        </button>
                        {narrateAudio && <button onClick={() => setNarrateAudio(null)} style={{ padding:"7px 10px", background:"transparent", border:"1px solid #333", color:"#666", borderRadius:8, cursor:"pointer", fontSize:12 }}>✕</button>}
                      </div>
                      {narrateError && <div style={{ color:"#ff8888", fontSize:12, marginBottom:12 }}>{narrateError}</div>}
                      {narrateAudio && <audio ref={audioRef} controls src={narrateAudio} style={{ width:"100%", borderRadius:8, marginBottom:16 }} />}
                      {activeLesson.text_content ? (
                        <div style={P.textBody}>{activeLesson.text_content}</div>
                      ) : (
                        <p style={P.textPlaceholder}>Lesson content coming soon.</p>
                      )}
                    </div>
                  ) : (
                    <div style={P.noContent}>
                      <span style={{ fontSize: "3rem" }}>🎬</span>
                      <p style={{ color: "#4a6070" }}>Content for this lesson hasn't been uploaded yet.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div style={P.lockedOverlay}>
                  <div style={P.lockedCard}>
                    <span style={P.lockedIcon}>🔒</span>
                    <h3 style={P.lockedTitle}>This lesson is locked</h3>
                    <p style={P.lockedSub}>{course.price === 0 ? "Enroll for free to access all lessons" : `Purchase this course for $${course.price} to unlock all ${lessons.length} lessons`}</p>
                    <button style={P.enrollBtn} onClick={enroll} disabled={enrolling}>
                      {enrolling ? "Enrolling..." : course.price === 0 ? "Enroll Free →" : `Buy for $${course.price} →`}
                    </button>
                  </div>
                </div>
              )}

              {/* Lesson nav */}
              <div style={P.lessonNav}>
                <button style={P.navBtn} onClick={prevLesson} disabled={currentIdx === 0}>← Previous</button>
                <div style={P.lessonNavCenter}>
                  <h3 style={P.lessonNavTitle}>{activeLesson.title}</h3>
                  <p style={P.lessonNavSub}>Lesson {currentIdx + 1} of {lessons.length}</p>
                </div>
                {isEnrolled && !isCompleted(activeLesson.id) && (
                  <button style={P.completeBtn} onClick={() => markComplete(activeLesson.id)}>✓ Mark Complete</button>
                )}
                <button style={P.navBtn} onClick={nextLesson} disabled={currentIdx === lessons.length - 1}>Next →</button>
              </div>
            </>
          ) : (
            /* Course overview when no lesson selected */
            <div style={P.overview}>
              <div style={P.overviewThumb} style={{ background: course.thumbnail_url ? `url(${course.thumbnail_url}) center/cover` : "linear-gradient(135deg, rgba(0,255,200,0.08), transparent)", height: "220px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
                {!course.thumbnail_url && <span style={{ fontSize: "4rem" }}>🎓</span>}
              </div>
              <h2 style={P.overviewTitle}>{course.title}</h2>
              <p style={P.overviewDesc}>{course.description}</p>
              {!isEnrolled && (
                <button style={P.enrollBtn} onClick={enroll} disabled={enrolling}>
                  {enrolling ? "Enrolling..." : course.price === 0 ? "Enroll Free →" : `Buy for $${course.price} →`}
                </button>
              )}
            </div>
          )}

          {/* Tabs */}
          <div style={P.tabBar}>
            {["content", "overview", "reviews"].map((t) => (
              <button key={t} style={{ ...P.tabBtn, ...(tab === t ? P.tabBtnActive : {}) }} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div style={P.tabContent}>
              <h4 style={P.infoTitle}>About this course</h4>
              <p style={P.infoText}>{course.description || "No description provided."}</p>
              <div style={P.infoStats}>
                <div style={P.infoStat}><span style={P.infoStatNum}>{course.lesson_count || lessons.length}</span><span style={P.infoStatLabel}>Lessons</span></div>
                <div style={P.infoStat}><span style={P.infoStatNum}>{course.enrollment_count?.toLocaleString()}</span><span style={P.infoStatLabel}>Students</span></div>
                <div style={P.infoStat}><span style={P.infoStatNum}>{course.avg_rating?.toFixed(1)} ★</span><span style={P.infoStatLabel}>Rating</span></div>
                <div style={P.infoStat}><span style={P.infoStatNum}>Lifetime</span><span style={P.infoStatLabel}>Access</span></div>
              </div>
              {course.tags?.length > 0 && (
                <div style={P.tagRow}>{course.tags.map((t) => <span key={t} style={P.tag}>{t}</span>)}</div>
              )}
            </div>
          )}

          {tab === "reviews" && (
            <div style={P.tabContent}>
              {isEnrolled && !myReview && (
                <div style={P.reviewForm}>
                  <h4 style={P.infoTitle}>Leave a Review</h4>
                  <div style={P.starRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} style={{ ...P.star, color: s <= reviewRating ? "#FFD700" : "#2a3a48" }} onClick={() => setReviewRating(s)}>★</span>
                    ))}
                  </div>
                  <textarea style={P.reviewInput} value={reviewBody} onChange={(e) => setReviewBody(e.target.value)} placeholder="Share your experience with this course..." rows={3} />
                  <button style={P.reviewSubmit} onClick={submitReview} disabled={submittingReview}>
                    {submittingReview ? "Submitting..." : "Submit Review"}
                  </button>
                </div>
              )}
              <div style={P.reviewsList}>
                {reviews.map((r) => (
                  <div key={r.id} style={P.reviewCard}>
                    <div style={P.reviewHeader}>
                      <div style={P.reviewerName}>{r.username}</div>
                      <div style={P.reviewStars}>{Array.from({ length: 5 }).map((_, i) => <span key={i} style={{ color: i < r.rating ? "#FFD700" : "#2a3a48", fontSize: "0.85rem" }}>★</span>)}</div>
                    </div>
                    <p style={P.reviewBody}>{r.body}</p>
                  </div>
                ))}
                {reviews.length === 0 && <p style={{ color: "#3a5060", fontSize: "0.88rem" }}>No reviews yet. Be the first!</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const P = {
  page: { background: "#07090f", minHeight: "100vh", color: "#e0eaf0", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column" },
  loading: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: "16px" },
  spinner: { width: "36px", height: "36px", border: "3px solid rgba(0,255,200,0.1)", borderTopColor: "#00ffc8", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  topBar: { display: "flex", alignItems: "center", gap: "16px", padding: "14px 24px", background: "rgba(8,14,22,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 },
  backBtn: { background: "none", border: "none", color: "#4a6070", cursor: "pointer", fontSize: "0.88rem", whiteSpace: "nowrap" },
  courseTitle: { flex: 1, color: "#e0eaf0", fontWeight: "700", fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  progressWrap: { display: "flex", alignItems: "center", gap: "10px" },
  progressBar: { width: "120px", height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "999px", overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(90deg, #00ffc8, #00d9aa)", borderRadius: "999px", transition: "width 0.4s ease" },
  progressPct: { color: "#00ffc8", fontWeight: "800", fontSize: "0.82rem", minWidth: "36px" },
  layout: { display: "flex", flex: 1, overflow: "hidden" },
  sidebar: { width: "300px", background: "rgba(8,14,22,0.8)", borderRight: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto" },
  sidebarHeader: { padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" },
  sidebarTitle: { color: "#e0eaf0", fontWeight: "800", margin: 0, fontSize: "0.92rem" },
  sidebarCount: { color: "#4a6070", fontSize: "0.76rem" },
  lessonList: { flex: 1, overflowY: "auto" },
  lessonItem: { display: "flex", gap: "10px", padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.15s" },
  lessonItemActive: { background: "rgba(0,255,200,0.06)", borderLeft: "2px solid #00ffc8" },
  lessonItemLocked: { opacity: 0.5, cursor: "not-allowed" },
  lessonCheck: { width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  checkDone: { color: "#00ffc8", fontWeight: "800", fontSize: "0.9rem" },
  checkEmpty: { width: "22px", height: "22px", background: "rgba(255,255,255,0.06)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", color: "#6a8090" },
  lockIcon: { fontSize: "0.8rem" },
  lessonMeta: { flex: 1, overflow: "hidden" },
  lessonName: { color: "#c0d0dc", fontSize: "0.84rem", fontWeight: "600", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "3px" },
  lessonMetaRow: { display: "flex", gap: "6px", alignItems: "center" },
  lessonTypeBadge: { fontSize: "0.72rem" },
  freeTag: { padding: "1px 6px", background: "rgba(0,255,200,0.08)", color: "#00d9aa", borderRadius: "3px", fontSize: "0.66rem", fontWeight: "700" },
  main: { flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" },
  playerWrap: { background: "#000", position: "relative" },
  video: { width: "100%", maxHeight: "65vh", display: "block" },
  audioPlayer: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 40px", gap: "16px", background: "linear-gradient(180deg, rgba(0,255,200,0.04), transparent)" },
  audioIcon: { fontSize: "4rem" },
  audioTitle: { color: "#e0eaf0", fontWeight: "800", fontSize: "1.3rem", margin: 0 },
  audioEl: { width: "100%", maxWidth: "480px" },
  textLesson: { padding: "36px 48px", maxWidth: "760px" },
  textTitle: { fontSize: "1.6rem", fontWeight: "900", marginBottom: "20px" },
  textBody: { color: "#b0c0cc", lineHeight: 1.8, fontSize: "1rem", whiteSpace: "pre-wrap" },
  textPlaceholder: { color: "#3a5060" },
  noContent: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 40px", gap: "12px" },
  lockedOverlay: { display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 40px", background: "rgba(0,0,0,0.3)" },
  lockedCard: { textAlign: "center", padding: "40px", background: "rgba(14,20,30,0.9)", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.07)", maxWidth: "400px" },
  lockedIcon: { fontSize: "2.8rem", display: "block", marginBottom: "12px" },
  lockedTitle: { color: "#e0eaf0", fontWeight: "800", fontSize: "1.1rem", margin: "0 0 8px" },
  lockedSub: { color: "#5a7080", fontSize: "0.88rem", lineHeight: 1.5, margin: "0 0 20px" },
  enrollBtn: { padding: "14px 32px", background: "linear-gradient(135deg, #00ffc8, #00d9aa)", border: "none", borderRadius: "12px", color: "#041014", fontWeight: "900", fontSize: "1rem", cursor: "pointer", boxShadow: "0 8px 24px rgba(0,255,200,0.2)" },
  lessonNav: { display: "flex", alignItems: "center", gap: "12px", padding: "14px 24px", background: "rgba(10,16,24,0.9)", borderTop: "1px solid rgba(255,255,255,0.05)" },
  navBtn: { padding: "9px 18px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", color: "#8090a0", fontWeight: "700", cursor: "pointer", fontSize: "0.86rem" },
  lessonNavCenter: { flex: 1, textAlign: "center" },
  lessonNavTitle: { color: "#e0eaf0", fontWeight: "700", margin: 0, fontSize: "0.95rem" },
  lessonNavSub: { color: "#4a6070", fontSize: "0.76rem", margin: "2px 0 0" },
  completeBtn: { padding: "9px 18px", background: "rgba(0,255,200,0.1)", border: "1px solid rgba(0,255,200,0.24)", borderRadius: "10px", color: "#00ffc8", fontWeight: "700", cursor: "pointer", fontSize: "0.86rem" },
  overview: { padding: "32px 40px" },
  overviewTitle: { fontSize: "1.8rem", fontWeight: "900", margin: "0 0 12px" },
  overviewDesc: { color: "#6a8090", lineHeight: 1.7, marginBottom: "24px" },
  tabBar: { display: "flex", gap: "4px", padding: "12px 24px", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(8,14,22,0.6)" },
  tabBtn: { padding: "8px 18px", background: "none", border: "none", color: "#5a7080", fontWeight: "700", cursor: "pointer", borderRadius: "8px", fontSize: "0.88rem" },
  tabBtnActive: { background: "rgba(0,255,200,0.1)", color: "#00ffc8" },
  tabContent: { padding: "24px" },
  infoTitle: { color: "#e0eaf0", fontWeight: "800", margin: "0 0 12px" },
  infoText: { color: "#6a8090", lineHeight: 1.7, fontSize: "0.92rem" },
  infoStats: { display: "flex", gap: "24px", margin: "20px 0", flexWrap: "wrap" },
  infoStat: { display: "flex", flexDirection: "column", gap: "3px" },
  infoStatNum: { color: "#00ffc8", fontWeight: "900", fontSize: "1.2rem" },
  infoStatLabel: { color: "#4a6070", fontSize: "0.74rem", textTransform: "uppercase" },
  tagRow: { display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" },
  tag: { padding: "4px 10px", background: "rgba(255,255,255,0.04)", borderRadius: "999px", fontSize: "0.76rem", color: "#6a8090" },
  reviewForm: { background: "rgba(255,255,255,0.02)", borderRadius: "14px", padding: "18px", marginBottom: "20px", border: "1px solid rgba(255,255,255,0.05)" },
  starRow: { display: "flex", gap: "6px", margin: "10px 0", cursor: "pointer" },
  star: { fontSize: "1.6rem", transition: "color 0.1s" },
  reviewInput: { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "10px 14px", color: "#e0eaf0", fontSize: "0.88rem", outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", marginBottom: "10px" },
  reviewSubmit: { padding: "10px 22px", background: "linear-gradient(135deg, #00ffc8, #00d9aa)", border: "none", borderRadius: "10px", color: "#041014", fontWeight: "800", cursor: "pointer" },
  reviewsList: { display: "flex", flexDirection: "column", gap: "12px" },
  reviewCard: { padding: "14px 16px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" },
  reviewHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" },
  reviewerName: { fontWeight: "700", fontSize: "0.88rem", color: "#c0d0dc" },
  reviewStars: { display: "flex", gap: "2px" },
  reviewBody: { color: "#6a8090", fontSize: "0.86rem", lineHeight: 1.5, margin: 0 },
};

export default CoursePlayer;