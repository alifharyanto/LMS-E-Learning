export const MATERIAL_RICH_HTML_PREFIX = "<!-- courseup-rich-html -->\n";

export function isMaterialRichHtml(content: string) {
  return content.startsWith(MATERIAL_RICH_HTML_PREFIX);
}

export function getMaterialRichHtml(content: string) {
  return content.slice(MATERIAL_RICH_HTML_PREFIX.length);
}

export function storeMaterialRichHtml(content: string) {
  return `${MATERIAL_RICH_HTML_PREFIX}${content}`;
}
