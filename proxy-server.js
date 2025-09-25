const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { URL } = require('node:url');

const port = Number(process.env.PORT) || 3000;
const rootDir = __dirname;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml; charset=utf-8',
};

const defaultFile = 'index.html';

const toSafePath = (requestPath) => {
  const safePath = path.normalize(requestPath).replace(/^\.\.(?=\\|\/|$)/, '');
  return safePath === '/' ? defaultFile : safePath;
};

const serveFile = async (filePath, res, headOnly) => {
  try {
    const data = await fs.readFile(filePath);
    const type = mimeTypes[path.extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    if (headOnly) {
      res.end();
      return;
    }
    res.end(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    console.error('Failed to serve', filePath, error);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal server error');
  }
};

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400).end();
    return;
  }

  const method = req.method || 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end();
    return;
  }

  const requestUrl = new URL(req.url, 'http://localhost');
  const requestPath = decodeURIComponent(requestUrl.pathname);

  const safeRelative = toSafePath(requestPath);
  let filePath = path.join(rootDir, safeRelative);

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, defaultFile);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Stat failed', filePath, error);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal server error');
      return;
    }
  }

  serveFile(filePath, res, method === 'HEAD');
});

server.listen(port, () => {
  console.log(`AnytoGif dev server listening on http://localhost:${port}`);
});
