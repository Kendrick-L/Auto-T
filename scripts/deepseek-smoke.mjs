import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env');
const env = {
  ...readDotEnv(envPath),
  ...process.env,
};

const apiKey = String(env.WXT_DEEPSEEK_API_KEY || env.DEEPSEEK_API_KEY || '').trim();

if (!apiKey) {
  console.error('DeepSeek smoke test skipped: missing WXT_DEEPSEEK_API_KEY or DEEPSEEK_API_KEY.');
  process.exit(1);
}

const response = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'deepseek-chat',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'Return valid JSON only.',
      },
      {
        role: 'user',
        content:
          'Translate the string "Hello world" to Simplified Chinese. Return {"translation":"..."} and no other fields.',
      },
    ],
  }),
});

if (!response.ok) {
  console.error(`DeepSeek smoke test failed: ${response.status} ${response.statusText}`);
  process.exit(1);
}

const data = await response.json();
const content = data?.choices?.[0]?.message?.content;

if (typeof content !== 'string' || !content.includes('translation')) {
  console.error('DeepSeek smoke test failed: response did not include translation JSON.');
  process.exit(1);
}

console.log('DeepSeek smoke test passed: translation JSON received.');

function readDotEnv(path) {
  if (!existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        const key = line.slice(0, index).trim();
        const rawValue = line.slice(index + 1).trim();
        const value = rawValue.replace(/^['"]|['"]$/g, '');
        return [key, value];
      }),
  );
}
