import { FFmpeg } from './lib/index.js';
import { fetchFile } from 'https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.2/dist/esm/index.js';

const sourceInput = document.getElementById('sourceInput');
const fileDrop = document.getElementById('fileDrop');
const fileInfo = document.getElementById('fileInfo');
const convertBtn = document.getElementById('convertBtn');
const statusEl = document.getElementById('status');
const progressBar = document.getElementById('progressBar');
const preview = document.getElementById('preview');
const downloadBtn = document.getElementById('downloadBtn');
const resultCard = document.getElementById('resultCard');
const resultDetails = document.getElementById('resultDetails');

const widthInput = document.getElementById('width');
const heightInput = document.getElementById('height');
const frameRateInput = document.getElementById('frameRate');
const qualityInput = document.getElementById('quality');
const loopInput = document.getElementById('loop');

const ffmpeg = new FFmpeg();
let ffmpegReady = false;
let lastFiles = [];
const LIB_BASE_URL = new URL('./lib/', import.meta.url);

const resetProgress = () => {
  progressBar.style.width = '0%';
  statusEl.textContent = 'Waiting for source...';
};

const setStatus = (message) => {
  statusEl.textContent = message;
};

const updateProgress = (ratio) => {
  progressBar.style.width = `${Math.floor(Math.max(0, Math.min(1, ratio)) * 100)}%`;
};

const describeFiles = (files) => {
  if (!files.length) return 'No file selected';
  if (files.length === 1) {
    return `${files[0].name} (${(files[0].size / 1024 / 1024).toFixed(2)} MB)`;
  }
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  return `${files.length} PNG frames - ${(totalSize / 1024 / 1024).toFixed(2)} MB`;
};

const isPngSequence = (files) => files.length > 1 && files.every((file) => file.name.toLowerCase().endsWith('.png'));

const ensureFFmpegLoaded = async () => {
  if (ffmpegReady) return;
  setStatus('Downloading FFmpeg core (~25 MB)...');
  await ffmpeg.load({
    coreURL: new URL('ffmpeg-core.js', LIB_BASE_URL).href,
    wasmURL: new URL('ffmpeg-core.wasm', LIB_BASE_URL).href,
    workerURL: new URL('worker.js', LIB_BASE_URL).href,
  });
  ffmpeg.on('log', ({ message }) => {
    if (message) {
      setStatus(message);
    }
  });
  ffmpeg.on('progress', ({ progress }) => {
    if (progress != null) {
      updateProgress(progress);
    }
  });
  ffmpegReady = true;
};

const safeDelete = async (name) => {
  try {
    await ffmpeg.deleteFile(name);
  } catch (error) {
    if (error?.message?.includes('ENOENT')) {
      return;
    }
    console.warn('Failed to delete', name, error);
  }
};

const buildFilters = (frameRate, width, height) => {
  const filters = [];
  if (frameRate) {
    filters.push(`fps=${frameRate}`);
  }
  if (width || height) {
    const safeWidth = width || -1;
    const safeHeight = height || -1;
    filters.push(`scale=${safeWidth}:${safeHeight}:flags=lanczos`);
  }
  return filters.join(',');
};

const convertVideo = async (file, options) => {
  const inputName = file.name.replace(/[^a-z0-9._-]/gi, '_');
  const outputName = 'output.gif';
  const paletteName = 'palette.png';

  await safeDelete(inputName);
  await safeDelete(outputName);
  await safeDelete(paletteName);

  await ffmpeg.writeFile(inputName, await fetchFile(file));

  const filters = buildFilters(options.frameRate, options.width, options.height);

  const paletteFilters = filters ? `${filters},palettegen=stats_mode=diff` : 'palettegen=stats_mode=diff';
  await ffmpeg.exec(['-i', inputName, '-vf', paletteFilters, '-y', paletteName]);

  const filterComplex = filters
    ? `${filters} [x]; [x][1:v] paletteuse=dither=floyd_steinberg`
    : 'paletteuse=dither=floyd_steinberg';

  const loopArgs = options.loop != null ? ['-loop', String(options.loop)] : ['-loop', '0'];
  const qualityArgs = ['-q:v', String(options.quality)];

  const command = [
    '-i', inputName,
    '-i', paletteName,
    '-lavfi', filterComplex,
    ...qualityArgs,
    ...loopArgs,
    '-y', outputName,
  ];

  await ffmpeg.exec(command);
  const data = await ffmpeg.readFile(outputName);

  await Promise.all([safeDelete(inputName), safeDelete(paletteName), safeDelete(outputName)]);

  return new Blob([data], { type: 'image/gif' });
};

