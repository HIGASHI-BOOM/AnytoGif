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

const languageSelect = document.getElementById('languageSelect');
const languageLabel = document.querySelector('[data-i18n="languageLabel"]');
const headerTitleEl = document.querySelector('[data-i18n="headerTitle"]');
const taglineEl = document.querySelector('[data-i18n="tagline"]');
const stepLoadEl = document.querySelector('[data-i18n="stepLoad"]');
const hintEl = document.querySelector('[data-i18n="hint"]');
const stepConfigureEl = document.querySelector('[data-i18n="stepConfigure"]');
const stepProgressEl = document.querySelector('[data-i18n="stepProgress"]');
const stepResultEl = document.querySelector('[data-i18n="stepResult"]');
const fileDropPromptEl = document.querySelector('[data-i18n="fileDropPrompt"]');
const widthLabelEl = document.querySelector('[data-i18n="widthLabel"]');
const heightLabelEl = document.querySelector('[data-i18n="heightLabel"]');
const frameRateLabelEl = document.querySelector('[data-i18n="frameRateLabel"]');
const qualityLabelEl = document.querySelector('[data-i18n="qualityLabel"]');
const loopLabelEl = document.querySelector('[data-i18n="loopLabel"]');
const loopHintEl = document.querySelector('[data-i18n="loopHint"]');
const convertButtonEl = document.querySelector('[data-i18n="convertButton"]');
const footerNoteEl = document.querySelector('[data-i18n="footerNote"]');

const widthInput = document.getElementById('width');
const heightInput = document.getElementById('height');
const frameRateInput = document.getElementById('frameRate');
const qualityInput = document.getElementById('quality');
const loopInput = document.getElementById('loop');

const ffmpeg = new FFmpeg();
let ffmpegReady = false;
let lastFiles = [];
let lastResultSizeMB = null;
const LIB_BASE_URL = new URL('./lib/', import.meta.url);

const translations = {
  zh: {
    pageTitle: 'Any to GIF 专业版',
    languageLabel: '语言',
    languageOptions: {
      zh: '中文',
      en: '英语',
    },
    headerTitle: 'Any to GIF 专业版',
    tagline: '在浏览器中将 MP4 / MOV / AVI 视频或 PNG 序列转换为优化的 GIF。',
    steps: {
      load: '1. 选择源文件',
      configure: '2. 配置输出',
      progress: '3. 转换进度',
      result: '4. 转换结果',
    },
    hint: '支持 H.264 MP4、带透明通道的 MOV/AVI，以及带透明度的 PNG 图像序列。',
    fileDropPrompt: '点击选择文件或将文件拖放到此处',
    fileInfo: {
      none: '未选择文件',
      single: ({ name, sizeMB }) => `${name}（${sizeMB.toFixed(2)} MB）`,
      multiple: ({ count, sizeMB }) => `${count} 张 PNG 帧 - ${sizeMB.toFixed(2)} MB`,
    },
    options: {
      width: '宽度（像素）',
      height: '高度（像素）',
      frameRate: '帧率（fps）',
      quality: '质量（1-31）',
      loop: '循环次数',
      loopHint: '0 表示无限循环',
      widthPlaceholder: '自动',
      heightPlaceholder: '自动',
    },
    buttons: {
      convert: '转换为 GIF',
      download: '下载 GIF',
    },
    status: {
      waiting: '等待源文件...',
      downloading: '正在下载 FFmpeg 核心（约 25 MB）...',
      preparing: '正在准备转换...',
      unsupported: '不支持的文件选择。请选择一个 MP4/MOV/AVI 视频或多个 PNG 帧。',
      complete: '转换完成！',
      failed: ({ error }) => `转换失败：${error}`,
    },
    resultSize: ({ sizeMB }) => `大小：${sizeMB.toFixed(2)} MB`,
    footer: '所有转换均在本地使用 <a href="https://ffmpegwasm.netlify.app/" target="_blank" rel="noreferrer">FFmpeg.wasm</a> 完成，无需上传。',
  },
  en: {
    pageTitle: 'Any to GIF Pro',
    languageLabel: 'Language',
    languageOptions: {
      zh: 'Chinese',
      en: 'English',
    },
    headerTitle: 'Any to GIF Pro',
    tagline: 'Convert MP4 / MOV / AVI videos or PNG sequences into optimized GIFs directly in your browser.',
    steps: {
      load: '1. Load your source',
      configure: '2. Configure output',
      progress: '3. Progress',
      result: '4. Result',
    },
    hint: 'Supports H.264 MP4, alpha MOV/AVI, and PNG image sequences with transparency.',
    fileDropPrompt: 'Click to browse or drop files here',
    fileInfo: {
      none: 'No file selected',
      single: ({ name, sizeMB }) => `${name} (${sizeMB.toFixed(2)} MB)`,
      multiple: ({ count, sizeMB }) => `${count} PNG frames - ${sizeMB.toFixed(2)} MB`,
    },
    options: {
      width: 'Width (px)',
      height: 'Height (px)',
      frameRate: 'Frame rate (fps)',
      quality: 'Quality (1-31)',
      loop: 'Loop count',
      loopHint: '0 means infinite looping',
      widthPlaceholder: 'Auto',
      heightPlaceholder: 'Auto',
    },
    buttons: {
      convert: 'Convert to GIF',
      download: 'Download GIF',
    },
    status: {
      waiting: 'Waiting for source...',
      downloading: 'Downloading FFmpeg core (~25 MB)...',
      preparing: 'Preparing conversion...',
      unsupported: 'Unsupported file selection. Choose a single MP4/MOV/AVI video or multiple PNG frames.',
      complete: 'Conversion complete!',
      failed: ({ error }) => `Conversion failed: ${error}`,
    },
    resultSize: ({ sizeMB }) => `Size: ${sizeMB.toFixed(2)} MB`,
    footer: 'All conversions happen locally using <a href="https://ffmpegwasm.netlify.app/" target="_blank" rel="noreferrer">FFmpeg.wasm</a>. No uploads required.',
  },
};

