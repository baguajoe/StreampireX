import sys

path = "src/front/js/pages/RecordingStudio.js"
with open(path) as f:
    src = f.read()

# ── Replace CONSOLE VIEW channel strip render ──
old_console = """        {/* CONSOLE VIEW */}
        {!splitScreen&&viewMode==="console"&&(
          <div className="daw-console">
            <div className="daw-console-scroll">
              {tracks.map((t,i)=>{
                const meter=meterLevels[i]||{left:0,right:0,peak:0};
                return(
                  <div key={t.id} className={`daw-channel${selectedTrack===i?" selected":""}`} onClick={()=>setSelectedTrack(i)}>
                    <div className="daw-ch-routing">
                      <span className="daw-ch-routing-label">Routing</span>
                      <span className="daw-ch-routing-value">{t.input||"Default In"} → {t.output||"Stereo Out"}</span>
                      <MicModelSelector trackIndex={i} currentModel={trackMicModels[i]||"none"} onApply={handleConsoleMicModel}/>
                    </div>
                    <div className="daw-ch-inserts">
                      <div className="daw-ch-inserts-label daw-ch-track-name-top">{t.name||`Track ${i+1}`}</div>
                      {(()=>{
                        const loaded=ALL_FX_EXTENDED.filter(fx=>t.effects?.[fx.key]?.enabled);
                        return(<>
                          {loaded.map(fx=>(
                            <div key={fx.key} className={`daw-ch-insert-slot active ${fx.type}`}
                              title={`${fx.name} — click to edit, right-click to remove`}
                              onClick={e=>{e.stopPropagation();setSelectedTrack(i);setSelectedTrackIndex(i);setActiveEffectsTrack(i);setOpenFxKey(fx.key);setStatus(`${fx.name} — Track ${i+1}`);}}
                              onContextMenu={e=>{e.preventDefault();e.stopPropagation();updateEffect(i,fx.key,"enabled",false);setStatus(`${fx.name} OFF — Track ${i+1}`);}}>
                              {fx.name}
                            </div>
                          ))}
                          {loaded.length<8&&(
                            <div className="daw-ch-insert-slot empty rs-relative"
                              onClick={e=>{e.stopPropagation();const rect=e.currentTarget.getBoundingClientRect();setInsertPickerState({trackIndex:i,x:rect.right+4,y:rect.top});}}>
                              + Add Insert
                            </div>
                          )}
                        </>);
                      })()}
                    </div>
                    <div className="daw-ch-controls">
                      <div className={`daw-ch-badge${t.muted?" m-on":""}`} onClick={e=>{e.stopPropagation();const nm=!t.muted;updateTrack(i,{muted:nm});const audible=!nm&&(!hasSolo||t.solo);if(trackGainsRef.current[i])trackGainsRef.current[i].gain.value=audible?t.volume:0;}}>M</div>
                      <div className={`daw-ch-badge${t.solo?" s-on":""}`} onClick={e=>{e.stopPropagation();const ns=!t.solo;updateTrack(i,{solo:ns});const whs=tracks.some((x,idx)=>idx===i?ns:x.solo);tracks.forEach((x,idx)=>{const gn=trackGainsRef.current[idx];if(!gn)return;const s=idx===i?ns:x.solo;gn.gain.value=(!x.muted&&(!whs||s))?x.volume:0;});}}>S</div>
                      <div className={`daw-ch-badge${selectedTrack===i?" e-on":""}`} onClick={e=>{e.stopPropagation();setSelectedTrack(i);}}>e</div>
                    </div>
                    <div className="daw-ch-pan"><PanKnob value={t.pan} onChange={v=>updateTrack(i,{pan:v})} size={30}/></div>
                    <div className="daw-ch-fader-area">
                      <div className="daw-ch-fader-row">
                        <div className="daw-ch-meter" title="Level">
                          <CubaseMeter leftLevel={meter.left||0} rightLevel={meter.right||0} height={160} showScale={true}/>
                        </div>
                        <div className="daw-ch-fader">
                          <input type="range" min="0" max="1" step="0.01" value={t.volume}
                            onChange={e=>{const v=parseFloat(e.target.value);updateTrack(i,{volume:v});const audible=!t.muted&&(!hasSolo||t.solo);if(trackGainsRef.current[i])trackGainsRef.current[i].gain.value=audible?v:0;}}/>
                        </div>
                      </div>
                      <div className="daw-ch-vol-display"><div className="daw-ch-vol-val">{t.volume>0?(20*Math.log10(t.volume)).toFixed(1):"-∞"}</div></div>
                    </div>
                    <div className="daw-ch-automation">
                      <div className={`daw-ch-rw${t.readAutomation?" active":""}`}>R</div>
                      <div className={`daw-ch-rw${t.writeAutomation?" active":""}`}>W</div>
                    </div>
                    <div className="daw-ch-rec">
                      <button className={`daw-ch-rec-btn${t.armed?" armed":""}`} onClick={e=>{e.stopPropagation();updateTrack(i,{armed:!t.armed});}} title="Record Enable">●</button>
                    </div>
                    <ChannelStripAIMix track={t} trackIndex={i} userTier={userTier} onApplyVolume={handleAIApplyVolume} onApplyPan={handleAIApplyPan} onApplyEffect={updateEffect} onStatus={setStatus}/>
                    <div className="daw-ch-name">
                      <input className="daw-ch-name-input" value={t.name} onChange={e=>updateTrack(i,{name:e.target.value})}/>
                      <div className="daw-ch-number">
                        <span className="daw-ch-type-icon">{t.trackType==="midi"?"🎹":"🎙️"}</span>
                        <span>{i+1}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* MASTER CHANNEL */}
              <div className="daw-channel master-channel">
                <div className="daw-ch-routing">
                  <span className="daw-ch-routing-label">Routing</span>
                  <span className="daw-ch-routing-value">Stereo Out</span>
                </div>
                <div className="daw-ch-inserts">
                  <div className="daw-ch-inserts-label">Master</div>
                  <div className="daw-ch-insert-slot empty rs-insert-empty-text">Stereo Bus</div>
                </div>
                <div className="daw-ch-controls">
                  <div className="daw-ch-badge">M</div>
                  <div className="daw-ch-badge">S</div>
                  <div className="daw-ch-badge">e</div>
                </div>
                <div className="daw-ch-pan"><PanKnob value={masterPan} onChange={v=>setMasterPan(v)} size={30}/></div>
                <div className="daw-ch-fader-area">
                  <div className="daw-ch-fader-row">
                    <div className="daw-ch-meter" title="Level">
                      <CubaseMeter leftLevel={masterMeterLevels?.left||0} rightLevel={masterMeterLevels?.right||0} height={160} showScale={true}/>
                    </div>
                    <div className="daw-ch-fader">
                      <input type="range" min="0" max="1" step="0.01" value={masterVolume}
                        onChange={e=>{const v=parseFloat(e.target.value);setMasterVolume(v);if(masterGainRef.current)masterGainRef.current.gain.value=v;}}/>
                    </div>
                  </div>
                  <div className="daw-ch-vol-display"><div className="daw-ch-vol-val">{masterVolume>0?(20*Math.log10(masterVolume)).toFixed(1):"-∞"}</div></div>
                </div>
                <div className="daw-ch-name">
                  <div className="rs-master-label">MASTER</div>
                  <div className="daw-ch-number">Stereo Out</div>
                </div>
              </div>
            </div>
          </div>
        )}"""

