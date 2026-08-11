const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, apikey, Content-Type, Accept, Prefer, X-Client-Info',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS'
  });
  res.end(body);
}

function sendText(res, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, apikey, Content-Type, Accept, Prefer, X-Client-Info',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS'
  });
  res.end(body);
}

function resolveSafePath(requestPath) {
  const normalizedPath = requestPath === '/' ? '/index.html' : requestPath;
  const decodedPath = decodeURIComponent(normalizedPath);
  const relativePath = decodedPath.replace(/^\/+/, '');
  const absolutePath = path.resolve(ROOT_DIR, relativePath);

  if (!absolutePath.startsWith(ROOT_DIR)) {
    return null;
  }

  return absolutePath;
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      if (error.code === 'ENOENT') {
        sendText(res, 404, 'Not found');
      } else {
        sendText(res, 500, 'Internal server error');
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
}

async function proxySupabase(req, res, url) {
  const headers = {
    Accept: 'application/json'
  };

  const incomingHeaders = req.headers || {};
  for (const [key, value] of Object.entries(incomingHeaders)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'content-type' || lowerKey === 'accept' || lowerKey === 'prefer') {
      headers[key] = value;
    }
  }

  const pathParam = url.searchParams.get('path') || '';
  const normalizedPath = String(pathParam || '').replace(/^\/+/, '');

  if (!normalizedPath) {
    sendJson(res, 400, { error: 'Missing path parameter' });
    return;
  }

  const supabaseUrl = (process.env.SUPABASE_URL || 'https://isdczrwjtpugdwddtoiy.supabase.co').replace(/\/$/, '');
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_onqjgNUN378oiObqIFvKEg_Y-Sb6XBP';
  const targetUrl = `${supabaseUrl}/rest/v1/${normalizedPath}`;

  if (incomingHeaders.apikey) {
    headers.apikey = incomingHeaders.apikey;
  } else if (incomingHeaders['x-api-key']) {
    headers.apikey = incomingHeaders['x-api-key'];
  } else {
    headers.apikey = supabaseAnonKey;
  }

  if (incomingHeaders.authorization) {
    headers.Authorization = incomingHeaders.authorization;
  } else {
    headers.Authorization = `Bearer ${supabaseAnonKey}`;
  }

  try {
    const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readBody(req);

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body
    });

    const text = await response.text();
    let parsedBody = text;
    try {
      parsedBody = text ? JSON.parse(text) : '';
    } catch (error) {
      parsedBody = text;
    }

    res.writeHead(response.status, {
      'Content-Type': response.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, apikey, Content-Type, Accept, Prefer, X-Client-Info',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS'
    });
    res.end(typeof parsedBody === 'string' ? parsedBody : JSON.stringify(parsedBody));
  } catch (error) {
    console.error('Supabase proxy error:', error);
    sendJson(res, 502, { error: 'Supabase proxy failed', details: String(error?.message || error) });
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(requestUrl.pathname);

  if (req.method === 'OPTIONS') {
    sendText(res, 200, '', 'text/plain; charset=utf-8');
    return;
  }

  if (pathname === '/health') {
    sendJson(res, 200, { status: 'ok', service: 'nakama-reportes' });
    return;
  }

  if (pathname === '/.netlify/functions/get-supabase-config') {
    sendJson(res, 200, {
      url: process.env.SUPABASE_URL || 'https://isdczrwjtpugdwddtoiy.supabase.co',
      anonKey: process.env.SUPABASE_ANON_KEY || 'sb_publishable_onqjgNUN378oiObqIFvKEg_Y-Sb6XBP'
    });
    return;
  }

  if (pathname === '/.netlify/functions/supabase-proxy') {
    await proxySupabase(req, res, requestUrl);
    return;
  }

  const safePath = resolveSafePath(pathname);
  if (!safePath) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  if (!fs.existsSync(safePath)) {
    const indexPath = path.join(ROOT_DIR, 'index.html');
    if (pathname === '/' || pathname === '/index.html') {
      serveFile(res, indexPath);
      return;
    }
    sendText(res, 404, 'Not found');
    return;
  }

  serveFile(res, safePath);
});

server.listen(PORT, HOST, () => {
  console.log(`Servidor listo en http://${HOST}:${PORT}`);
});
