const PREFIX = '[Auto-T Debug]';
const LOCAL_STORAGE_KEY = 'AUTO_T_DEBUG';
const DEBUG_ENDPOINT = 'http://127.0.0.1:38475/debug-log';

export type DebugSegmentLike = {
  id?: string;
  tagName?: string;
  tag?: string;
  text?: string;
  source?: string;
  translation?: string;
};

export function debugGroup(enabled: boolean | undefined, label: string, details?: unknown) {
  if (!enabled) return;

  if (details === undefined) {
    console.log(`${PREFIX} ${label}`);
    sendDebugRecord('group', label);
    return;
  }

  console.groupCollapsed(`${PREFIX} ${label}`);
  console.log(details);
  console.groupEnd();
  sendDebugRecord('group', label, details);
}

export function debugSegments(enabled: boolean | undefined, label: string, segments: DebugSegmentLike[]) {
  if (!enabled) return;
  const rows = segments.map((segment, index) => ({
    index,
    id: segment.id ?? '',
    tag: segment.tagName ?? segment.tag ?? '',
    sourceLength: (segment.source ?? segment.text ?? '').length,
    translationLength: (segment.translation ?? '').length,
    source: segment.source ?? segment.text ?? '',
    translation: segment.translation ?? '',
  }));

  console.groupCollapsed(`${PREFIX} ${label}: ${segments.length}`);
  console.table(rows);
  console.groupEnd();
  sendDebugRecord('segments', label, rows);
}

export function debugError(enabled: boolean | undefined, label: string, error: unknown) {
  if (!enabled) return;
  console.error(`${PREFIX} ${label}`, error);
  sendDebugRecord('error', label, serializeError(error));
}

export function isLocalDebugEnabled() {
  try {
    return globalThis.localStorage?.getItem(LOCAL_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function sendDebugRecord(kind: string, label: string, details?: unknown) {
  const record = {
    kind,
    label,
    details: toJsonSafe(details),
    context: getDebugContext(),
    timestamp: new Date().toISOString(),
  };

  try {
    void fetch(DEBUG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    }).catch(() => undefined);
  } catch {
    // The local debug server is optional.
  }
}

function getDebugContext() {
  return {
    url: globalThis.location?.href ?? '',
    title: globalThis.document?.title ?? '',
    userAgent: globalThis.navigator?.userAgent ?? '',
  };
}

function toJsonSafe(value: unknown) {
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, item) => {
        if (item instanceof Error) return serializeError(item);
        if (typeof Element !== 'undefined' && item instanceof Element) return describeElement(item);
        return item;
      }),
    ) as unknown;
  } catch {
    return String(value);
  }
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return error;
}

function describeElement(element: Element) {
  return {
    tagName: element.tagName.toLowerCase(),
    id: element.id,
    className: element.className,
    outerHTML: element.outerHTML.slice(0, 4000),
  };
}
