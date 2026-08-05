const SUPABASE_URL = process.env.SUPABASE_URL || 'https://isdczrwjtpugdwddtoiy.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_onqjgNUN378oiObqIFvKEg_Y-Sb6XBP';

exports.handler = async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, apikey, Content-Type, Accept, Prefer, X-Client-Info',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  const rawPath = event.queryStringParameters?.path || '';
  const path = String(rawPath || '').replace(/^\/+/, '');

  if (!path) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing path parameter' })
    };
  }

  // Construir URL objetivo para la REST API de Supabase
  const targetUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${path}`;

  // Priorizar cualquier cabecera de autenticación que venga del cliente (apikey / Authorization).
  // Si no vienen, usar la anon key del entorno.
  const incomingHeaders = event.headers || {};
  const upstreamHeaders = {
    Accept: 'application/json'
  };

  // Copiar content-type/accept/prefer si vienen
  for (const [key, value] of Object.entries(incomingHeaders)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'content-type' || lowerKey === 'accept' || lowerKey === 'prefer') {
      upstreamHeaders[key] = value;
    }
  }

  // Autenticación: si el cliente envía apikey/authorization, úsalas; si no, aplica la anon key del entorno
  if (incomingHeaders.apikey || incomingHeaders['apikey']) {
    upstreamHeaders.apikey = incomingHeaders.apikey || incomingHeaders['apikey'];
  } else if (incomingHeaders['ApiKey'] || incomingHeaders['APIKEY']) {
    upstreamHeaders.apikey = incomingHeaders['ApiKey'] || incomingHeaders['APIKEY'];
  } else {
    upstreamHeaders.apikey = SUPABASE_ANON_KEY;
  }

  if (incomingHeaders.authorization || incomingHeaders.Authorization) {
    upstreamHeaders.Authorization = incomingHeaders.authorization || incomingHeaders.Authorization;
  } else {
    upstreamHeaders.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
  }

  // Log útil para depuración (no incluye keys completas)
  try {
    console.log('Supabase proxy request', { method: event.httpMethod, path, targetUrl, hasAuth: Boolean(upstreamHeaders.Authorization) });
  } catch (e) {}

  const method = event.httpMethod || 'GET';
  const body = method === 'GET' || method === 'HEAD' ? undefined : event.body;

  try {
    const response = await fetch(targetUrl, {
      method,
      headers: upstreamHeaders,
      body
    });

    const text = await response.text();
    let parsedBody = text;
    try {
      parsedBody = text ? JSON.parse(text) : '';
    } catch (error) {
      parsedBody = text;
    }

    return {
      statusCode: response.status,
      headers: {
        ...headers,
        'Content-Type': response.headers.get('content-type') || 'application/json'
      },
      body: typeof parsedBody === 'string' ? parsedBody : JSON.stringify(parsedBody)
    };
  } catch (error) {
    console.error('Supabase proxy error:', String(error?.message || error));
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: 'Supabase proxy failed', details: String(error?.message || error) })
    };
  }
};
