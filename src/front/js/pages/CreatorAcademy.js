// =============================================================================
// CreatorAcademy.js — Marketplace / Browse Page
// =============================================================================
// Location: src/front/js/pages/CreatorAcademy.js
// Route: /creator-academy
// =============================================================================

import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";

const CATEGORIES = [
  { id: "",                  label: "All",               icon: "🌟" },
  { id: "music-production",  label: "Music Production",  icon: "🎹" },
  { id: "podcasting",        label: "Podcasting",        icon: "🎙️" },
  { id: "beat-making",       label: "Beat Making",       icon: "🥁" },
  { id: "mixing-mastering",  label: "Mixing & Mastering",icon: "🎚️" },
  { id: "live-streaming",    label: "Live Streaming",    icon: "📡" },
  { id: "video-editing",     label: "Video Editing",     icon: "🎬" },
  { id: "content-strategy",  label: "Content Strategy",  icon: "📱" },
  { id: "music-business",    label: "Music Business",    icon: "💰" },
  { id: "songwriting",       label: "Songwriting",       icon: "✍️" },
  { id: "branding",          label: "Artist Branding",   icon: "🎨" },
];

const SORTS = [
  { id: "newest",     label: "Newest" },
  { id: "popular",    label: "Most Popular" },
  { id: "free",       label: "Free Only" },
  { id: "price_asc",  label: "Price: Low–High" },
  { id: "price_desc", label: "Price: High–Low" },
];

const MOCK_COURSES = [
  { id: 1, title: "Complete Beat Making with StreamPireX", creator_name: "BeatMaestro", category: "beat-making", price: 29.99, enrollment_count: 1240, avg_rating: 4.8, review_count: 89, lesson_count: 24, thumbnail_url: "", tags: ["beginner", "fl studio", "hip hop"], published: true },
  { id: 2, title: "Launch Your Podcast in 7 Days", creator_name: "PodPro", category: "podcasting", price: 0, enrollment_count: 3100, avg_rating: 4.6, review_count: 204, lesson_count: 14, thumbnail_url: "", tags: ["free", "beginner", "podcast"], published: true },
  { id: 3, title: "Mixing & Mastering Masterclass", creator_name: "StudioGuru", category: "mixing-mastering", price: 49.99, enrollment_count: 780, avg_rating: 4.9, review_count: 67, lesson_count: 32, thumbnail_url: "", tags: ["advanced", "mixing", "mastering"], published: true },
  { id: 4, title: "Music Business 101: Get Paid for Your Art", creator_name: "IndustryInsider", category: "music-business", price: 39.99, enrollment_count: 520, avg_rating: 4.7, review_count: 45, lesson_count: 18, thumbnail_url: "", tags: ["business", "royalties", "distribution"], published: true },
  { id: 5, title: "Live Streaming for Creators", creator_name: "StreamQueen", category: "live-streaming", price: 19.99, enrollment_count: 960, avg_rating: 4.5, review_count: 71, lesson_count: 12, thumbnail_url: "", tags: ["streaming", "obs", "engagement"], published: true },
  { id: 6, title: "Songwriting from Scratch", creator_name: "LyricSmith", category: "songwriting", price: 0, enrollment_count: 2200, avg_rating: 4.4, review_count: 130, lesson_count: 16, thumbnail_url: "", tags: ["free", "songwriting", "beginner"], published: true },
  { id: 7, title: "Pro Music Production in the Browser", creator_name: "WebDAWKing", category: "music-production", price: 34.99, enrollment_count: 670, avg_rating: 4.7, review_count: 52, lesson_count: 28, thumbnail_url: "", tags: ["browser", "intermediate", "daw"], published: true },
  { id: 8, title: "Artist Branding: Build Your Identity", creator_name: "BrandBuildr", category: "branding", price: 24.99, enrollment_count: 430, avg_rating: 4.6, review_count: 38, lesson_count: 10, thumbnail_url: "", tags: ["branding", "design", "social media"], published: true },
];

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

