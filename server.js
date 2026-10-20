const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'tests.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
const load = () => {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return []; }
};
const save = (rows) => fs.writeFileSync(DATA_FILE, JSON.stringify(rows, null, 2));

const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'Content-Type': type });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
};

http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (req.method === 'GET' && (url === '/' || url === '/index.html')) {
    return send(res, 200, fs.readFileSync(path.join(__dirname, 'public', 'index.html')), 'text/html');
  }
  if (url === '/api/tests' && req.method === 'GET') return send(res, 200, load());
  if (url === '/api/tests' && req.method === 'POST') {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try {
        const { name, result } = JSON.parse(raw);
        if (!name || !String(name).trim() || !result) return send(res, 400, { error: 'name and result required' });
        const rows = load();
        const row = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: String(name).trim(), result: String(result).trim(), createdAt: new Date().toISOString() };
        rows.push(row);
        save(rows);
        send(res, 201, row);
      } catch { send(res, 400, { error: 'invalid JSON' }); }
    });
    return;
  }
  const m = url.match(/^\/api\/tests\/(\w+)$/);
  if (m && req.method === 'DELETE') {
    save(load().filter((r) => r.id !== m[1]));
    return send(res, 200, { ok: true });
  }
  send(res, 404, { error: 'not found' });
}).listen(PORT, '0.0.0.0', () => console.log('Listening on ' + PORT));
