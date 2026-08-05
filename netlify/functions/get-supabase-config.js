exports.handler = async function handler() {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  const url = process.env.SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || '';

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ url, anonKey })
  };
};