const CreatorAcademy = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [myEnrollments, setMyEnrollments] = useState([]);

  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, per_page: 12, sort });
      if (category) params.set("category", category);
      if (query) params.set("q", query);
      const res = await fetch(`${BACKEND_URL}/api/academy/courses?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses);
        setTotalPages(data.pages);
        setLoading(false);
        return;
      }
    } catch (e) {}
    // Fallback mock
    let filtered = [...MOCK_COURSES];
    if (category) filtered = filtered.filter((c) => c.category === category);
    if (query) filtered = filtered.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()));
    if (sort === "popular") filtered.sort((a, b) => b.enrollment_count - a.enrollment_count);
    else if (sort === "free") filtered = filtered.filter((c) => c.price === 0);
    else if (sort === "price_asc") filtered.sort((a, b) => a.price - b.price);
    else if (sort === "price_desc") filtered.sort((a, b) => b.price - a.price);
    setCourses(filtered);
    setTotalPages(1);
    setLoading(false);
  }, [category, sort, query, page]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  useEffect(() => {
    if (!token) return;
    fetch(`${BACKEND_URL}/api/academy/my-enrollments`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((d) => setMyEnrollments((d || []).map((e) => e.course_id))).catch(() => {});
  }, [token]);

  const isEnrolled = (id) => myEnrollments.includes(id);

  return (
    <div style={A.page}>
      {/* Hero */}
      <div style={A.hero}>
        <div style={A.heroContent}>
          <div style={A.heroTag}>🎓 Creator Academy</div>
          <h1 style={A.heroTitle}>Learn From Real Creators</h1>
          <p style={A.heroSub}>
            Courses built by working artists, producers & streamers. All revenue goes directly to creators — StreamPireX takes only 10%.
          </p>
          <div style={A.heroActions}>
            <button style={A.heroBtn} onClick={() => navigate("/course-builder")}>
              + Teach a Course
            </button>
            {token && (
              <button style={A.heroBtnOutline} onClick={() => navigate("/my-learning")}>
                My Learning
              </button>
            )}
          </div>
        </div>
        <div style={A.heroStats}>
          <div style={A.heroStat}><span style={A.heroStatNum}>90%</span><span style={A.heroStatLabel}>Creator payout</span></div>
          <div style={A.heroStatDiv} />
          <div style={A.heroStat}><span style={A.heroStatNum}>12</span><span style={A.heroStatLabel}>Categories</span></div>
          <div style={A.heroStatDiv} />
          <div style={A.heroStat}><span style={A.heroStatNum}>∞</span><span style={A.heroStatLabel}>Lifetime access</span></div>
        </div>
      </div>

      {/* Category tabs */}
      <div style={A.catStrip}>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            style={{ ...A.catBtn, ...(category === c.id ? A.catBtnActive : {}) }}
            onClick={() => { setCategory(c.id); setPage(1); }}
          >
            <span>{c.icon}</span> {c.label}
          </button>
        ))}
      </div>

      {/* Search + sort */}
      <div style={A.searchBar}>
        <div style={A.searchWrap}>
          <span style={A.searchIcon}>🔍</span>
          <input
            style={A.searchInput}
            placeholder="Search courses..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          />
        </div>
        <div style={A.sortRow}>
          {SORTS.map((s) => (
            <button key={s.id} style={{ ...A.sortBtn, ...(sort === s.id ? A.sortBtnActive : {}) }} onClick={() => setSort(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Course grid */}
      {loading ? (
        <div style={A.loadingGrid}>
          {Array.from({ length: 8 }).map((_, i) => <div key={i} style={A.skeleton} />)}
        </div>
      ) : courses.length === 0 ? (
        <div style={A.empty}>
          <span style={A.emptyIcon}>📚</span>
          <p>No courses found. Be the first to <Link to="/course-builder" style={{ color: "#00ffc8" }}>teach one!</Link></p>
        </div>
      ) : (
        <div style={A.grid}>
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} enrolled={isEnrolled(course.id)} navigate={navigate} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={A.pagination}>
          <button style={A.pageBtn} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
          <span style={A.pageInfo}>{page} / {totalPages}</span>
          <button style={A.pageBtn} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
        </div>
      )}
    </div>
  );
};

// ── Course Card ──
const CourseCard = ({ course, enrolled, navigate }) => {
  const starBar = (n) => Array.from({ length: 5 }).map((_, i) => (
    <span key={i} style={{ color: i < Math.round(n) ? "#FFD700" : "#2a3a48", fontSize: "0.8rem" }}>★</span>
  ));

  const CATEGORY_COLORS = {
    "music-production": "#7b61ff", "beat-making": "#FF6600", "podcasting": "#00ffc8",
    "mixing-mastering": "#4a9eff", "live-streaming": "#ff3366", "video-editing": "#ff9f00",
    "music-business": "#00d4aa", "songwriting": "#e040fb", "branding": "#ff6680",
  };
  const catColor = CATEGORY_COLORS[course.category] || "#00ffc8";

  return (
    <div style={A.card} onClick={() => navigate(`/course/${course.id}`)}>
      {/* Thumbnail */}
      <div style={{ ...A.cardThumb, background: course.thumbnail_url ? `url(${course.thumbnail_url}) center/cover` : `linear-gradient(135deg, ${catColor}22, ${catColor}08)` }}>
        {!course.thumbnail_url && <span style={{ ...A.thumbIcon, color: catColor }}>🎓</span>}
        <div style={{ ...A.catPill, background: catColor + "22", color: catColor }}>
          {CATEGORIES.find((c) => c.id === course.category)?.icon} {course.category?.replace(/-/g, " ")}
        </div>
        {course.price === 0 && <div style={A.freeBadge}>FREE</div>}
        {enrolled && <div style={A.enrolledBadge}>✓ Enrolled</div>}
      </div>

      {/* Body */}
      <div style={A.cardBody}>
        <h3 style={A.cardTitle}>{course.title}</h3>
        <div style={A.cardCreator}>by {course.creator_name}</div>

        <div style={A.cardRating}>
          {starBar(course.avg_rating)}
          <span style={A.ratingNum}>{course.avg_rating?.toFixed(1)}</span>
          <span style={A.ratingCount}>({course.review_count})</span>
        </div>

        <div style={A.cardMeta}>
          <span>{course.lesson_count} lessons</span>
          <span>•</span>
          <span>{course.enrollment_count?.toLocaleString()} students</span>
        </div>

        {course.tags?.slice(0, 3).map((t) => (
          <span key={t} style={A.tag}>{t}</span>
        ))}
      </div>

      {/* Footer */}
      <div style={A.cardFoot}>
        <span style={{ ...A.price, color: course.price === 0 ? "#00ffc8" : "#e0eaf0" }}>
          {course.price === 0 ? "Free" : `$${course.price}`}
        </span>
        <button style={{ ...A.enrollBtn, background: enrolled ? "rgba(0,255,200,0.1)" : "linear-gradient(135deg, #00ffc8, #00d9aa)", color: enrolled ? "#00ffc8" : "#041014" }}>
          {enrolled ? "Continue →" : course.price === 0 ? "Enroll Free" : "Buy Course"}
        </button>
      </div>
    </div>
  );
};

const A = {
  page: { background: "#07090f", minHeight: "100vh", color: "#e0eaf0", fontFamily: "system-ui, sans-serif", paddingBottom: "60px" },
  hero: { padding: "48px 40px 36px", background: "linear-gradient(180deg, rgba(0,255,200,0.05) 0%, transparent 100%)", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  heroContent: { maxWidth: "680px", marginBottom: "28px" },
  heroTag: { display: "inline-block", padding: "4px 14px", background: "rgba(0,255,200,0.1)", color: "#00ffc8", borderRadius: "999px", fontSize: "0.78rem", fontWeight: "700", marginBottom: "14px" },
  heroTitle: { fontSize: "2.4rem", fontWeight: "900", margin: "0 0 12px", lineHeight: 1.15 },
  heroSub: { color: "#5a7080", fontSize: "1rem", lineHeight: 1.6, margin: "0 0 24px" },
  heroActions: { display: "flex", gap: "12px" },
  heroBtn: { padding: "13px 28px", background: "linear-gradient(135deg, #00ffc8, #00d9aa)", border: "none", borderRadius: "12px", color: "#041014", fontWeight: "800", fontSize: "0.95rem", cursor: "pointer" },
  heroBtnOutline: { padding: "13px 24px", background: "transparent", border: "1px solid rgba(0,255,200,0.3)", borderRadius: "12px", color: "#00ffc8", fontWeight: "700", fontSize: "0.9rem", cursor: "pointer" },
  heroStats: { display: "flex", alignItems: "center", gap: "24px" },
  heroStat: { display: "flex", flexDirection: "column", gap: "2px" },
  heroStatNum: { fontSize: "1.8rem", fontWeight: "900", color: "#00ffc8" },
  heroStatLabel: { fontSize: "0.76rem", color: "#4a6070", textTransform: "uppercase", letterSpacing: "0.06em" },
  heroStatDiv: { width: "1px", height: "40px", background: "rgba(255,255,255,0.07)" },
  catStrip: { display: "flex", gap: "8px", overflowX: "auto", padding: "16px 40px", scrollbarWidth: "none", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  catBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "999px", color: "#6a8090", fontSize: "0.82rem", fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.18s" },
  catBtnActive: { background: "rgba(0,255,200,0.1)", borderColor: "rgba(0,255,200,0.28)", color: "#00ffc8" },
  searchBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 40px", gap: "20px", flexWrap: "wrap" },
  searchWrap: { display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "10px 14px", flex: 1, maxWidth: "360px" },
  searchIcon: { fontSize: "1rem" },
  searchInput: { background: "none", border: "none", outline: "none", color: "#e0eaf0", fontSize: "0.9rem", flex: 1 },
  sortRow: { display: "flex", gap: "6px", flexWrap: "wrap" },
  sortBtn: { padding: "7px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", color: "#6a8090", fontSize: "0.78rem", fontWeight: "700", cursor: "pointer" },
  sortBtnActive: { background: "rgba(0,255,200,0.1)", borderColor: "rgba(0,255,200,0.24)", color: "#00ffc8" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px", padding: "24px 40px" },
  loadingGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px", padding: "24px 40px" },
  skeleton: { height: "360px", background: "rgba(255,255,255,0.03)", borderRadius: "18px", animation: "pulse 1.5s ease infinite" },
  empty: { textAlign: "center", padding: "80px 20px", color: "#5a7080", fontSize: "1rem" },
  emptyIcon: { fontSize: "3rem", display: "block", marginBottom: "12px" },
  card: { background: "rgba(14,20,30,0.9)", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden", cursor: "pointer", transition: "transform 0.18s, box-shadow 0.18s", display: "flex", flexDirection: "column" },
  cardThumb: { height: "160px", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.02)" },
  thumbIcon: { fontSize: "2.8rem" },
  catPill: { position: "absolute", bottom: "8px", left: "8px", padding: "3px 10px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: "700", textTransform: "capitalize" },
  freeBadge: { position: "absolute", top: "8px", right: "8px", background: "#00ffc8", color: "#041014", fontWeight: "900", fontSize: "0.72rem", padding: "3px 10px", borderRadius: "999px" },
  enrolledBadge: { position: "absolute", top: "8px", left: "8px", background: "rgba(0,255,200,0.18)", color: "#00ffc8", fontWeight: "800", fontSize: "0.72rem", padding: "3px 10px", borderRadius: "999px" },
  cardBody: { flex: 1, padding: "14px 16px 10px" },
  cardTitle: { fontSize: "0.95rem", fontWeight: "800", margin: "0 0 4px", lineHeight: 1.35, color: "#e0eaf0" },
  cardCreator: { color: "#4a6070", fontSize: "0.78rem", marginBottom: "8px" },
  cardRating: { display: "flex", alignItems: "center", gap: "4px", marginBottom: "6px" },
  ratingNum: { color: "#FFD700", fontWeight: "700", fontSize: "0.82rem" },
  ratingCount: { color: "#4a6070", fontSize: "0.76rem" },
  cardMeta: { color: "#4a6070", fontSize: "0.76rem", display: "flex", gap: "6px", marginBottom: "8px" },
  tag: { display: "inline-block", padding: "2px 8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", fontSize: "0.68rem", color: "#6a8090", marginRight: "4px", marginBottom: "4px" },
  cardFoot: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.04)" },
  price: { fontWeight: "900", fontSize: "1rem" },
  enrollBtn: { padding: "8px 16px", border: "none", borderRadius: "8px", fontWeight: "800", fontSize: "0.8rem", cursor: "pointer" },
  pagination: { display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", padding: "24px" },
  pageBtn: { padding: "10px 20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", color: "#8090a0", fontWeight: "700", cursor: "pointer", fontSize: "0.88rem" },
  pageInfo: { color: "#5a7080", fontSize: "0.88rem" },
};

export default CreatorAcademy;