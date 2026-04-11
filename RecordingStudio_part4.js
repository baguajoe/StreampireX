        {/* MIC SIM MODAL */}
        {showMicSimModal&&(
          <div className="daw-plugin-modal rs-plugin-modal">
            <button onClick={()=>setShowMicSimModal(false)} className="rs-modal-close">✕</button>
            <MicSimulator audioContext={audioCtxRef.current} liveStream={micSimStream}
              onRecordingComplete={(blob)=>{
                const ai=tracks.findIndex(t=>t.armed);
                if(ai===-1){setStatus("⚠ Arm a track first");return;}
                const ctx=getCtx(); const audioUrl=URL.createObjectURL(blob);
                blob.arrayBuffer().then(ab=>ctx.decodeAudioData(ab)).then(buf=>{updateTrack(ai,{audioBuffer:buf,audio_url:audioUrl});createRegionFromRecording(ai,buf,audioUrl);uploadTrack(blob,ai);setStatus(`✓ Mic Sim recorded → Track ${ai+1}`);setViewMode("arrange");}).catch(e=>setStatus(`✗ ${e.message}`));
              }}
              onApplyMicProfile={handleApplyMicProfile} onClose={()=>setViewMode("arrange")} isEmbedded={true}/>
            <div className="rs-bottom-toolbar">
              <button onClick={()=>setShowMicBuilder(true)} className="rs-action-btn-teal">🔧 Build Custom Mic</button>
              {customMicProfiles.length>0&&<span className="rs-muted-text">{customMicProfiles.length} custom profile{customMicProfiles.length>1?'s':''} saved</span>}
            </div>
            {showMicBuilder&&(<div className="rs-modal-overlay"><div className="rs-modal-panel"><CustomMicBuilder onSave={(profileId,profile)=>{setCustomMicProfiles(prev=>[...prev.filter(p=>p.id!==profileId),{id:profileId,...profile}]);setShowMicBuilder(false);}} onClose={()=>setShowMicBuilder(false)}/></div></div>)}
          </div>
        )}

        {/* VOCAL MODAL */}
        {showVocalModal&&(
          <div className="daw-plugin-modal rs-plugin-modal">
            <button onClick={()=>setShowVocalModal(false)} className="rs-modal-close">✕</button>
            <VocalProcessor audioContext={audioCtxRef.current} isEmbedded={true} tracks={tracks} selectedTrackIndex={selectedTrackIndex} bpm={bpm}
              onApplyToConsole={handleApplyVocalFx} onClose={()=>setShowVocalModal(false)}
              onSendToTrack={(buf,name)=>{const ai=tracks.findIndex(t=>t.armed);const idx=ai!==-1?ai:selectedTrackIndex;const audioUrl=URL.createObjectURL(new Blob([]));updateTrack(idx,{audioBuffer:buf,audio_url:audioUrl,name:name||tracks[idx].name});createRegionFromImport(idx,buf,name||"Vocal Take",audioUrl);setStatus(`✓ Vocal take → Track ${idx+1}`);setViewMode("arrange");}}
              onRecordingComplete={(blob)=>{const ai=tracks.findIndex(t=>t.armed);if(ai!==-1)uploadTrack(blob,ai);}}/>
          </div>
        )}

        {/* INSERT PICKER */}
        {insertPickerState&&(
          <div className="daw-insert-picker" style={{left:insertPickerState.x,top:insertPickerState.y}} onClick={e=>e.stopPropagation()}>
            <div className="daw-insert-picker-title">Add Insert</div>
            {[
              {cat:"Vocal Tools",cls:"vocal",items:[{key:"__vocal_processor",name:"Vocal Processor"},{key:"__mic_simulator",name:"Mic Simulator"}]},
              {cat:"Dynamics",cls:"normal",items:[{key:"eq",name:"EQ"},{key:"compressor",name:"Compressor"},{key:"gate",name:"Gate"},{key:"deesser",name:"De-Esser"},{key:"limiter",name:"Limiter"}]},
              {cat:"Time/Space",cls:"normal",items:[{key:"reverb",name:"Reverb"},{key:"delay",name:"Delay"},{key:"chorus",name:"Chorus"},{key:"flanger",name:"Flanger"},{key:"phaser",name:"Phaser"}]},
              {cat:"Modulation",cls:"normal",items:[{key:"tremolo",name:"Tremolo"},{key:"stereoWidener",name:"Stereo Widener"}]},
              {cat:"Saturation",cls:"normal",items:[{key:"distortion",name:"Distortion"},{key:"bitcrusher",name:"Bit Crusher"},{key:"tapeSaturation",name:"Tape Saturation"},{key:"exciter",name:"Exciter"}]},
              {cat:"Utility",cls:"normal",items:[{key:"filter",name:"Filter"},{key:"gainUtility",name:"Gain Utility"}]},
              {cat:"SPX Analog",cls:"normal",items:[{key:"tapeForge",name:"TapeForge"},{key:"valveGlow",name:"ValveGlow"},{key:"ironCore",name:"IronCore"},{key:"consoleSoul",name:"ConsoleSoul"}]},
              {cat:"SPX Dynamics",cls:"normal",items:[{key:"brickWall",name:"BrickWall"},{key:"warmPress",name:"WarmPress"},{key:"glueBus",name:"GlueBus"},{key:"fetStrike",name:"FETStrike"},{key:"optoPress",name:"OptoPress"},{key:"parallelCrush",name:"ParallelCrush"},{key:"multiPress",name:"MultiPress"},{key:"transGate",name:"TransGate"}]},
              {cat:"SPX EQ",cls:"normal",items:[{key:"ironBand",name:"IronBand"},{key:"spectraCurve",name:"SpectraCurve"}]},
              {cat:"SPX Spatial",cls:"normal",items:[{key:"hallForgeS",name:"HallForge I"},{key:"hallForgeL",name:"HallForge II"},{key:"gateVerb",name:"GateVerb"},{key:"vintageAir",name:"VintageAir"},{key:"stochasticHall",name:"StochasticHall"},{key:"greatHall",name:"GreatHall"},{key:"plateForge",name:"PlateForge"},{key:"springBox",name:"SpringBox"},{key:"echoField",name:"EchoField"},{key:"stereoBloom",name:"StereoBloom"},{key:"pitchForge",name:"PitchForge"},{key:"dualDelay",name:"DualDelay"}]},
              {cat:"SPX Vocal",cls:"normal",items:[{key:"pitchLock",name:"PitchLock"},{key:"voiceForge",name:"VoiceForge"},{key:"breathGate",name:"BreathGate"},{key:"sibilantCut",name:"SibilantCut"},{key:"phantomDouble",name:"PhantomDouble"},{key:"vocalSpace",name:"VocalSpace"}]},
              {cat:"SPX Mastering",cls:"normal",items:[{key:"masterWall",name:"MasterWall"},{key:"stereoForge",name:"StereoForge"},{key:"loudnessMeter",name:"LoudnessMeter"},{key:"harmonicExcite",name:"HarmonicExcite"},{key:"vinylPress",name:"VinylPress"},{key:"ditherForge",name:"DitherForge"},{key:"dcBlock",name:"DCBlock"},{key:"spaceForge",name:"SpaceForge"},{key:"vortexMod",name:"VortexMod"},{key:"gainRider",name:"GainRider"},{key:"harmonicSum",name:"HarmonicSum"}]},
              {cat:"SPX EQ Suite",cls:"normal",items:[{key:"pultecForge",name:"PultecForge"},{key:"dynamicEQ",name:"DynamicEQ"},{key:"graphicEQ",name:"GraphicEQ"},{key:"tiltEQ",name:"TiltEQ"},{key:"baxandallEQ",name:"BaxandallEQ"}]},
              {cat:"SPX Creative",cls:"normal",items:[{key:"vocoderSPX",name:"VocoderSPX"},{key:"granularFreeze",name:"GranularFreeze"},{key:"noiseReduction",name:"NoiseRedux"},{key:"ringMod",name:"RingMod"},{key:"formantFilter",name:"FormantFilter"},{key:"spectrumAnalyzer",name:"SpectrumAnalyzer"}]},
              {cat:"SPX Producer",cls:"normal",items:[{key:"tapeStop",name:"TapeStop"},{key:"transientShaper",name:"TransientShaper"},{key:"multibandSat",name:"MultibandSat"},{key:"stereoImager",name:"StereoImager"},{key:"enhancer808",name:"808Enhancer"},{key:"loFiCrusher",name:"LoFiCrusher"},{key:"infiniteReverb",name:"InfiniteReverb"},{key:"reverseDelay",name:"ReverseDelay"},{key:"chorusEnsemble",name:"ChorusEnsemble"},{key:"tempoDelay",name:"TempoDelay"},{key:"pitchRandomizer",name:"PitchRandomizer"},{key:"autoWah",name:"AutoWah"},{key:"drumEnhancer",name:"DrumEnhancer"},{key:"vocalSaturator",name:"VocalSaturator"},{key:"subOctaver",name:"SubOctaver"},{key:"freqShifter",name:"FreqShifter"},{key:"cabinetSim",name:"CabinetSim"}]},
              {cat:"SPX Restoration",cls:"normal",items:[{key:"declicker",name:"Declicker"},{key:"dehummer",name:"Dehummer"},{key:"dialogueIsolator",name:"DialogueIsolator"}]},
              {cat:"SPX Metering",cls:"normal",items:[{key:"gainStager",name:"GainStager"},{key:"goniometer",name:"Goniometer"},{key:"phaseScope",name:"PhaseScope"},{key:"midSideComp",name:"MidSideComp"},{key:"multibandLimiter",name:"MultibandLimiter"}]},
            ].map(group=>(
              <div key={group.cat}>
                <div className={`daw-insert-picker-cat ${group.cls}`}>{group.cat}</div>
                {group.items.map(fx=>{
                  const isVocalTool=fx.key.startsWith("__");
                  const already=!isVocalTool&&tracks[insertPickerState.trackIndex]?.effects?.[fx.key]?.enabled;
                  return(
                    <div key={fx.key}
                      className={`daw-insert-picker-item${already?" done":isVocalTool?" vocal":""}`}
                      onClick={()=>{
                        if(fx.key==="__vocal_processor"){setInsertPickerState(null);setShowVocalModal(true);return;}
                        if(fx.key==="__mic_simulator"){setInsertPickerState(null);setShowMicSimModal(true);return;}
                        if(already) return;
                        updateEffect(insertPickerState.trackIndex,fx.key,"enabled",true);
                        setActiveEffectsTrack(insertPickerState.trackIndex);
                        setOpenFxKey(fx.key);
                        setInsertPickerState(null);
                        setStatus(`${fx.name} added — Track ${insertPickerState.trackIndex+1}`);
                      }}>
                      {isVocalTool?`⤴ ${fx.name}`:already?`✓ ${fx.name}`:fx.name}
                    </div>
                  );
                })}
              </div>
            ))}
            {(()=>{
              const CATS=["dynamics","eq","reverb","delay","modulation","filter","distortion","pitch","vocal","spatial","utility","mastering","restoration","creative"];
              const CAT_ICONS={dynamics:"🎚",eq:"📊",reverb:"🌊",delay:"⏱",modulation:"🌀",filter:"🔊",distortion:"🔥",pitch:"🎵",vocal:"🎤",spatial:"🔭",utility:"🔧",mastering:"💿",restoration:"🛠",creative:"✨"};
              try{
                const {getAllPlugins}=require('../component/audio/plugins/registry')||{};
                const allPlugins=getAllPlugins?getAllPlugins():[];
                return(<>
                  <div className="rs-sidebar-section-header"><div className="rs-sidebar-section-label">🎛 Plugin Library — 106 Plugins</div></div>
                  {CATS.map(cat=>{
                    const catPlugins=allPlugins.filter(p=>p.category===cat);
                    if(!catPlugins.length) return null;
                    return(
                      <div key={cat}>
                        <div className="rs-sidebar-item-label">{CAT_ICONS[cat]||"🎛"} {cat}</div>
                        {catPlugins.map(plug=>{
                          const alreadyLoaded=tracks[insertPickerState?.trackIndex]?.effects?.[plug.id]?.enabled;
                          return(
                            <div key={plug.id} className={`daw-insert-lib-item${alreadyLoaded?" done":""}`}
                              onClick={()=>{if(alreadyLoaded||insertPickerState===null)return;updateEffect(insertPickerState.trackIndex,plug.id,"enabled",true);updateEffect(insertPickerState.trackIndex,plug.id,"name",plug.name);updateEffect(insertPickerState.trackIndex,plug.id,"libPlugin",true);setActiveEffectsTrack(insertPickerState.trackIndex);setInsertPickerState(null);setStatus(`${plug.name} added — Track ${insertPickerState.trackIndex+1}`);}}>
                              <span className="rs-lib-badge">LIB</span>
                              {alreadyLoaded?`✓ ${plug.name}`:plug.name}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </>);
              }catch(e){return null;}
            })()}
            <div className="rs-divider"/>
            <div className="rs-remove-item" onClick={()=>setInsertPickerState(null)}>Cancel</div>
          </div>
        )}

        {/* FX PANEL POPUP */}
        {afx&&openFxKey&&(
          <div className="daw-fx-panel-popup">
            <ConsoleFXPanel track={afx} trackIndex={activeEffectsTrack} updateEffect={updateEffect}
              onClose={()=>{setActiveEffectsTrack(null);setOpenFxKey(null);}} openFxKey={openFxKey}/>
          </div>
        )}

        {/* PROJECT LIST */}
        {showProjectList&&(
          <div className="daw-modal-overlay" onClick={()=>setShowProjectList(false)}>
            <div className="daw-modal" onClick={e=>e.stopPropagation()}>
              <h2>Open Project</h2>
              {projects.length===0?<p className="daw-empty">No saved projects</p>:(
                <div className="daw-project-list">
                  {projects.map(p=>(
                    <button key={p.id} className="daw-project-item" onClick={()=>loadProject(p.id)}>
                      <span className="daw-project-name">{p.name}</span>
                      <span className="daw-project-meta">{p.bpm} BPM · {new Date(p.updated_at).toLocaleDateString()}</span>
                    </button>
                  ))}
                </div>
              )}
              <button className="daw-btn" onClick={()=>setShowProjectList(false)}>Close</button>
            </div>
          </div>
        )}

        {/* SAVE AS MODAL */}
        <SaveAsModal show={showSaveAsModal} defaultName={projectName}
          onSave={(fileName)=>{
            if(saveAsData){const blob=new Blob([saveAsData],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=fileName;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);setStatus('Saved: '+fileName);}
            setShowSaveAsModal(false);setSaveAsData(null);
          }}
          onCancel={()=>{setShowSaveAsModal(false);setSaveAsData(null);}}/>

        <CollabChatPanel collab={collab}/>
      </div>
    </div>
  );
};

export default RecordingStudio;

const MotionButton = ({url}) => {
  const {actions}=useContext(Context);
  const navigate=useNavigate();
  const handleSend=()=>sendToMotion(actions,navigate,{type:"audio",url,name:"Recording"});
  return <button onClick={handleSend} className="rs-send-btn">Send to Motion Studio 🎬</button>;
};
