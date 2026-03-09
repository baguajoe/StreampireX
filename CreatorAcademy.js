/**
 * CreatorAcademy.js
 * StreamPireX — Creator Academy (closes LANDR 200+ courses gap)
 *
 * Features:
 *  - 18 courses across 8 categories: Production, Mixing, Mastering, Theory,
 *    Distribution, Marketing, Equipment, Business
 *  - Progress tracking per course
 *  - Skill level filter: Beginner / Intermediate / Advanced
 *  - Free lessons for all tiers + premium for Creator/Pro
 *  - Search across all courses
 *  - Featured + New badges
 *  - Course detail modal with lesson list
 *
 * Route: /academy
 * Integration: <Route path="/academy" element={<CreatorAcademy />} />
 */

import React, { useState, useMemo } from 'react';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { id:'all',          label:'All',          icon:'📚' },
  { id:'production',   label:'Production',   icon:'🎛' },
  { id:'mixing',       label:'Mixing',       icon:'🎚' },
  { id:'mastering',    label:'Mastering',    icon:'💿' },
  { id:'theory',       label:'Music Theory', icon:'♩'  },
  { id:'distribution', label:'Distribution', icon:'🚀' },
  { id:'marketing',    label:'Marketing',    icon:'📣' },
  { id:'equipment',    label:'Equipment',    icon:'🎙' },
  { id:'business',     label:'Business',     icon:'💼' },
];

const LEVELS = ['All Levels','Beginner','Intermediate','Advanced'];

