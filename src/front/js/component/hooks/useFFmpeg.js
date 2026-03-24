import { useState, useRef, useCallback } from 'react';

let ffmpegInstance = null;
let isLoaded = false;

export function useFFmpeg() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const ffRef = useRef(null);

  const load = useCallback(async () => {
    if (isLoaded && ffmpegInstance) {
      ffRef.current = ffmpegInstance;
      return ffmpegInstance;
    }
    setLoading(true);
    setError(null);
    try {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { toBlobURL } = await import('@ffmpeg/util');
      const ff = new FFmpeg();
      ff.on('progress', ({ progress: p }) => setProgress(Math.round(p * 100)));
      ff.on('log', ({ message }) => console.log('[FFmpeg]', message));
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await ff.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      ffmpegInstance = ff;
      ffRef.current = ff;
      isLoaded = true;
      setLoading(false);
      return ff;
    } catch (e) {
      setError(e.message);
      setLoading(false);
      throw e;
    }
  }, []);

  // ── Trim a video file ────────────────────────────────────
  const trim = useCallback(async (file, startTime, endTime) => {
    const ff = await load();
    const { fetchFile } = await import('@ffmpeg/util');
    const ext = file.name?.split('.').pop() || 'mp4';
    const inName = `input.${ext}`;
    const outName = `trimmed.${ext}`;
    await ff.writeFile(inName, await fetchFile(file));
    await ff.exec([
      '-i', inName,
      '-ss', String(startTime),
      '-to', String(endTime),
      '-c', 'copy',
      outName
    ]);
    const data = await ff.readFile(outName);
    await ff.deleteFile(inName);
    await ff.deleteFile(outName);
    return new Blob([data.buffer], { type: `video/${ext}` });
  }, [load]);

  // ── Apply FFmpeg filter to a file ────────────────────────
  const applyFilter = useCallback(async (file, filterStr, ext = 'mp4') => {
    const ff = await load();
    const { fetchFile } = await import('@ffmpeg/util');
    const inName = `input.${ext}`;
    const outName = `filtered.${ext}`;
    await ff.writeFile(inName, await fetchFile(file));
    await ff.exec([
      '-i', inName,
      '-vf', filterStr,
      '-c:a', 'copy',
      outName
    ]);
    const data = await ff.readFile(outName);
    await ff.deleteFile(inName);
    await ff.deleteFile(outName);
    return new Blob([data.buffer], { type: `video/${ext}` });
  }, [load]);

  // ── Apply chroma key ─────────────────────────────────────
  const chromaKey = useCallback(async (file, color = '0x00ff00', similarity = 0.3, blend = 0.1) => {
    const ff = await load();
    const { fetchFile } = await import('@ffmpeg/util');
    await ff.writeFile('input.mp4', await fetchFile(file));
    await ff.exec([
      '-i', 'input.mp4',
      '-vf', `chromakey=${color}:${similarity}:${blend}`,
      '-c:a', 'copy',
      'chroma.mp4'
    ]);
    const data = await ff.readFile('chroma.mp4');
    await ff.deleteFile('input.mp4');
    await ff.deleteFile('chroma.mp4');
    return new Blob([data.buffer], { type: 'video/mp4' });
  }, [load]);

  // ── Speed ramp ───────────────────────────────────────────
  const speedRamp = useCallback(async (file, speed = 2.0) => {
    const ff = await load();
    const { fetchFile } = await import('@ffmpeg/util');
    const pts = (1 / speed).toFixed(4);
    const atempo = speed > 2 ? `atempo=2.0,atempo=${(speed/2).toFixed(4)}` : `atempo=${speed.toFixed(4)}`;
    await ff.writeFile('input.mp4', await fetchFile(file));
    await ff.exec([
      '-i', 'input.mp4',
      '-vf', `setpts=${pts}*PTS`,
      '-af', atempo,
      'speed.mp4'
    ]);
    const data = await ff.readFile('speed.mp4');
    await ff.deleteFile('input.mp4');
    await ff.deleteFile('speed.mp4');
    return new Blob([data.buffer], { type: 'video/mp4' });
  }, [load]);

  // ── Extract frame as thumbnail ───────────────────────────
  const extractFrame = useCallback(async (file, timestamp = 0) => {
    const ff = await load();
    const { fetchFile } = await import('@ffmpeg/util');
    const ext = file.name?.split('.').pop() || 'mp4';
    await ff.writeFile(`input.${ext}`, await fetchFile(file));
    await ff.exec([
      '-i', `input.${ext}`,
      '-ss', String(timestamp),
      '-vframes', '1',
      '-q:v', '2',
      'thumb.jpg'
    ]);
    const data = await ff.readFile('thumb.jpg');
    await ff.deleteFile(`input.${ext}`);
    await ff.deleteFile('thumb.jpg');
    const blob = new Blob([data.buffer], { type: 'image/jpeg' });
    return URL.createObjectURL(blob);
  }, [load]);

  // ── Concatenate clips ────────────────────────────────────
  const concatenate = useCallback(async (files) => {
    const ff = await load();
    const { fetchFile } = await import('@ffmpeg/util');
    let listContent = '';
    for (let i = 0; i < files.length; i++) {
      const name = `clip${i}.mp4`;
      await ff.writeFile(name, await fetchFile(files[i]));
      listContent += `file '${name}'\n`;
    }
    await ff.writeFile('list.txt', listContent);
    await ff.exec([
      '-f', 'concat',
      '-safe', '0',
      '-i', 'list.txt',
      '-c', 'copy',
      'output.mp4'
    ]);
    const data = await ff.readFile('output.mp4');
    for (let i = 0; i < files.length; i++) {
      await ff.deleteFile(`clip${i}.mp4`);
    }
    await ff.deleteFile('list.txt');
    await ff.deleteFile('output.mp4');
    return new Blob([data.buffer], { type: 'video/mp4' });
  }, [load]);

  // ── Full export from timeline ────────────────────────────
  const exportTimeline = useCallback(async (tracks, settings = {}) => {
    const ff = await load();
    const { fetchFile } = await import('@ffmpeg/util');
    const { resolution = '1080p', format = 'mp4', frameRate = 24 } = settings;

    const resMap = {
      '4k': '3840x2160', '1080p': '1920x1080', '720p': '1280x720',
      '480p': '854x480', 'instagram_reel': '1080x1920', 'tiktok': '1080x1920',
    };
    const scale = resMap[resolution] || '1920x1080';

    // Collect all video clips with local URLs
    const videoClips = tracks
      .filter(t => t.type === 'video')
      .flatMap(t => t.clips)
      .filter(c => c._localFile || c.mediaUrl)
      .sort((a, b) => a.startTime - b.startTime);

    if (videoClips.length === 0) throw new Error('No local video clips to export');

    let listContent = '';
    for (let i = 0; i < videoClips.length; i++) {
      const clip = videoClips[i];
      const name = `export_clip${i}.mp4`;
      if (clip._localFile) {
        await ff.writeFile(name, await fetchFile(clip._localFile));
      } else {
        const resp = await fetch(clip.mediaUrl);
        await ff.writeFile(name, await fetchFile(await resp.blob()));
      }
      listContent += `file '${name}'\n`;
    }

    await ff.writeFile('export_list.txt', listContent);
    await ff.exec([
      '-f', 'concat', '-safe', '0',
      '-i', 'export_list.txt',
      '-vf', `scale=${scale},fps=${frameRate}`,
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '192k',
      `output.${format}`
    ]);

    const data = await ff.readFile(`output.${format}`);
    for (let i = 0; i < videoClips.length; i++) {
      await ff.deleteFile(`export_clip${i}.mp4`);
    }
    await ff.deleteFile('export_list.txt');
    await ff.deleteFile(`output.${format}`);

    return new Blob([data.buffer], { type: `video/${format}` });
  }, [load]);

  return {
    load, loading, progress, error, isLoaded: () => isLoaded,
    trim, applyFilter, chromaKey, speedRamp, extractFrame,
    concatenate, exportTimeline,
  };
}