const convertPngSequence = async (files, options) => {
  const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const framePattern = 'frame_%05d.png';
  const frameNames = [];

  await Promise.all([
    safeDelete('output.gif'),
    safeDelete('palette.png'),
  ]);

  await Promise.all(
    sorted.map(async (file, index) => {
      const name = framePattern.replace('%05d', String(index + 1).padStart(5, '0'));
      frameNames.push(name);
      await safeDelete(name);
      await ffmpeg.writeFile(name, await fetchFile(file));
    })
  );

  const filters = buildFilters(options.frameRate, options.width, options.height);
  const paletteName = 'palette.png';
  const paletteFilters = filters ? `${filters},palettegen=stats_mode=diff` : 'palettegen=stats_mode=diff';

  await ffmpeg.exec(['-framerate', String(options.frameRate || 15), '-i', framePattern, '-vf', paletteFilters, '-y', paletteName]);

  const filterComplex = filters
    ? `${filters} [x]; [x][1:v] paletteuse=dither=floyd_steinberg`
    : 'paletteuse=dither=floyd_steinberg';

  const loopArgs = options.loop != null ? ['-loop', String(options.loop)] : ['-loop', '0'];
  const qualityArgs = ['-q:v', String(options.quality)];

  await ffmpeg.exec([
    '-framerate', String(options.frameRate || 15),
    '-i', framePattern,
    '-i', paletteName,
    '-lavfi', filterComplex,
    ...qualityArgs,
    ...loopArgs,
    '-y', 'output.gif',
  ]);

  const data = await ffmpeg.readFile('output.gif');

  await Promise.all([
    safeDelete('palette.png'),
    safeDelete('output.gif'),
    ...frameNames.map((name) => safeDelete(name)),
  ]);

  return new Blob([data], { type: 'image/gif' });
};

const inferConversionType = (files) => {
  if (!files.length) {
    return 'none';
  }
  if (isPngSequence(files)) {
    return 'png-sequence';
  }
  if (files.length === 1) {
    const [file] = files;
    const ext = file.name.split('.').pop().toLowerCase();
    if (['mp4', 'mov', 'avi'].includes(ext) || file.type.startsWith('video/')) {
      return 'video';
    }
    if (ext === 'png') {
      return 'single-image';
    }
  }
  return 'unsupported';
};

const getOptions = () => {
  const widthValue = Number(widthInput.value);
  const heightValue = Number(heightInput.value);
  const frameRateValue = Number(frameRateInput.value);
  let qualityValue = Number(qualityInput.value);
  let loopValue = Number(loopInput.value);

  const width = Number.isFinite(widthValue) && widthValue > 0 ? Math.round(widthValue) : undefined;
  const height = Number.isFinite(heightValue) && heightValue > 0 ? Math.round(heightValue) : undefined;
  const frameRate = Number.isFinite(frameRateValue) && frameRateValue > 0 ? Math.min(60, Math.max(1, Math.round(frameRateValue))) : undefined;

  if (!Number.isFinite(qualityValue)) {
    qualityValue = 15;
  }
  qualityValue = Math.min(31, Math.max(1, Math.round(qualityValue)));

  if (!Number.isFinite(loopValue) || loopValue < 0) {
    loopValue = 0;
  } else {
    loopValue = Math.round(loopValue);
  }

  return { width, height, frameRate, quality: qualityValue, loop: loopValue };
};

const syncSelectedFiles = (files) => {
  lastFiles = files;
  fileInfo.textContent = describeFiles(files);
  resultCard.hidden = true;
  convertBtn.disabled = !files.length;
  resetProgress();
};

const handleFilesChanged = () => {
  const files = Array.from(sourceInput.files || []);
  syncSelectedFiles(files);
};

sourceInput.addEventListener('change', handleFilesChanged);

fileDrop.addEventListener('dragover', (event) => {
  event.preventDefault();
  fileDrop.classList.add('file-drop--active');
});

fileDrop.addEventListener('dragleave', () => {
  fileDrop.classList.remove('file-drop--active');
});

fileDrop.addEventListener('drop', (event) => {
  event.preventDefault();
  fileDrop.classList.remove('file-drop--active');
  if (!event.dataTransfer) return;
  const files = Array.from(event.dataTransfer.files || []);
  if (!files.length) return;

  if (typeof DataTransfer !== 'undefined') {
    try {
      const dataTransfer = new DataTransfer();
      files.forEach((file) => dataTransfer.items.add(file));
      sourceInput.files = dataTransfer.files;
    } catch (error) {
      console.warn('Unable to update file input via DataTransfer', error);
    }
  }

  syncSelectedFiles(files);
});

const updateResult = (blob) => {
  const previousUrl = preview.dataset.url;
  if (previousUrl) {
    URL.revokeObjectURL(previousUrl);
  }

  const url = URL.createObjectURL(blob);
  preview.src = url;
  preview.dataset.url = url;
  downloadBtn.href = url;
  downloadBtn.download = `anytogif-${Date.now()}.gif`;

  resultDetails.textContent = `Size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`;
  resultCard.hidden = false;
};

convertBtn.addEventListener('click', async () => {
  const files = lastFiles;
  if (!files.length) return;

  const conversionType = inferConversionType(files);
  if (conversionType === 'unsupported') {
    setStatus('Unsupported file selection. Choose a single MP4/MOV/AVI video or multiple PNG frames.');
    return;
  }

  convertBtn.disabled = true;
  setStatus('Preparing conversion...');
  updateProgress(0);

  try {
    await ensureFFmpegLoaded();

    const options = getOptions();
    let blob;

    if (conversionType === 'video' || conversionType === 'single-image') {
      blob = await convertVideo(files[0], options);
    } else if (conversionType === 'png-sequence') {
      blob = await convertPngSequence(files, options);
    } else {
      throw new Error('Unsupported conversion type.');
    }

    setStatus('Conversion complete!');
    updateResult(blob);
  } catch (error) {
    console.error(error);
    setStatus(`Conversion failed: ${error.message}`);
  } finally {
    convertBtn.disabled = false;
    updateProgress(1);
  }
});