const COURSES = [
  { id:'c1',  category:'production',   title:'Beat Making Fundamentals',           instructor:'DJ ProduceIt',     level:'Beginner',     lessonCount:12, duration:'2h 30m', free:true,  featured:true,  isNew:false, color:'#00ffc8', progress:0,
    description:'Learn to build professional beats from scratch using the StreamPireX Beat Maker.',
    lessons:['Intro to the Beat Maker','Loading Drum Kits','Programming Patterns','Working with 808s','Adding Melody Loops','Arrangement Basics','Layering Sounds','Using Swing & Groove','Sampling Techniques','Mixing Your Beat','Exporting Stems','Full Beat Walkthrough'] },

  { id:'c2',  category:'production',   title:'Advanced Sound Design',              instructor:'SynthMaster K',    level:'Advanced',     lessonCount:18, duration:'4h 15m', free:false, featured:false, isNew:true,  color:'#FF6600', progress:0,
    description:'Deep dive into synthesis, modulation, and creating unique sounds from scratch.',
    lessons:['Subtractive Synthesis','FM Synthesis Basics','Wavetable Design','Modulation Routing','LFOs & Envelopes','Filter Techniques','Granular Concepts','Layering Synths','Resampling','Creating Pads','Designing Leads','Bass Design','FX Chains','Parallel Processing','Sound Morphing','Arp & Sequencer','Presets vs Scratch','Full Patch Walkthrough'] },

  { id:'c3',  category:'production',   title:'Sample Flipping Techniques',         instructor:'ChopKing',         level:'Intermediate', lessonCount:8,  duration:'1h 45m', free:true,  featured:false, isNew:false, color:'#7C3AED', progress:60,
    description:'Master the art of chopping, flipping, and resampling classic loops.',
    lessons:['Finding Samples','Chopping in the DAW','Pitch Correction','Layering Chops','Drum Programming Over Samples','Adding Chord Stabs','Filtering & EQ','Full Flip Walkthrough'] },

  { id:'c4',  category:'production',   title:'Trap Production A-Z',                instructor:'808 Baron',        level:'Beginner',     lessonCount:20, duration:'5h', free:false, featured:true,  isNew:false, color:'#FFD700', progress:30,
    description:'Complete guide to trap production from drum patterns to final mixdown.',
    lessons:['Trap History','Setting Up Your Session','Hi-Hat Patterns','Kick & Snare Fundamentals','808 Slides & Pitch','Melody & Chords','Building a Hook','Verse Arrangement','Bridge & Drop','Layering Instruments','Mixing Trap Drums','Low End Theory','Vocal Chops','Ad-libs & FX','Reference Tracks','Mixdown Prep','Stems Export','Mastering for Trap','Submitting to Labels','Full Beat Session'] },

  { id:'c5',  category:'mixing',       title:'EQ Masterclass',                     instructor:'Mix Engineer Pro', level:'Intermediate', lessonCount:10, duration:'2h', free:true,  featured:true,  isNew:false, color:'#00c8ff', progress:100,
    description:'Everything about equalization: corrective, creative, and surgical techniques.',
    lessons:['What is EQ?','Frequency Spectrum Overview','Corrective EQ','Subtractive EQ','Additive EQ','High-Pass & Low-Pass','Mid-Side EQ','Dynamic EQ','Linear Phase EQ','Full Mix EQ Chain'] },

  { id:'c6',  category:'mixing',       title:'Compression Deep Dive',              instructor:'Dynamics Dave',    level:'Intermediate', lessonCount:9,  duration:'1h 50m', free:false, featured:false, isNew:false, color:'#f97316', progress:0,
    description:'Master every compressor parameter and real-world workflow technique.',
    lessons:['Attack & Release','Ratio & Threshold','Knee Settings','Parallel Compression','Sidechain Techniques','Bus Compression','Multiband Compression','Limiting vs Compression','Full Chain Walkthrough'] },

  { id:'c7',  category:'mixing',       title:'Stereo Width & Imaging',             instructor:'PanoramaQ',        level:'Advanced',     lessonCount:7,  duration:'1h 30m', free:false, featured:false, isNew:true,  color:'#a855f7', progress:0,
    description:'Build wide, immersive mixes that translate on every playback system.',
    lessons:['Mid-Side Basics','Haas Effect','Stereo Spreaders','Width on Drums','Width on Synths','Mono Compatibility','Full Mix Imaging Check'] },

  { id:'c8',  category:'mixing',       title:'Mixing Vocals Like a Pro',           instructor:'VocalEngineer',    level:'Beginner',     lessonCount:15, duration:'3h 10m', free:true,  featured:false, isNew:false, color:'#22d3ee', progress:40,
    description:'The complete vocal chain: tuning, compression, EQ, reverb, and effects.',
    lessons:['Gain Staging Vocals','Pitch Correction Basics','Melodyne Workflow','De-essing','EQ for Vocals','Compression for Vocals','Parallel Vocal Compression','Reverb & Delay','Vocal Doubling','Harmonies','Adlibs Mix','Vocal Bus','Automation','Cohesion with Instruments','Full Vocal Mix'] },

  { id:'c9',  category:'mastering',    title:'Mastering for Streaming Platforms',  instructor:'LUFS Labs',        level:'Intermediate', lessonCount:8,  duration:'1h 45m', free:true,  featured:true,  isNew:false, color:'#00ffc8', progress:0,
    description:'Hit the right loudness targets for Spotify, Apple Music, and YouTube.',
    lessons:['LUFS Explained','True Peak Limiting','Loudness Normalization','Spotify Target (-14 LUFS)','Apple Music Target (-16 LUFS)','YouTube Target (-13 LUFS)','Mastering Chain Setup','Export Formats & Bit Depth'] },

  { id:'c10', category:'mastering',    title:'Reference Mastering Workflow',       instructor:'AudioRefPro',      level:'Advanced',     lessonCount:6,  duration:'1h 20m', free:false, featured:false, isNew:true,  color:'#FF6600', progress:0,
    description:'Analytically match your masters to commercial reference tracks.',
    lessons:['Choosing References','Spectrum Analysis','LUFS Matching','EQ Matching','Dynamic Range Comparison','Full Reference Session'] },

  { id:'c11', category:'theory',       title:'Music Theory for Producers',         instructor:'TheoryHedz',       level:'Beginner',     lessonCount:16, duration:'3h 30m', free:true,  featured:true,  isNew:false, color:'#FFD700', progress:20,
    description:'Chords, scales, progressions, and everything a modern producer needs.',
    lessons:['Notes & Intervals','Major Scale','Minor Scale','Modes Overview','Triads & Chords','Chord Inversions','Common Progressions','ii-V-I in Jazz','Roman Numerals','Rhythm Basics','Time Signatures','Syncopation','Melody Writing','Countermelody','Transposition','Full Theory Review'] },

  { id:'c12', category:'theory',       title:'Advanced Harmony & Chord Progressions', instructor:'JazzMode',    level:'Advanced',     lessonCount:12, duration:'2h 40m', free:false, featured:false, isNew:false, color:'#7C3AED', progress:0,
    description:'Jazz harmony, reharmonization, and modal music applied to modern production.',
    lessons:['7th Chords Expanded','Extended Chords (9,11,13)','Altered Chords','Tritone Substitution','Reharmonization','Modal Harmony','Borrowed Chords','Secondary Dominants','Chromatic Mediant','Voice Leading','Negative Harmony','Full Harmony Session'] },

  { id:'c13', category:'distribution', title:'Release Music Independently',        instructor:'IndieLabel101',    level:'Beginner',     lessonCount:10, duration:'2h', free:true,  featured:true,  isNew:false, color:'#00c8ff', progress:80,
    description:'Step-by-step: distribute your music through StreamPireX & SonoSuite.',
    lessons:['Setting Up Your Profile','Metadata Best Practices','Artwork Requirements','ISRC & UPC Codes','Choosing Release Date','Streaming Platform Overview','Pre-Save Campaigns','Release Strategy','Royalty Collection','Post-Release Analytics'] },

  { id:'c14', category:'distribution', title:'Playlist Pitching Strategy',         instructor:'PlaylistPro',      level:'Intermediate', lessonCount:8,  duration:'1h 30m', free:false, featured:false, isNew:true,  color:'#34d399', progress:0,
    description:'Get your music onto Spotify editorial and independent playlists.',
    lessons:['Spotify for Artists Setup','Editorial Pitch Process','Independent Playlist Curators','Playlist Research Tools','Pitch Email Templates','Timing Your Pitch','Following Up','Tracking Results'] },

  { id:'c15', category:'marketing',    title:'Build a Fan Base on Social Media',   instructor:'FanGrowth',        level:'Beginner',     lessonCount:14, duration:'2h 50m', free:true,  featured:false, isNew:false, color:'#f97316', progress:0,
    description:'TikTok, Instagram Reels, YouTube Shorts — grow your audience organically.',
    lessons:['Content Strategy Basics','Hook in 3 Seconds','Behind-the-Scenes Content','Studio Vlogs','Beat Videos','Lyric Videos','Collab Content','Cross-Platform Strategy','Hashtag Strategy','Optimal Posting Times','Engaging with Comments','Stories & Lives','Paid Promotion Basics','Analytics Deep Dive'] },

  { id:'c16', category:'marketing',    title:'Artist Branding & EPK Creation',     instructor:'BrandYourSound',   level:'Beginner',     lessonCount:9,  duration:'1h 40m', free:false, featured:false, isNew:false, color:'#FF6600', progress:0,
    description:'Build a compelling artist brand and professional Electronic Press Kit.',
    lessons:['Defining Your Sound & Brand','Artist Name & Logo','Photography Brief','Bio Writing','EPK Structure','Streaming Links & Stats','Press & Media Mentions','Booking Info','Distributing Your EPK'] },

  { id:'c17', category:'equipment',    title:'Home Studio Setup Guide',            instructor:'GearHeadMusic',    level:'Beginner',     lessonCount:11, duration:'2h 15m', free:true,  featured:false, isNew:false, color:'#00ffc8', progress:0,
    description:'Build a professional-sounding home studio on any budget.',
    lessons:['Room Acoustics Basics','Acoustic Treatment DIY','Choosing an Interface','Microphone Types','Studio Monitors vs Headphones','DAW Selection','Cables & Connections','MIDI Controllers','Budget Setup ($300)','Mid-Range Setup ($1000)','Pro Setup ($3000+)'] },

  { id:'c18', category:'business',     title:'Music Licensing & Sync Deals',       instructor:'LicenseLawyer',    level:'Intermediate', lessonCount:10, duration:'2h', free:false, featured:true,  isNew:true,  color:'#FFD700', progress:0,
    description:'License your music for TV, film, video games, and advertising.',
    lessons:['What is Sync Licensing?','Master vs Sync License','PROs & Royalty Collection','Music Libraries Overview','Pitching to Supervisors','Licensing Agreements','Rate Negotiation','Work-for-Hire vs Licensing','Building a Sync Portfolio','Full Case Study'] },
];