let currentLanguage = 'zh';
let currentStatus = { type: 'key', key: 'waiting', args: [] };

const updateStatusDisplay = () => {
  const languagePack = translations[currentLanguage];
  if (!languagePack) return;

  if (currentStatus.type === 'key') {
    const renderer = languagePack.status[currentStatus.key];
    if (typeof renderer === 'function') {
      statusEl.textContent = renderer({ ...(currentStatus.args[0] || {}) });
    } else if (typeof renderer === 'string') {
      statusEl.textContent = renderer;
    } else {
      statusEl.textContent = '';
    }
  } else if (currentStatus.type === 'message') {
    statusEl.textContent = currentStatus.message;
  }
};

const setStatusKey = (key, params = {}) => {
  currentStatus = { type: 'key', key, args: [params] };
  updateStatusDisplay();
};

const setStatusMessage = (message) => {
  currentStatus = { type: 'message', message };
  updateStatusDisplay();
};

const describeFiles = (files) => {
  const languagePack = translations[currentLanguage];
  const formatter = languagePack?.fileInfo;
  if (!files.length) return formatter?.none ?? '';
  if (files.length === 1) {
    const [file] = files;
    const sizeMB = file.size / 1024 / 1024;
    return formatter?.single ? formatter.single({ name: file.name, sizeMB }) : '';
  }
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const sizeMB = totalSize / 1024 / 1024;
  return formatter?.multiple ? formatter.multiple({ count: files.length, sizeMB }) : '';
};

const updateFileInfo = () => {
  fileInfo.textContent = describeFiles(lastFiles);
};

