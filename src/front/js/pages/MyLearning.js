// =============================================================================
// MyLearning.js — Enrolled Courses Dashboard
// =============================================================================
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

const MyLearning = () => {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetch(`${BACKEND_URL}/api/academy/my-enrollments`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { setEnrollments(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const totalCompleted  = enrollments.filter((e) => e.progress_pct === 100).length;
  const totalInProgress = enrollments.filter((e) => e.progress_pct > 0 && e.progress_pct < 100).length;
  const avgProgress     = enrollments.length > 0
    ? Math.round(enrollments.reduce((s, e) => s + (e.progress_pct || 0), 0) / enrollments.length)
    : 0;

  const filtered = enrollments.filter((e) => {
    if (filter === "completed")   return e.progress_pct === 100;
    if (filter === "in-progress") return e.progress_pct > 0 && e.progress_pct < 100;
    return true;
  });

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>📚 My Learning</h1>
          <p style={S.subtitle}>Track your progress across all enrolled courses</p>
        </div>
        <button style={S.browseBtn} onClick={() => navigate("/creator-academy")}>🎓 Browse Courses</button>
      </div>

      {!loading && enrollments.length > 0 && (
        <div style={S.statsBar}>
          {[
            { num: enrollments.length, label: "Enrolled" },
            { num: totalCompleted,     label: "Completed" },
            { num: totalInProgress,    label: "In Progress" },
            { num: `${avgProgress}%`,  label: "Avg Progress" },
          ].map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div style={S.statDivider} />}
              <div style={S.stat}>
                <span style={S.statNum}>{s.num}</span>
                <span style={S.statLabel}>{s.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      )}

      {!loading && enrollments.length > 0 && (
        <div style={S.filterRow}>
          {[
            { id: "all",         label: `All (${enrollments.length})` },
            { id: "in-progress", label: `In Progress (${totalInProgress})` },
            { id: "completed",   label: `Completed (${totalCompleted})` },
          ].map((f) => (
            <button key={f.id}
              style={{ ...S.filterBtn, ...(filter === f.id ? S.filterBtnActive : {}) }}
              onClick={() => setFilter(f.id)}
            >{f.label}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={S.loadingGrid}>{Array.from({ length: 6 }).map((_, i) => <div key={i} style={S.skeleton} />)}</div>
      ) : enrollments.length === 0 ? (
        <div style={S.empty}>
          <div style={{ fontSize: "4rem", marginBottom: "16px" }}>🎓</div>
          <h2 style={S.emptyTitle}>No courses yet</h2>
          <p style={S.emptySub}>Browse the Creator Academy and enroll in your first course.</p>
          <button style={S.browseBtn} onClick={() => navigate("/creator-academy")}>Browse Courses →</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={S.empty}><p style={S.emptySub}>No courses match this filter.</p></div>
      ) : (
        <div style={S.grid}>
          {filtered.map((enrollment) => (
            <EnrollmentCard key={enrollment.id} enrollment={enrollment} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
};

const EnrollmentCard = ({ enrollment, navigate }) => {
  const course = enrollment.course || {};
  const pct = enrollment.progress_pct || 0;
  const isComplete = pct === 100;
  const CATEGORY_COLORS = {
    "music-production": "#7b61ff", "beat-making": "#FF6600", "podcasting": "#00ffc8",
    "mixing-mastering": "#4a9eff", "live-streaming": "#ff3366", "video-editing": "#ff9f00",
    "music-business": "#00d4aa",   "songwriting": "#e040fb",  "branding": "#ff6680",
  };
  const catColor = CATEGORY_COLORS[course.category] || "#00ffc8";

  return (
    <div style={S.card}
      onClick={() => navigate(`/course/${enrollment.course_id}`)}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ ...S.thumb, background: course.thumbnail_url ? `url(${course.thumbnail_url}) center/cover` : `linear-gradient(135deg, ${catColor}22, ${catColor}08)` }}>
        {!course.thumbnail_url && <span style={{ fontSize: "2.8rem", color: catColor }}>🎓</span>}
        {isComplete && <div style={S.completeBadge}>✓ Complete</div>}
      </div>
      <div style={S.cardBody}>
        <h3 style={S.cardTitle}>{course.title || "Untitled Course"}</h3>
        <div style={S.cardCreator}>by {course.creator_name || "Creator"}</div>
        {course.lesson_count > 0 && <div style={S.lessonCount}>{course.lesson_count} lessons</div>}
        <div style={S.progressWrap}>
          <div style={S.progressTrack}>
            <div style={{ ...S.progressFill, width: `${pct}%`, background: isComplete ? "linear-gradient(90deg,#00ffc8,#00d9aa)" : `linear-gradient(90deg,${catColor},${catColor}99)` }} />
          </div>
          <span style={{ ...S.progressPct, color: isComplete ? "#00ffc8" : catColor }}>{pct}%</span>
        </div>
        <div style={S.progressLabel}>
          {isComplete ? "🏆 Course completed!" : pct === 0 ? "Not started yet" : `${pct}% through the course`}
        </div>
      </div>
      <div style={S.cardFoot}>
        <span style={S.enrollDate}>
          {enrollment.enrolled_at ? new Date(enrollment.enrolled_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
        </span>
        <button style={{ ...S.continueBtn, background: isComplete ? "rgba(0,255,200,0.1)" : "linear-gradient(135deg,#00ffc8,#00d9aa)", color: isComplete ? "#00ffc8" : "#041014", border: isComplete ? "1px solid rgba(0,255,200,0.3)" : "none" }}>
          {isComplete ? "Review →" : pct === 0 ? "Start →" : "Continue →"}
        </button>
      </div>
    </div>
  );
};

const S = {
  page:          { background: "#07090f", minHeight: "100vh", color: "#e0eaf0", fontFamily: "system-ui,sans-serif", paddingBottom: "60px" },
  header:        { display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "40px 40px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", flexWrap: "wrap", gap: "16px" },
  title:         { fontSize: "2rem", fontWeight: "900", margin: "0 0 6px", color: "#e0eaf0" },
  subtitle:      { color: "#5a7080", fontSize: "0.95rem", margin: 0 },
  browseBtn:     { padding: "12px 24px", background: "linear-gradient(135deg,#00ffc8,#00d9aa)", border: "none", borderRadius: "12px", color: "#041014", fontWeight: "800", fontSize: "0.9rem", cursor: "pointer" },
  statsBar:      { display: "flex", alignItems: "center", gap: "32px", padding: "20px 40px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.04)", flexWrap: "wrap" },
  stat:          { display: "flex", flexDirection: "column", gap: "2px" },
  statNum:       { fontSize: "1.6rem", fontWeight: "900", color: "#00ffc8", lineHeight: 1 },
  statLabel:     { fontSize: "0.72rem", color: "#4a6070", textTransform: "uppercase", letterSpacing: "0.06em" },
  statDivider:   { width: "1px", height: "36px", background: "rgba(255,255,255,0.06)" },
  filterRow:     { display: "flex", gap: "8px", padding: "16px 40px", borderBottom: "1px solid rgba(255,255,255,0.04)", flexWrap: "wrap" },
  filterBtn:     { padding: "8px 18px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "999px", color: "#6a8090", fontSize: "0.82rem", fontWeight: "700", cursor: "pointer" },
  filterBtnActive: { background: "rgba(0,255,200,0.1)", borderColor: "rgba(0,255,200,0.28)", color: "#00ffc8" },
  grid:          { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: "20px", padding: "28px 40px" },
  loadingGrid:   { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: "20px", padding: "28px 40px" },
  skeleton:      { height: "340px", background: "rgba(255,255,255,0.03)", borderRadius: "18px" },
  empty:         { textAlign: "center", padding: "80px 20px", color: "#5a7080" },
  emptyTitle:    { fontSize: "1.4rem", fontWeight: "800", color: "#8090a0", marginBottom: "10px" },
  emptySub:      { fontSize: "0.95rem", marginBottom: "28px", maxWidth: "400px", margin: "0 auto 28px", lineHeight: 1.6 },
  card:          { background: "rgba(14,20,30,0.9)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden", cursor: "pointer", transition: "transform 0.18s", display: "flex", flexDirection: "column" },
  thumb:         { height: "160px", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.02)" },
  completeBadge: { position: "absolute", top: "10px", right: "10px", background: "linear-gradient(135deg,#00ffc8,#00d9aa)", color: "#041014", fontWeight: "900", fontSize: "0.72rem", padding: "4px 12px", borderRadius: "999px" },
  cardBody:      { flex: 1, padding: "16px 18px 10px" },
  cardTitle:     { fontSize: "1rem", fontWeight: "800", margin: "0 0 4px", lineHeight: 1.35, color: "#e0eaf0" },
  cardCreator:   { color: "#4a6070", fontSize: "0.78rem", marginBottom: "6px" },
  lessonCount:   { color: "#5a7080", fontSize: "0.76rem", marginBottom: "12px" },
  progressWrap:  { display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" },
  progressTrack: { flex: 1, height: "7px", background: "rgba(255,255,255,0.07)", borderRadius: "999px", overflow: "hidden" },
  progressFill:  { height: "100%", borderRadius: "999px", transition: "width 0.4s ease" },
  progressPct:   { fontSize: "0.8rem", fontWeight: "800", minWidth: "36px", textAlign: "right" },
  progressLabel: { fontSize: "0.74rem", color: "#4a6070" },
  cardFoot:      { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderTop: "1px solid rgba(255,255,255,0.04)" },
  enrollDate:    { fontSize: "0.74rem", color: "#3a5060" },
  continueBtn:   { padding: "8px 18px", border: "none", borderRadius: "8px", fontWeight: "800", fontSize: "0.82rem", cursor: "pointer" },
};

export default MyLearning;
