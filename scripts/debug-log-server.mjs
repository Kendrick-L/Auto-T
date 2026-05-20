import { createServer } from 'node:http';
import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import { join } from 'node:path';

const PORT = 38475;
const ROOT = process.cwd();
const LOG_DIR = join(ROOT, 'debug-logs');
const JSONL_PATH = join(LOG_DIR, 'auto-t-latest.jsonl');
const SNAPSHOT_PATH = join(LOG_DIR, 'auto-t-latest.json');

await mkdir(LOG_DIR, { recursive: true });
await writeFile(JSONL_PATH, '', 'utf8');
await writeFile(SNAPSHOT_PATH, JSON.stringify({ records: [] }, null, 2), 'utf8');

const records = [];

const server = createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method !== 'POST' || request.url !== '/debug-log') {
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ ok: false, error: 'Not found' }));
    return;
  }

  try {
    const body = await readBody(request);
    const record = JSON.parse(body);
    records.push(record);
    await appendFile(JSONL_PATH, `${JSON.stringify(record)}\n`, 'utf8');
    await writeFile(SNAPSHOT_PATH, JSON.stringify({ records }, null, 2), 'utf8');
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ ok: true, count: records.length }));
  } catch (error) {
    response.writeHead(400, { 'Content-Type': 'application/json' });
    response.end(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'Invalid debug payload',
      }),
    );
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Auto-T debug log server listening at http://127.0.0.1:${PORT}/debug-log`);
  console.log(`Writing JSONL to ${JSONL_PATH}`);
  console.log(`Writing snapshot to ${SNAPSHOT_PATH}`);
});

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 8_000_000) {
        request.destroy();
        reject(new Error('Debug payload too large'));
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}