const applyTranslations = (lang) => {
  if (!translations[lang]) return;
  currentLanguage = lang;
  const languagePack = translations[lang];

  document.documentElement.lang = lang;
  document.title = languagePack.pageTitle;

  if (languageLabel) {
    languageLabel.textContent = languagePack.languageLabel;
  }

  if (languageSelect) {
    languageSelect.value = lang;
    Array.from(languageSelect.options).forEach((option) => {
      const label = languagePack.languageOptions[option.value];
      if (label) {
        option.textContent = label;
      }
    });
  }

  if (headerTitleEl) headerTitleEl.textContent = languagePack.headerTitle;
  if (taglineEl) taglineEl.textContent = languagePack.tagline;
  if (stepLoadEl) stepLoadEl.textContent = languagePack.steps.load;
  if (stepConfigureEl) stepConfigureEl.textContent = languagePack.steps.configure;
  if (stepProgressEl) stepProgressEl.textContent = languagePack.steps.progress;
  if (stepResultEl) stepResultEl.textContent = languagePack.steps.result;
  if (hintEl) hintEl.textContent = languagePack.hint;
  if (fileDropPromptEl) fileDropPromptEl.textContent = languagePack.fileDropPrompt;
  if (widthLabelEl) widthLabelEl.textContent = languagePack.options.width;
  if (heightLabelEl) heightLabelEl.textContent = languagePack.options.height;
  if (frameRateLabelEl) frameRateLabelEl.textContent = languagePack.options.frameRate;
  if (qualityLabelEl) qualityLabelEl.textContent = languagePack.options.quality;
  if (loopLabelEl) loopLabelEl.textContent = languagePack.options.loop;
  if (loopHintEl) loopHintEl.textContent = languagePack.options.loopHint;
  if (widthInput) widthInput.placeholder = languagePack.options.widthPlaceholder;
  if (heightInput) heightInput.placeholder = languagePack.options.heightPlaceholder;
  if (convertButtonEl) convertButtonEl.textContent = languagePack.buttons.convert;
  if (downloadBtn) downloadBtn.textContent = languagePack.buttons.download;
  if (footerNoteEl) footerNoteEl.innerHTML = languagePack.footer;

  updateFileInfo();

  if (lastResultSizeMB != null) {
    const formatter = languagePack.resultSize;
    resultDetails.textContent = typeof formatter === 'function'
      ? formatter({ sizeMB: lastResultSizeMB })
      : '';
  }

  updateStatusDisplay();
};

if (languageSelect) {
  languageSelect.addEventListener('change', (event) => {
    applyTranslations(event.target.value);
  });
}

const resetProgress = () => {
  progressBar.style.width = '0%';
  setStatusKey('waiting');
};

const updateProgress = (ratio) => {
  progressBar.style.width = `${Math.floor(Math.max(0, Math.min(1, ratio)) * 100)}%`;
};

const isPngSequence = (files) => files.length > 1 && files.every((file) => file.name.toLowerCase().endsWith('.png'));

const ensureFFmpegLoaded = async () => {
  if (ffmpegReady) return;
  setStatusKey('downloading');
  await ffmpeg.load({
    coreURL: new URL('ffmpeg-core.js', LIB_BASE_URL).href,
    wasmURL: new URL('ffmpeg-core.wasm', LIB_BASE_URL).href,
    workerURL: new URL('worker.js', LIB_BASE_URL).href,
  });
  ffmpeg.on('log', ({ message }) => {
    if (message) {
      setStatusMessage(message);
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
  updateFileInfo();
  lastResultSizeMB = null;
  resultDetails.textContent = '';
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

  lastResultSizeMB = blob.size / 1024 / 1024;
  const formatter = translations[currentLanguage]?.resultSize;
  resultDetails.textContent = typeof formatter === 'function'
    ? formatter({ sizeMB: lastResultSizeMB })
    : '';
  resultCard.hidden = false;
};

convertBtn.addEventListener('click', async () => {
  const files = lastFiles;
  if (!files.length) return;

  const conversionType = inferConversionType(files);
  if (conversionType === 'unsupported') {
    setStatusKey('unsupported');
    return;
  }

  convertBtn.disabled = true;
  setStatusKey('preparing');
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

    setStatusKey('complete');
    updateResult(blob);
  } catch (error) {
    console.error(error);
    setStatusKey('failed', { error: error?.message ?? '' });
  } finally {
    convertBtn.disabled = false;
    updateProgress(1);
  }
});

applyTranslations(currentLanguage);
resetProgress();

