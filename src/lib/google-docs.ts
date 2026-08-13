/**
 * Fetch text exports of link-shared Google Workspace files (Docs, Slides,
 * Sheets), server-side, with no Google auth. Works ONLY for files shared
 * "anyone with the link can view" — the export endpoints return the content
 * directly. Restricted files bounce to a Google sign-in page, which we detect
 * and surface as a DocAccessError telling the submitter how to fix sharing.
 */

export type GoogleFileKind = "document" | "presentation" | "spreadsheet";

const GOOGLE_FILE_RE =
  /docs\.google\.com\/(document|presentation|spreadsheets)\/d\/([a-zA-Z0-9_-]+)/;

export const MAX_DOCS_FETCHED = 3;
export const MAX_CHARS_PER_DOC = 15_000;
export const MAX_CHARS_TOTAL = 30_000;

export class DocAccessError extends Error {
  url: string;
  constructor(url: string, kind: GoogleFileKind) {
    const label = kind === "presentation" ? "Slides deck" : kind === "spreadsheet" ? "Sheet" : "Doc";
    super(
      `This Google ${label} isn't readable by the hub. Open its Share settings and set ` +
        `"Anyone with the link" → "Viewer", then retry: ${url}`,
    );
    this.name = "DocAccessError";
    this.url = url;
  }
}

export function parseGoogleFile(url: string): { kind: GoogleFileKind; id: string } | null {
  const m = url.match(GOOGLE_FILE_RE);
  if (!m) return null;
  const kind: GoogleFileKind =
    m[1] === "presentation" ? "presentation" : m[1] === "spreadsheets" ? "spreadsheet" : "document";
  return { kind, id: m[2] };
}

/** Back-compat helper: is this any fetchable Google Workspace link? */
export function parseGoogleDocId(url: string): string | null {
  return parseGoogleFile(url)?.id ?? null;
}

export interface DocExtract {
  url: string;
  text: string;
}

/** Export URL attempts per file kind, best format first. */
function exportUrls(kind: GoogleFileKind, id: string): string[] {
  switch (kind) {
    case "document":
      return [
        `https://docs.google.com/document/d/${id}/export?format=md`,
        `https://docs.google.com/document/d/${id}/export?format=txt`,
      ];
    case "presentation":
      // Slides: plain-text export of the whole deck (titles, bullets, notes).
      return [`https://docs.google.com/presentation/d/${id}/export/txt`];
    case "spreadsheet":
      // First sheet as CSV — usually where the substance lives.
      return [`https://docs.google.com/spreadsheets/d/${id}/export?format=csv`];
  }
}

function looksLikeAuthWall(res: Response): boolean {
  const finalUrl = res.url || "";
  const contentType = res.headers.get("content-type") || "";
  // Restricted files redirect to accounts.google.com, or serve an HTML
  // interstitial instead of the text/markdown/csv export.
  return finalUrl.includes("accounts.google.com") || contentType.includes("text/html");
}

/**
 * Fetch one Google file's text. Throws DocAccessError when it isn't
 * link-readable.
 */
export async function fetchDocExport(url: string): Promise<DocExtract> {
  const file = parseGoogleFile(url);
  if (!file) throw new Error(`Not a Google Docs/Slides/Sheets URL: ${url}`);

  const attempts = exportUrls(file.kind, file.id);
  let lastStatus: number | null = null;
  for (let i = 0; i < attempts.length; i++) {
    const isLast = i === attempts.length - 1;
    let res: Response;
    try {
      res = await fetch(attempts[i], {
        redirect: "follow",
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      if (!isLast) continue;
      throw new Error(
        `Could not reach Google for ${url}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (looksLikeAuthWall(res)) throw new DocAccessError(url, file.kind);
    if (res.ok) {
      const text = (await res.text()).slice(0, MAX_CHARS_PER_DOC).trim();
      if (text) return { url, text };
      if (!isLast) continue;
      throw new Error(`Google export came back empty for ${url}.`);
    }
    lastStatus = res.status;
    if (isLast) {
      throw new Error(`Google returned ${lastStatus} for ${url} — is the link correct?`);
    }
  }
  throw new Error(`Google export failed for ${url}.`);
}

export interface ExtractResult {
  extracts: DocExtract[];
  /** Links that aren't Google files, or files beyond the fetch cap — kept as reference-only sources. */
  skipped: string[];
  errors: Array<{ url: string; reason: string; sharing: boolean }>;
}

/** Fetch up to MAX_DOCS_FETCHED Google files from a link list; never throws. */
export async function extractFromLinks(links: string[]): Promise<ExtractResult> {
  const extracts: DocExtract[] = [];
  const skipped: string[] = [];
  const errors: ExtractResult["errors"] = [];
  let totalChars = 0;

  for (const url of links) {
    if (!parseGoogleFile(url)) {
      skipped.push(url);
      continue;
    }
    if (extracts.length >= MAX_DOCS_FETCHED || totalChars >= MAX_CHARS_TOTAL) {
      skipped.push(url);
      continue;
    }
    try {
      const extract = await fetchDocExport(url);
      const budget = MAX_CHARS_TOTAL - totalChars;
      extract.text = extract.text.slice(0, budget);
      totalChars += extract.text.length;
      extracts.push(extract);
    } catch (err) {
      errors.push({
        url,
        reason: err instanceof Error ? err.message : String(err),
        sharing: err instanceof DocAccessError,
      });
    }
  }
  return { extracts, skipped, errors };
}
