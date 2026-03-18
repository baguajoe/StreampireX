// =============================================================================
// CourseBuilder.js — Creator: Build + Publish Courses
// =============================================================================
// Location: src/front/js/pages/CourseBuilder.js
// Route: /course-builder  and  /course-builder/:courseId
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import AILessonTools from "../component/AILessonTools";
import { useParams, useNavigate } from "react-router-dom";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const CATEGORIES = [
  "music-production","beat-making","podcasting","mixing-mastering",
  "live-streaming","video-editing","content-strategy","music-business",
  "songwriting","social-media","distribution","branding",
];

const CourseBuilder = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const isEdit = !!courseId;

  // ── Course state ──
  const [title, setTitle]         = useState("");
  const [description, setDesc]    = useState("");
  const [category, setCategory]   = useState("music-production");
  const [price, setPrice]         = useState(0);
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbUrl, setThumbUrl]   = useState("");
  const [tags, setTags]           = useState([]);
  const [tagInput, setTagInput]   = useState("");
  const [published, setPublished] = useState(false);

  // ── Lesson state ──
  const [lessons, setLessons]       = useState([]);
  const [addingLesson, setAdding]   = useState(false);
  const [editLesson, setEditLesson] = useState(null);
  const [lessonTitle, setLTitle]    = useState("");
  const [lessonDesc, setLDesc]      = useState("");
  const [lessonType, setLType]      = useState("video");
  const [lessonFree, setLFree]      = useState(false);
  const [lessonText, setLText]      = useState("");
  const [lessonVideo, setLVideo]    = useState(null);
  const [uploadingVideo, setUploadV]= useState(false);

  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [tab, setTab]         = useState("info"); // info | lessons | pricing | publish

  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  useEffect(() => {
    if (isEdit) loadCourse();
  }, [courseId]);

  const loadCourse = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/academy/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTitle(data.title); setDesc(data.description); setCategory(data.category);
        setPrice(data.price); setThumbUrl(data.thumbnail_url || ""); setTags(data.tags || []);
        setPublished(data.published); setLessons(data.lessons || []);
      }
    } catch (e) {}
  };

  // ── Save course meta ──
  const saveCourse = useCallback(async () => {
    setSaving(true);
    const payload = { title, description, category, price: parseFloat(price), tags, published };
    try {
      let res, data;
      if (isEdit) {
        res = await fetch(`${BACKEND_URL}/api/academy/courses/${courseId}`, {
          method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${BACKEND_URL}/api/academy/courses`, {
          method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (res?.ok) {
        data = await res.json();
        if (!isEdit) navigate(`/course-builder/${data.id}`, { replace: true });
        setSaved(true); setTimeout(() => setSaved(false), 2500);
      }
    } catch (e) {}
    setSaving(false);
  }, [title, description, category, price, tags, published, isEdit, courseId, token, navigate]);

  // ── Thumbnail upload ──
  const handleThumb = async (file) => {
    if (!file || !isEdit) { setThumbnail(file); return; }
    const fd = new FormData(); fd.append("thumbnail", file);
    try {
      const res = await fetch(`${BACKEND_URL}/api/academy/courses/${courseId}/thumbnail`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      if (res.ok) { const d = await res.json(); setThumbUrl(d.thumbnail_url); }
    } catch (e) {}
  };

  // ── Lesson ops ──
  const openAddLesson = () => {
    setLTitle(""); setLDesc(""); setLType("video"); setLFree(false); setLText(""); setLVideo(null); setEditLesson(null); setAdding(true);
  };

  const saveLesson = async () => {
    if (!isEdit) return;
    const payload = { title: lessonTitle, description: lessonDesc, content_type: lessonType, is_free_preview: lessonFree, text_content: lessonText };
    try {
      let res;
      if (editLesson) {
        res = await fetch(`${BACKEND_URL}/api/academy/lessons/${editLesson.id}`, {
          method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${BACKEND_URL}/api/academy/courses/${courseId}/lessons`, {
          method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
      }
      if (res?.ok) {
        const lesson = await res.json();
        if (lessonVideo) {
          setUploadV(true);
          const fd = new FormData(); fd.append("video", lessonVideo);
          await fetch(`${BACKEND_URL}/api/academy/lessons/${lesson.id}/video`, {
            method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
          });
          setUploadV(false);
        }
        loadCourse();
        setAdding(false); setEditLesson(null);
      }
    } catch (e) {
      // Optimistic local update
      if (editLesson) {
        setLessons((prev) => prev.map((l) => l.id === editLesson.id ? { ...l, title: lessonTitle, description: lessonDesc, content_type: lessonType, is_free_preview: lessonFree } : l));
      } else {
        setLessons((prev) => [...prev, { id: Date.now(), title: lessonTitle, description: lessonDesc, content_type: lessonType, is_free_preview: lessonFree, order: prev.length + 1 }]);
      }
      setAdding(false); setEditLesson(null);
    }
  };

  const deleteLesson = async (id) => {
    try {
      await fetch(`${BACKEND_URL}/api/academy/lessons/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    } catch (e) {}
    setLessons((prev) => prev.filter((l) => l.id !== id));
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const totalDuration = lessons.reduce((sum, l) => sum + (l.duration_secs || 0), 0);
  const fmtDuration = (s) => s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s/60)}m` : `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;

  const TABS = [
    { id: "info", label: "📋 Course Info" },
    { id: "lessons", label: "🎬 Lessons" },
    { id: "pricing", label: "💰 Pricing" },
    { id: "publish", label: "🚀 Publish" },
  ];

  return (
    <div style={CB.page}>
      {/* Header */}
      <div style={CB.header}>
        <div style={CB.headerLeft}>
          <button style={CB.backBtn} onClick={() => navigate("/creator-academy")}>← Academy</button>
          <div>
            <h1 style={CB.headerTitle}>{isEdit ? "Edit Course" : "New Course"}</h1>
            {title && <p style={CB.headerSub}>{title}</p>}
          </div>
        </div>
        <div style={CB.headerRight}>
          {published && <span style={CB.liveBadge}>🟢 Published</span>}
          <button style={CB.saveBtn} onClick={saveCourse} disabled={saving}>
            {saved ? "✅ Saved!" : saving ? "Saving..." : "💾 Save"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={CB.tabs}>
        {TABS.map((t) => (
          <button key={t.id} style={{ ...CB.tab, ...(tab === t.id ? CB.tabActive : {}) }} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={CB.body}>
        {/* ── INFO TAB ── */}
        {tab === "info" && (
          <div style={CB.form}>
            <div style={CB.field}>
              <label style={CB.label}>Course Title *</label>
              <input style={CB.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Complete Beat Making Masterclass" />
            </div>
            <div style={CB.field}>
              <label style={CB.label}>Description</label>
              <textarea style={CB.textarea} value={description} onChange={(e) => setDesc(e.target.value)} rows={5} placeholder="What will students learn? What makes this course unique?" />
            </div>
            <div style={CB.row}>
              <div style={CB.field}>
                <label style={CB.label}>Category</label>
                <select style={CB.select} value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/-/g, " ")}</option>)}
                </select>
              </div>
            </div>
            <div style={CB.field}>
              <label style={CB.label}>Tags</label>
              <div style={CB.tagRow}>
                {tags.map((t) => (
                  <span key={t} style={CB.tag}>
                    {t} <button style={CB.tagRemove} onClick={() => setTags(tags.filter((x) => x !== t))}>×</button>
                  </span>
                ))}
                <input style={{ ...CB.input, flex: 1, minWidth: "120px" }} value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  placeholder="Add tag, press Enter" />
                <button style={CB.addTagBtn} onClick={addTag}>+</button>
              </div>
            </div>
            <div style={CB.field}>
              <label style={CB.label}>Thumbnail</label>
              {thumbUrl ? (
                <div style={CB.thumbPreview}>
                  <img src={thumbUrl} alt="thumbnail" style={CB.thumbImg} />
                  <button style={CB.thumbRemove} onClick={() => setThumbUrl("")}>✕ Remove</button>
                </div>
              ) : (
                <label style={CB.dropZone}>
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) { setThumbUrl(URL.createObjectURL(f)); handleThumb(f); } }} />
                  <span style={CB.dropIcon}>🖼️</span>
                  <span style={CB.dropText}>Click to upload thumbnail</span>
                  <span style={CB.dropHint}>1280×720px recommended</span>
                </label>
              )}
            </div>
          </div>
        )}

        {/* ── LESSONS TAB ── */}
        {tab === "lessons" && (
          <div>
            <div style={CB.lessonHeader}>
              <div>
                <h3 style={CB.sectionTitle}>Course Curriculum</h3>
                <AILessonTools token={token} lessons={lessons} onAttached={loadCourse} />
                <p style={CB.sectionSub}>{lessons.length} lessons · {fmtDuration(totalDuration)} total</p>
              </div>
              <button style={CB.addLessonBtn} onClick={openAddLesson}>+ Add Lesson</button>
            </div>

            {lessons.length === 0 ? (
              <div style={CB.lessonEmpty}>
                <span>🎬</span>
                <p>No lessons yet. Add your first lesson to get started.</p>
              </div>
            ) : (
              <div style={CB.lessonList}>
                {[...lessons].sort((a, b) => a.order - b.order).map((lesson, i) => (
                  <div key={lesson.id} style={CB.lessonRow}>
                    <span style={CB.lessonNum}>{i + 1}</span>
                    <div style={CB.lessonInfo}>
                      <span style={CB.lessonTitle}>{lesson.title}</span>
                      <div style={CB.lessonMeta}>
                        <span style={{ ...CB.lessonTypeBadge, background: lesson.content_type === "video" ? "rgba(74,158,255,0.12)" : "rgba(0,255,200,0.1)", color: lesson.content_type === "video" ? "#4a9eff" : "#00ffc8" }}>{lesson.content_type}</span>
                        {lesson.is_free_preview && <span style={CB.freeBadge}>Free Preview</span>}
                        {lesson.duration_secs > 0 && <span style={CB.lessonDur}>{fmtDuration(lesson.duration_secs)}</span>}
                      </div>
                    </div>
                    <div style={CB.lessonActions}>
                      <button style={CB.iconBtn} onClick={() => { setEditLesson(lesson); setLTitle(lesson.title); setLDesc(lesson.description || ""); setLType(lesson.content_type || "video"); setLFree(lesson.is_free_preview || false); setLText(lesson.text_content || ""); setAdding(true); }}>✏️</button>
                      <button style={{ ...CB.iconBtn, ...CB.iconBtnDanger }} onClick={() => deleteLesson(lesson.id)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add/Edit lesson panel */}
            {addingLesson && (
              <div style={CB.lessonPanel}>
                <h4 style={CB.panelTitle}>{editLesson ? "Edit Lesson" : "Add Lesson"}</h4>
                <div style={CB.form}>
                  <div style={CB.field}>
                    <label style={CB.label}>Lesson Title *</label>
                    <input style={CB.input} value={lessonTitle} onChange={(e) => setLTitle(e.target.value)} placeholder="e.g. Intro to drum patterns" />
                  </div>
                  <div style={CB.field}>
                    <label style={CB.label}>Description</label>
                    <input style={CB.input} value={lessonDesc} onChange={(e) => setLDesc(e.target.value)} placeholder="Brief lesson overview" />
                  </div>
                  <div style={CB.row}>
                    <div style={CB.field}>
                      <label style={CB.label}>Content Type</label>
                      <select style={CB.select} value={lessonType} onChange={(e) => setLType(e.target.value)}>
                        <option value="video">📹 Video</option>
                        <option value="audio">🎧 Audio</option>
                        <option value="text">📄 Text / Article</option>
                      </select>
                    </div>
                    <div style={CB.field}>
                      <label style={CB.label}>Free Preview?</label>
                      <select style={CB.select} value={lessonFree ? "yes" : "no"} onChange={(e) => setLFree(e.target.value === "yes")}>
                        <option value="no">🔒 Paid only</option>
                        <option value="yes">🆓 Free preview</option>
                      </select>
                    </div>
                  </div>
                  {lessonType === "text" && (
                    <div style={CB.field}>
                      <label style={CB.label}>Content</label>
                      <textarea style={CB.textarea} value={lessonText} onChange={(e) => setLText(e.target.value)} rows={8} placeholder="Write your lesson content here..." />
                    </div>
                  )}
                  {(lessonType === "video" || lessonType === "audio") && (
                    <div style={CB.field}>
                      <label style={CB.label}>Upload File</label>
                      <label style={CB.dropZone}>
                        <input type="file" accept={lessonType === "video" ? "video/*" : "audio/*"} style={{ display: "none" }} onChange={(e) => setLVideo(e.target.files?.[0])} />
                        <span>{lessonVideo ? `✅ ${lessonVideo.name}` : `Upload ${lessonType}`}</span>
                      </label>
                    </div>
                  )}
                  <div style={CB.panelActions}>
                    <button style={CB.cancelBtn} onClick={() => { setAdding(false); setEditLesson(null); }}>Cancel</button>
                    <button style={CB.saveBtn} onClick={saveLesson} disabled={!lessonTitle || uploadingVideo}>
                      {uploadingVideo ? "Uploading..." : editLesson ? "Update Lesson" : "Add Lesson"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PRICING TAB ── */}
        {tab === "pricing" && (
          <div style={CB.form}>
            <div style={CB.pricingHero}>
              <h3 style={CB.sectionTitle}>Set Your Price</h3>
              <p style={CB.sectionSub}>You keep <strong style={{ color: "#00ffc8" }}>90%</strong> of every sale. StreamPireX takes 10%.</p>
            </div>
            <div style={CB.priceOptions}>
              <button style={{ ...CB.priceOpt, ...(price === 0 ? CB.priceOptActive : {}) }} onClick={() => setPrice(0)}>
                <span style={CB.priceOptIcon}>🆓</span>
                <span style={CB.priceOptLabel}>Free</span>
                <span style={CB.priceOptDesc}>Build your audience</span>
              </button>
              {[9.99, 19.99, 29.99, 39.99, 49.99, 79.99, 99.99].map((p) => (
                <button key={p} style={{ ...CB.priceOpt, ...(price === p ? CB.priceOptActive : {}) }} onClick={() => setPrice(p)}>
                  <span style={CB.priceOptIcon}>💰</span>
                  <span style={CB.priceOptLabel}>${p}</span>
                  <span style={CB.priceOptDesc}>You earn ${(p * 0.9).toFixed(2)}</span>
                </button>
              ))}
            </div>
            <div style={CB.field}>
              <label style={CB.label}>Custom Price</label>
              <div style={CB.priceInputWrap}>
                <span style={CB.priceDollar}>$</span>
                <input style={{ ...CB.input, paddingLeft: "32px" }} type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} />
              </div>
              {price > 0 && <p style={CB.earningsLine}>You earn <strong style={{ color: "#00ffc8" }}>${(price * 0.9).toFixed(2)}</strong> per sale</p>}
            </div>
          </div>
        )}

        {/* ── PUBLISH TAB ── */}
        {tab === "publish" && (
          <div style={CB.form}>
            <div style={CB.publishCheck}>
              {[
                { ok: !!title, label: "Course title" },
                { ok: !!description, label: "Course description" },
                { ok: !!category, label: "Category selected" },
                { ok: !!thumbUrl, label: "Thumbnail uploaded" },
                { ok: lessons.length > 0, label: "At least 1 lesson" },
              ].map(({ ok, label }) => (
                <div key={label} style={CB.checkRow}>
                  <span style={{ color: ok ? "#00ffc8" : "#ff4444" }}>{ok ? "✅" : "❌"}</span>
                  <span style={{ color: ok ? "#c0d0dc" : "#6a8090" }}>{label}</span>
                </div>
              ))}
            </div>
            <div style={CB.publishToggle}>
              <div>
                <h4 style={{ margin: "0 0 4px", color: "#e0eaf0" }}>Published</h4>
                <p style={{ margin: 0, color: "#4a6070", fontSize: "0.82rem" }}>{published ? "Your course is live on the marketplace" : "Save as draft — not visible to students"}</p>
              </div>
              <button
                style={{ ...CB.toggle, ...(published ? CB.toggleOn : {}) }}
                onClick={() => setPublished(!published)}
              >
                <div style={{ ...CB.toggleDot, ...(published ? CB.toggleDotOn : {}) }} />
              </button>
            </div>
            <button style={CB.publishBtn} onClick={saveCourse} disabled={saving}>
              {published ? (saved ? "✅ Course is Live!" : "🚀 Save & Publish") : "💾 Save Draft"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const CB = {
  page: { background: "#07090f", minHeight: "100vh", color: "#e0eaf0", fontFamily: "system-ui, sans-serif", paddingBottom: "60px" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 40px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(10,16,24,0.8)" },
  headerLeft: { display: "flex", alignItems: "center", gap: "20px" },
  backBtn: { background: "none", border: "none", color: "#4a6070", fontSize: "0.88rem", cursor: "pointer" },
  headerTitle: { fontSize: "1.3rem", fontWeight: "900", margin: 0 },
  headerSub: { color: "#4a6070", fontSize: "0.82rem", margin: "2px 0 0" },
  headerRight: { display: "flex", alignItems: "center", gap: "12px" },
  liveBadge: { padding: "5px 14px", background: "rgba(0,255,200,0.1)", color: "#00ffc8", borderRadius: "999px", fontSize: "0.78rem", fontWeight: "700" },
  saveBtn: { padding: "11px 24px", background: "linear-gradient(135deg, #00ffc8, #00d9aa)", border: "none", borderRadius: "10px", color: "#041014", fontWeight: "800", fontSize: "0.88rem", cursor: "pointer" },
  tabs: { display: "flex", gap: "4px", padding: "12px 40px", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  tab: { padding: "9px 18px", background: "none", border: "none", color: "#5a7080", fontSize: "0.88rem", fontWeight: "700", cursor: "pointer", borderRadius: "8px" },
  tabActive: { background: "rgba(0,255,200,0.1)", color: "#00ffc8" },
  body: { padding: "28px 40px", maxWidth: "760px" },
  form: { display: "flex", flexDirection: "column", gap: "20px" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  field: { display: "flex", flexDirection: "column", gap: "7px" },
  label: { color: "#4a6070", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: "700" },
  input: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "11px 14px", color: "#e0eaf0", fontSize: "0.9rem", outline: "none" },
  textarea: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "11px 14px", color: "#e0eaf0", fontSize: "0.9rem", outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 },
  select: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "11px 14px", color: "#e0eaf0", fontSize: "0.9rem", outline: "none" },
  tagRow: { display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" },
  tag: { padding: "4px 10px", background: "rgba(0,255,200,0.08)", border: "1px solid rgba(0,255,200,0.18)", borderRadius: "999px", color: "#00d9aa", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "4px" },
  tagRemove: { background: "none", border: "none", color: "#00d9aa", cursor: "pointer", fontSize: "0.9rem", lineHeight: 1 },
  addTagBtn: { padding: "8px 14px", background: "rgba(0,255,200,0.1)", border: "1px solid rgba(0,255,200,0.2)", borderRadius: "8px", color: "#00ffc8", fontWeight: "700", cursor: "pointer" },
  dropZone: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", border: "2px dashed rgba(255,255,255,0.08)", borderRadius: "12px", cursor: "pointer", gap: "6px" },
  dropIcon: { fontSize: "1.8rem" },
  dropText: { color: "#8090a0", fontSize: "0.86rem", fontWeight: "600" },
  dropHint: { color: "#3a5060", fontSize: "0.74rem" },
  thumbPreview: { display: "flex", alignItems: "center", gap: "12px" },
  thumbImg: { width: "120px", height: "68px", objectFit: "cover", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" },
  thumbRemove: { padding: "6px 12px", background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.18)", borderRadius: "8px", color: "#ff8090", fontSize: "0.78rem", cursor: "pointer" },
  lessonHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  sectionTitle: { fontSize: "1.1rem", fontWeight: "800", margin: "0 0 4px" },
  sectionSub: { color: "#4a6070", fontSize: "0.8rem", margin: 0 },
  addLessonBtn: { padding: "10px 20px", background: "rgba(0,255,200,0.1)", border: "1px solid rgba(0,255,200,0.24)", borderRadius: "10px", color: "#00ffc8", fontWeight: "700", fontSize: "0.86rem", cursor: "pointer" },
  lessonEmpty: { textAlign: "center", padding: "40px", color: "#3a5060", fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" },
  lessonList: { display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" },
  lessonRow: { display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px" },
  lessonNum: { width: "24px", height: "24px", background: "rgba(255,255,255,0.06)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.74rem", fontWeight: "700", color: "#6a8090", flexShrink: 0 },
  lessonInfo: { flex: 1 },
  lessonTitle: { color: "#c0d0dc", fontWeight: "600", fontSize: "0.9rem" },
  lessonMeta: { display: "flex", gap: "8px", marginTop: "4px", flexWrap: "wrap" },
  lessonTypeBadge: { padding: "2px 8px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: "700" },
  freeBadge: { padding: "2px 8px", background: "rgba(0,255,200,0.08)", color: "#00d9aa", borderRadius: "4px", fontSize: "0.7rem", fontWeight: "700" },
  lessonDur: { color: "#4a6070", fontSize: "0.72rem" },
  lessonActions: { display: "flex", gap: "6px" },
  iconBtn: { padding: "6px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem" },
  iconBtnDanger: { background: "rgba(255,68,68,0.06)", borderColor: "rgba(255,68,68,0.12)" },
  lessonPanel: { background: "rgba(0,255,200,0.03)", border: "1px solid rgba(0,255,200,0.1)", borderRadius: "14px", padding: "20px", marginTop: "12px" },
  panelTitle: { color: "#00ffc8", fontWeight: "800", margin: "0 0 16px", fontSize: "0.95rem" },
  panelActions: { display: "flex", gap: "10px", justifyContent: "flex-end" },
  cancelBtn: { padding: "10px 20px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#6a8090", fontWeight: "700", cursor: "pointer" },
  pricingHero: { padding: "16px", background: "rgba(0,255,200,0.04)", borderRadius: "12px", border: "1px solid rgba(0,255,200,0.1)" },
  priceOptions: { display: "flex", flexWrap: "wrap", gap: "10px" },
  priceOpt: { padding: "12px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", minWidth: "88px", transition: "all 0.18s" },
  priceOptActive: { background: "rgba(0,255,200,0.1)", borderColor: "rgba(0,255,200,0.3)" },
  priceOptIcon: { fontSize: "1.2rem" },
  priceOptLabel: { color: "#e0eaf0", fontWeight: "800", fontSize: "0.88rem" },
  priceOptDesc: { color: "#4a6070", fontSize: "0.68rem" },
  priceInputWrap: { position: "relative" },
  priceDollar: { position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#6a8090", fontSize: "0.9rem" },
  earningsLine: { color: "#4a6070", fontSize: "0.82rem", margin: "4px 0 0" },
  publishCheck: { display: "flex", flexDirection: "column", gap: "10px", padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", marginBottom: "16px" },
  checkRow: { display: "flex", gap: "10px", alignItems: "center", fontSize: "0.88rem" },
  publishToggle: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "12px" },
  toggle: { width: "44px", height: "24px", background: "rgba(255,255,255,0.1)", borderRadius: "999px", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s" },
  toggleOn: { background: "rgba(0,255,200,0.4)" },
  toggleDot: { position: "absolute", top: "3px", left: "3px", width: "18px", height: "18px", background: "#fff", borderRadius: "50%", transition: "left 0.2s" },
  toggleDotOn: { left: "23px" },
  publishBtn: { padding: "15px", background: "linear-gradient(135deg, #00ffc8, #00d9aa)", border: "none", borderRadius: "12px", color: "#041014", fontWeight: "900", fontSize: "1rem", cursor: "pointer", width: "100%" },
};

export default CourseBuilder;