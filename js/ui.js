const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2ZM8 7h8m-8 4h6"/>',
  history: '<path d="M3 12a9 9 0 1 1 2.5 6.3M3 4v8h8m1-4v4l3 2"/>',
  flag: '<path d="M5 21V4m0 1c6-5 8 5 14 0v11c-6 5-8-5-14 0"/>',
  bookmark: '<path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-4-6 4Z"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.2 9a2.8 2.8 0 0 1 5.6 0c0 2-2.8 2.3-2.8 4m0 3h.01"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18m-13 5h.01m4 0h.01m4 0h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H5m6-6-6 6 6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  circleCheck: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.6 2.6L16 9"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  edit: '<path d="m13.5 6.5 4 4M4 20l4.5-1L20 7.5a2.8 2.8 0 0 0-4-4L4.5 15Z"/>',
  filter: '<path d="M4 6h16M7 12h10m-7 6h4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  repeat: '<path d="m16 3 4 4-4 4M4 11V9a2 2 0 0 1 2-2h14M8 21l-4-4 4-4m12 0v2a2 2 0 0 1-2 2H4"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>'
};
const escapes = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export function h(value) { return String(value ?? "").replace(/[&<>"']/g, (character) => escapes[character]); }
export function icon(name, size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? ""}</svg>`;
}
export function button(label, action, name, variant = "", attributes = "") {
  return `<button type="button" class="btn ${variant}" data-action="${action}" ${attributes}>${name ? icon(name, 17) : ""}${label}</button>`;
}
export function practiceLink(set, type) { return `#practice/${set.id}/${type}`; }
export function heading(kicker, title, description, actions = "") {
  return `<header class="page-heading"><div><p class="kicker"><i></i>${kicker}</p><h1 tabindex="-1">${title}</h1><p class="subtitle">${description}</p></div>${actions ? `<div class="actions">${actions}</div>` : ""}</header>`;
}
export function panelHead(title, description, extra = "") {
  return `<header class="panel-head"><div><h2>${title}</h2><p>${description}</p></div>${extra}</header>`;
}
export function empty(name, title, description, action = "") {
  return `<div class="empty"><span class="tile">${icon(name, 22)}</span><strong>${title}</strong><p>${description}</p>${action}</div>`;
}
export function field(name, label, value, { rows, required, limit, type = "text" } = {}) {
  const attr = `name="${h(name)}"${required ? " required" : ""}${limit ? ` maxlength="${limit}"` : ""}`;
  return `<label class="field"><span>${label}</span>${rows ? `<textarea ${attr} rows="${rows}">${h(value)}</textarea>` : `<input ${attr} type="${type}" value="${h(value)}">`}</label>`;
}
