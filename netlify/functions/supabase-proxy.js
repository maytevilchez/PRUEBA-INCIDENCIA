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

  const targetUrl = `${SUPABASE_URL}/rest/v1/${path}`;
  const upstreamHeaders = {
    Accept: 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`
  };

  const incomingHeaders = event.headers || {};
  for (const [key, value] of Object.entries(incomingHeaders)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'content-type' || lowerKey === 'accept' || lowerKey === 'prefer' || lowerKey === 'apikey' || lowerKey === 'authorization') {
      upstreamHeaders[key] = value;
    }
  }

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
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: 'Supabase proxy failed', details: String(error?.message || error) })
    };
  }
};
