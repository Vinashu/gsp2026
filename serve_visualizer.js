#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');
const { buildPuzzleCatalog, loadPuzzleSpecByCatalogEntry } = require('./puzzle_catalog');
const { traceSolve, DEFAULT_MAX_MOVES } = require('./solver_trace');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 4317);
const VISUALIZER_ROOT = path.join(__dirname, 'visualizer');
const traceCache = new Map();

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(text);
}

function getMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.html') return 'text/html; charset=utf-8';
  if (extension === '.css') return 'text/css; charset=utf-8';
  if (extension === '.js') return 'application/javascript; charset=utf-8';
  if (extension === '.json') return 'application/json; charset=utf-8';
  if (extension === '.png') return 'image/png';
  if (extension === '.svg') return 'image/svg+xml';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

function safeJoin(basePath, requestedPath) {
  const resolvedPath = path.resolve(basePath, '.' + requestedPath);
  if (!resolvedPath.startsWith(basePath)) {
    return null;
  }
  return resolvedPath;
}

function serveStaticFile(response, absolutePath) {
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    sendText(response, 404, 'Not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': getMimeType(absolutePath),
    'Cache-Control': 'no-store'
  });
  fs.createReadStream(absolutePath).pipe(response);
}

function handleApi(requestUrl, response) {
  if (requestUrl.pathname === '/api/health') {
    sendJson(response, 200, { ok: true });
    return true;
  }

  if (requestUrl.pathname === '/api/puzzles') {
    const puzzles = buildPuzzleCatalog();
    sendJson(response, 200, {
      total: puzzles.length,
      puzzles
    });
    return true;
  }

  if (requestUrl.pathname === '/api/trace') {
    const puzzleId = requestUrl.searchParams.get('id');
    const maxMovesText = requestUrl.searchParams.get('maxMoves');
    const refresh = requestUrl.searchParams.get('refresh') === '1';

    if (!puzzleId) {
      sendJson(response, 400, { error: 'Missing required query parameter: id' });
      return true;
    }

    const maxMoves = maxMovesText ? Number(maxMovesText) : DEFAULT_MAX_MOVES;
    if (!Number.isFinite(maxMoves) || maxMoves <= 0) {
      sendJson(response, 400, { error: `Invalid maxMoves value: ${maxMovesText}` });
      return true;
    }

    const cacheKey = `${puzzleId}:${maxMoves}`;
    if (!refresh && traceCache.has(cacheKey)) {
      sendJson(response, 200, traceCache.get(cacheKey));
      return true;
    }

    const catalogEntry = buildPuzzleCatalog().find(entry => entry.id === puzzleId);
    if (!catalogEntry) {
      sendJson(response, 404, { error: `Puzzle "${puzzleId}" was not found.` });
      return true;
    }

    const spec = loadPuzzleSpecByCatalogEntry(catalogEntry);
    const trace = traceSolve(spec, { maxMoves });
    traceCache.set(cacheKey, trace);
    sendJson(response, 200, trace);
    return true;
  }

  return false;
}

function createServer() {
  return http.createServer((request, response) => {
    try {
      const requestUrl = new URL(request.url, `http://${request.headers.host || `${HOST}:${PORT}`}`);

      if (handleApi(requestUrl, response)) {
        return;
      }

      if (requestUrl.pathname === '/') {
        response.writeHead(302, { Location: '/visualizer/' });
        response.end();
        return;
      }

      if (requestUrl.pathname === '/favicon.ico') {
        response.writeHead(204);
        response.end();
        return;
      }

      if (requestUrl.pathname.startsWith('/visualizer/')) {
        const requestedPath = requestUrl.pathname.replace('/visualizer', '') || '/index.html';
        const absolutePath = safeJoin(VISUALIZER_ROOT, requestedPath === '/' ? '/index.html' : requestedPath);
        if (!absolutePath) {
          sendText(response, 400, 'Bad request');
          return;
        }
        serveStaticFile(response, absolutePath);
        return;
      }

      if (requestUrl.pathname.startsWith('/images/')) {
        const absolutePath = safeJoin(path.join(__dirname, 'images'), requestUrl.pathname.replace('/images', ''));
        if (!absolutePath) {
          sendText(response, 400, 'Bad request');
          return;
        }
        serveStaticFile(response, absolutePath);
        return;
      }

      sendText(response, 404, 'Not found');
    } catch (error) {
      sendJson(response, 500, { error: error.message });
    }
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, HOST, () => {
    console.log(`GSP visualizer server running at http://${HOST}:${PORT}/visualizer/`);
  });
}

module.exports = { createServer };