// ---------------------------------------------------------------------------
// CourseCard
// ---------------------------------------------------------------------------
function CourseCard({ course, onOpen }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => onOpen(course)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:'#161b22',
        border:`1px solid ${hovered ? course.color : '#21262d'}`,
        borderRadius:8, overflow:'hidden', cursor:'pointer',
        transition:'border-color 0.2s', display:'flex', flexDirection:'column',
      }}
    >
      {/* Color stripe header */}
      <div style={{
        height:6,
        background: course.progress === 100 ? '#00ffc8' : course.progress > 0 ? `linear-gradient(to right, #00ffc8 ${course.progress}%, #21262d ${course.progress}%)` : `${course.color}44`,
      }} />

      <div style={{ padding:'10px 12px', flex:1, display:'flex', flexDirection:'column' }}>
        {/* Badges */}
        <div style={{ display:'flex', gap:4, marginBottom:6, flexWrap:'wrap' }}>
          {course.featured && (
            <span style={{ fontSize:9, padding:'1px 5px', borderRadius:3, background:'#FFD70022', border:'1px solid #FFD700', color:'#FFD700', fontFamily:'JetBrains Mono,monospace' }}>FEATURED</span>
          )}
          {course.isNew && (
            <span style={{ fontSize:9, padding:'1px 5px', borderRadius:3, background:'#00ffc822', border:'1px solid #00ffc8', color:'#00ffc8', fontFamily:'JetBrains Mono,monospace' }}>NEW</span>
          )}
          {!course.free && (
            <span style={{ fontSize:9, padding:'1px 5px', borderRadius:3, background:'#FF660022', border:'1px solid #FF6600', color:'#FF6600', fontFamily:'JetBrains Mono,monospace' }}>PRO</span>
          )}
          {course.progress === 100 && (
            <span style={{ fontSize:9, padding:'1px 5px', borderRadius:3, background:'#00ffc822', border:'1px solid #00ffc8', color:'#00ffc8', fontFamily:'JetBrains Mono,monospace' }}>✓ DONE</span>
          )}
        </div>

        {/* Title */}
        <div style={{ fontSize:12, fontWeight:700, color:'#e6edf3', marginBottom:4, fontFamily:'JetBrains Mono,monospace', lineHeight:1.3 }}>
          {course.title}
        </div>
        <div style={{ fontSize:10, color:'#8b949e', marginBottom:6 }}>by {course.instructor}</div>

        {/* Description */}
        <div style={{ fontSize:10, color:'#8b949e', lineHeight:1.5, flex:1,
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {course.description}
        </div>

        {/* Meta */}
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:10 }}>
          <span style={{ color: course.level==='Beginner' ? '#00ffc8' : course.level==='Intermediate' ? '#FFD700' : '#FF6600' }}>
            {course.level}
          </span>
          <span style={{ color:'#8b949e' }}>{course.lessonCount} lessons · {course.duration}</span>
        </div>

        {/* Progress bar */}
        {course.progress > 0 && (
          <div style={{ marginTop:6, height:3, background:'#21262d', borderRadius:2 }}>
            <div style={{ height:'100%', borderRadius:2, width:`${course.progress}%`,
              background: course.progress === 100 ? '#00ffc8' : '#FFD700', transition:'width 0.3s' }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CourseDetail Modal
// ---------------------------------------------------------------------------
function CourseDetail({ course, onClose, onStartLesson }) {
  const [activeLesson, setActiveLesson] = useState(0);
  if (!course) return null;

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:1000, background:'#00000099',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:'#1f2937', border:`2px solid ${course.color}`,
        borderRadius:12, width:'100%', maxWidth:640, maxHeight:'85vh',
        overflow:'auto', fontFamily:'JetBrains Mono,monospace',
      }}>
        {/* Header */}
        <div style={{ background:`${course.color}22`, padding:'14px 16px', borderBottom:`1px solid ${course.color}44`, display:'flex', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:16, fontWeight:900, color:course.color }}>{course.title}</div>
            <div style={{ fontSize:11, color:'#8b949e', marginTop:2 }}>by {course.instructor} · {course.level} · {course.lessonCount} lessons · {course.duration}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#8b949e', fontSize:20, cursor:'pointer' }}>×</button>
        </div>

        <div style={{ padding:'14px 16px' }}>
          <p style={{ fontSize:12, color:'#e6edf3', lineHeight:1.7, marginBottom:14 }}>{course.description}</p>

          {/* Start button */}
          {course.free ? (
            <button onClick={() => onStartLesson(course, 0)} style={{
              width:'100%', background:`${course.color}22`, border:`1px solid ${course.color}`,
              color:course.color, borderRadius:6, padding:'10px', cursor:'pointer',
              fontFamily:'inherit', fontSize:13, fontWeight:700, marginBottom:14,
            }}>▶ {course.progress > 0 ? 'Continue Course' : 'Start Course'}</button>
          ) : (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, color:'#8b949e', marginBottom:6 }}>
                🔒 This course requires a Creator or Pro subscription
              </div>
              <button style={{
                width:'100%', background:'#FF660022', border:'1px solid #FF6600',
                color:'#FF6600', borderRadius:6, padding:'10px', cursor:'pointer',
                fontFamily:'inherit', fontSize:12, fontWeight:700,
              }}>Upgrade to Unlock</button>
            </div>
          )}

          {/* Lesson list */}
          <div style={{ fontSize:10, color:'#8b949e', letterSpacing:2, marginBottom:8 }}>LESSONS</div>
          {(course.lessons || []).map((lesson, i) => (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:10, padding:'7px 10px',
              borderRadius:6, marginBottom:3, cursor:'pointer',
              background: i === activeLesson ? `${course.color}11` : 'transparent',
              border:`1px solid ${i === activeLesson ? course.color + '44' : 'transparent'}`,
            }} onClick={() => setActiveLesson(i)}>
              <div style={{
                width:20, height:20, borderRadius:'50%', fontSize:9, fontWeight:700,
                display:'flex', alignItems:'center', justifyContent:'center',
                background: i < Math.floor((course.progress / 100) * course.lessonCount)
                  ? course.color : '#21262d',
                color: i < Math.floor((course.progress / 100) * course.lessonCount)
                  ? '#0d1117' : '#8b949e',
                flexShrink:0,
              }}>
                {i < Math.floor((course.progress / 100) * course.lessonCount) ? '✓' : i + 1}
              </div>
              <span style={{ fontSize:11, color: i === activeLesson ? course.color : '#e6edf3' }}>
                {lesson}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function CreatorAcademy() {
  const [category, setCategory] = useState('all');
  const [level, setLevel] = useState('All Levels');
  const [search, setSearch] = useState('');
  const [filterFree, setFilterFree] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courses, setCourses] = useState(COURSES);

  const handleStartLesson = (course, lessonIndex) => {
    // In real app: track progress via /api/academy/progress
    alert(`Starting: "${course.lessons[lessonIndex]}"\n\nIn production this opens the video player / lesson viewer.`);
    setCourses(prev => prev.map(c =>
      c.id === course.id ? { ...c, progress: Math.max(c.progress, Math.round(((lessonIndex + 1) / c.lessonCount) * 100)) } : c
    ));
  };

  const filtered = useMemo(() => {
    return courses.filter(c => {
      if (category !== 'all' && c.category !== category) return false;
      if (level !== 'All Levels' && c.level !== level) return false;
      if (filterFree && !c.free) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.title.toLowerCase().includes(q) ||
          c.instructor.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [courses, category, level, search, filterFree]);

  const totalCompleted = courses.filter(c => c.progress === 100).length;
  const inProgress = courses.filter(c => c.progress > 0 && c.progress < 100).length;

  return (
    <div style={{
      background:'#0d1117', color:'#e6edf3', minHeight:'100vh',
      fontFamily:'JetBrains Mono,monospace',
    }}>
      {/* Header */}
      <div style={{ background:'#161b22', borderBottom:'1px solid #21262d', padding:'16px 20px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ fontSize:22, fontWeight:900, color:'#00ffc8', letterSpacing:1, marginBottom:4 }}>
            🎓 CREATOR ACADEMY
          </div>
          <div style={{ fontSize:12, color:'#8b949e', marginBottom:12 }}>
            {courses.length} courses · {totalCompleted} completed · {inProgress} in progress
          </div>

          {/* Search & Filters */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <input
              style={{
                flex:1, minWidth:200, background:'#21262d', border:'1px solid #30363d',
                borderRadius:6, color:'#e6edf3', padding:'6px 10px',
                fontFamily:'inherit', fontSize:12, outline:'none',
              }}
              placeholder="Search courses..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              value={level}
              onChange={e => setLevel(e.target.value)}
              style={{
                background:'#21262d', border:'1px solid #30363d', borderRadius:6,
                color:'#e6edf3', padding:'6px 10px', fontFamily:'inherit', fontSize:12,
              }}
            >
              {LEVELS.map(l => <option key={l}>{l}</option>)}
            </select>
            <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, cursor:'pointer' }}>
              <input
                type="checkbox"
                checked={filterFree}
                onChange={e => setFilterFree(e.target.checked)}
                style={{ accentColor:'#00ffc8' }}
              />
              Free Only
            </label>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'16px 20px' }}>
        {/* Category tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              style={{
                background: category === cat.id ? '#00ffc822' : '#21262d',
                border:`1px solid ${category === cat.id ? '#00ffc8' : '#30363d'}`,
                color: category === cat.id ? '#00ffc8' : '#8b949e',
                borderRadius:6, padding:'5px 12px', cursor:'pointer',
                fontFamily:'inherit', fontSize:11,
              }}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        <div style={{ fontSize:11, color:'#8b949e', marginBottom:12 }}>
          {filtered.length} course{filtered.length !== 1 ? 's' : ''} found
        </div>

        {/* Course grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 20px', color:'#8b949e' }}>
            No courses match your filters.
          </div>
        ) : (
          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))',
            gap:14,
          }}>
            {filtered.map(course => (
              <CourseCard key={course.id} course={course} onOpen={setSelectedCourse} />
            ))}
          </div>
        )}
      </div>

      {/* Course detail modal */}
      {selectedCourse && (
        <CourseDetail
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
          onStartLesson={handleStartLesson}
        />
      )}
    </div>
  );
}
