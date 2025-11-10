// Vercel Serverless API: Proxy to Google Apps Script and add CORS
// Set the GAS endpoint in Vercel Project Settings -> Environment Variables:
//   GAS_WEB_APP_URL = https://script.google.com/macros/s/XXXX/exec

module.exports = async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const GAS_URL = process.env.GAS_WEB_APP_URL;
  if (!GAS_URL) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ status: 'error', message: 'Missing GAS_WEB_APP_URL env var' });
  }

  try {
    let payload = req.body || {};
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload || '{}'); } catch (_) { payload = {}; }
    }

    const fRes = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // Try to proxy status and body
    let data = null;
    try {
      data = await fRes.json();
    } catch (e) {
      data = { status: fRes.ok ? 'success' : 'error' };
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(fRes.ok ? 200 : fRes.status).json(data);
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ status: 'error', message: String(err) });
  }
}
