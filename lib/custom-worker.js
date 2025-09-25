const workerUrl = new URL('./worker.js', import.meta.url);

export const getWorkerURL = () => workerUrl;

export const createFFmpegWorker = (options = {}) => new Worker(workerUrl, { type: 'module', ...options });
