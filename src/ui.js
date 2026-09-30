export const $ = (id) => document.getElementById(id);
export function status(message, kind = '') { const e = $('status'); e.textContent = message; e.className = `status ${kind}`; }
export function download(name, content, type = 'application/json') {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
}
export function jsonDownload(name, value) { download(name, JSON.stringify(value, null, 2) + '\n'); }
export async function readText(file, limit = 250000) {
    if (!file || file.size > limit)
        throw new Error(`Select a file no larger than ${limit.toLocaleString()} bytes.`);
    return file.text();
}
export function safeAction(fn) { return async (...args) => { try {
    await fn(...args);
}
catch (error) {
    status(error.message || String(error), 'error');
} }; }
export function el(tag, text = '', cls = '') { const e = document.createElement(tag); e.textContent = text; if (cls)
    e.className = cls; return e; }