new_console = """        {/* CONSOLE VIEW */}
        {!splitScreen&&viewMode==="console"&&(
          <div className="daw-console">
            <div className="daw-console-scroll">
              {tracks.map((t,i)=>{
                const meter=meterLevels[i]||{left:0,right:0,peak:0};
                const loaded=ALL_FX_EXTENDED.filter(fx=>t.effects?.[fx.key]?.enabled);
                return(
                  <div key={t.id} className={`daw-channel${selectedTrack===i?" selected":""}${t.armed?" armed":""}`}
                    onClick={()=>setSelectedTrack(i)}>

                    {/* COLOR BAR + TRACK NAME TOP */}
                    <div className="daw-ch-colorbar" style={{background:t.color||'#4a90d9'}}/>
                    <div className="daw-ch-header">
                      <span className="daw-ch-type-icon">{t.trackType==="midi"?"🎹":"🎙"}</span>
                      <span className="daw-ch-header-num">{i+1}</span>
                    </div>

                    {/* ROUTING */}
                    <div className="daw-ch-routing">
                      <span className="daw-ch-routing-value">{t.input||"Default In"}</span>
                      <MicModelSelector trackIndex={i} currentModel={trackMicModels[i]||"none"} onApply={handleConsoleMicModel}/>
                    </div>

                    {/* INSERTS */}
                    <div className="daw-ch-inserts">
                      <div className="daw-ch-inserts-label">INSERTS</div>
                      {loaded.map(fx=>(
                        <div key={fx.key} className={`daw-ch-insert-slot active ${fx.type||""}`}
                          title={`${fx.name} — right-click to remove`}
                          onClick={e=>{e.stopPropagation();setSelectedTrack(i);setSelectedTrackIndex(i);setActiveEffectsTrack(i);setOpenFxKey(fx.key);}}
                          onContextMenu={e=>{e.preventDefault();e.stopPropagation();updateEffect(i,fx.key,"enabled",false);}}>
                          {fx.name}
                        </div>
                      ))}
                      {loaded.length<8&&(
                        <div className="daw-ch-insert-slot empty"
                          onClick={e=>{e.stopPropagation();const rect=e.currentTarget.getBoundingClientRect();setInsertPickerState({trackIndex:i,x:rect.right+4,y:rect.top});}}>
                          + Insert
                        </div>
                      )}
                    </div>

                    {/* M S E REC row */}
                    <div className="daw-ch-controls">
                      <div className={`daw-ch-badge${t.muted?" m-on":""}`}
                        onClick={e=>{e.stopPropagation();const nm=!t.muted;updateTrack(i,{muted:nm});const audible=!nm&&(!hasSolo||t.solo);if(trackGainsRef.current[i])trackGainsRef.current[i].gain.value=audible?t.volume:0;}}>M</div>
                      <div className={`daw-ch-badge${t.solo?" s-on":""}`}
                        onClick={e=>{e.stopPropagation();const ns=!t.solo;updateTrack(i,{solo:ns});const whs=tracks.some((x,idx)=>idx===i?ns:x.solo);tracks.forEach((x,idx)=>{const gn=trackGainsRef.current[idx];if(!gn)return;const s=idx===i?ns:x.solo;gn.gain.value=(!x.muted&&(!whs||s))?x.volume:0;});}}>S</div>
                      <div className={`daw-ch-badge${selectedTrack===i?" e-on":""}`}
                        onClick={e=>{e.stopPropagation();setSelectedTrack(i);setActiveEffectsTrack(i);}}>e</div>
                      <button className={`daw-ch-rec-btn${t.armed?" armed":""}`}
                        onClick={e=>{e.stopPropagation();updateTrack(i,{armed:!t.armed});}} title="Record arm">●</button>
                    </div>

                    {/* PAN */}
                    <div className="daw-ch-pan">
                      <PanKnob value={t.pan} onChange={v=>updateTrack(i,{pan:v})} size={32}/>
                      <span className="daw-ch-pan-val">{t.pan===0?"C":t.pan>0?`R${Math.round(t.pan*100)}`:`L${Math.round(Math.abs(t.pan)*100)}`}</span>
                    </div>

                    {/* FADER + METER */}
                    <div className="daw-ch-fader-area">
                      <div className="daw-ch-fader-row">
                        <div className="daw-ch-fader">
                          <input type="range" min="0" max="1" step="0.005" value={t.volume}
                            onChange={e=>{const v=parseFloat(e.target.value);updateTrack(i,{volume:v});const audible=!t.muted&&(!hasSolo||t.solo);if(trackGainsRef.current[i])trackGainsRef.current[i].gain.value=audible?v:0;}}/>
                        </div>
                        <CubaseMeter leftLevel={meter.left||0} rightLevel={meter.right||0} height={180} showScale={false}/>
                      </div>
                      <div className="daw-ch-vol-display">
                        <span className="daw-ch-vol-val">{t.volume>0?(20*Math.log10(t.volume)).toFixed(1):"-∞"} dB</span>
                      </div>
                    </div>

                    {/* R/W automation */}
                    <div className="daw-ch-automation">
                      <div className={`daw-ch-rw${t.readAutomation?" active":""}`}>R</div>
                      <div className={`daw-ch-rw${t.writeAutomation?" active":""}`}>W</div>
                    </div>

                    {/* TRACK NAME BOTTOM */}
                    <div className="daw-ch-name">
                      <input className="daw-ch-name-input" value={t.name}
                        onChange={e=>updateTrack(i,{name:e.target.value})}
                        onClick={e=>e.stopPropagation()}/>
                      <select className="daw-ch-console-select"
                        value={trackConsoleChar[t.id]||'none'}
                        onChange={e=>setTrackConsoleChar(prev=>({...prev,[t.id]:e.target.value}))}
                        onClick={e=>e.stopPropagation()}>
                        {Object.entries(CONSOLE_BOARDS).map(([id,b])=><option key={id} value={id}>{b.name}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })}

              {/* MASTER CHANNEL */}
              <div className="daw-channel master-channel">
                <div className="daw-ch-colorbar" style={{background:'#ff8a3d'}}/>
                <div className="daw-ch-header">
                  <span className="daw-ch-type-icon">🎚</span>
                  <span className="daw-ch-header-num">M</span>
                </div>
                <div className="daw-ch-routing">
                  <span className="daw-ch-routing-value">Stereo Out</span>
                </div>
                <div className="daw-ch-inserts">
                  <div className="daw-ch-inserts-label">MASTER BUS</div>
                  <div className="daw-ch-insert-slot empty">Stereo Out</div>
                </div>
                <div className="daw-ch-controls">
                  <div className="daw-ch-badge">M</div>
                  <div className="daw-ch-badge">S</div>
                  <div className="daw-ch-badge">e</div>
                  <div className="daw-ch-rec-btn"/>
                </div>
                <div className="daw-ch-pan">
                  <PanKnob value={masterPan} onChange={v=>setMasterPan(v)} size={32}/>
                  <span className="daw-ch-pan-val">{masterPan===0?"C":masterPan>0?`R${Math.round(masterPan*100)}`:`L${Math.round(Math.abs(masterPan)*100)}`}</span>
                </div>
                <div className="daw-ch-fader-area">
                  <div className="daw-ch-fader-row">
                    <div className="daw-ch-fader">
                      <input type="range" min="0" max="1" step="0.005" value={masterVolume}
                        onChange={e=>{const v=parseFloat(e.target.value);setMasterVolume(v);if(masterGainRef.current)masterGainRef.current.gain.value=v;}}/>
                    </div>
                    <CubaseMeter leftLevel={masterMeterLevels?.left||0} rightLevel={masterMeterLevels?.right||0} height={180} showScale={false}/>
                  </div>
                  <div className="daw-ch-vol-display">
                    <span className="daw-ch-vol-val rs-orange">{masterVolume>0?(20*Math.log10(masterVolume)).toFixed(1):"-∞"} dB</span>
                  </div>
                </div>
                <div className="daw-ch-automation">
                  <div className="daw-ch-rw">R</div>
                  <div className="daw-ch-rw">W</div>
                </div>
                <div className="daw-ch-name">
                  <span className="rs-master-label">MASTER</span>
                  <select className="daw-ch-console-select" value={masterConsoleChar}
                    onChange={e=>setMasterConsoleChar(e.target.value)}>
                    {Object.entries(CONSOLE_BOARDS).map(([id,b])=><option key={id} value={id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}"""

if old_console in src:
    src = src.replace(old_console, new_console)
    with open(path, "w") as f:
        f.write(src)
    print("console JSX replaced")
else:
    print("ERROR: old block not found")
    sys.exit(1)
