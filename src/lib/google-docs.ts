/**
 * Fetch text exports of link-shared Google Docs, server-side, with no Google
 * auth. Works ONLY for docs shared "anyone with the link can view" — the
 * export endpoint returns the document body directly. Org-restricted docs
 * bounce to a Google sign-in page, which we detect and surface as a
 * DocAccessError telling the submitter how to fix sharing.
 */

const DOC_ID_RE = /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/;

export const MAX_DOCS_FETCHED = 3;
export const MAX_CHARS_PER_DOC = 15_000;
export const MAX_CHARS_TOTAL = 30_000;

export class DocAccessError extends Error {
  url: string;
  constructor(url: string) {
    super(
      `This Google Doc isn't readable by the hub. Open its Share settings and set ` +
        `"Anyone with the link" → "Viewer", then retry: ${url}`,
    );
    this.name = "DocAccessError";
    this.url = url;
  }
}

export function parseGoogleDocId(url: string): string | null {
  const m = url.match(DOC_ID_RE);
  return m ? m[1] : null;
}

export interface DocExtract {
  url: string;
  text: string;
}

async function fetchExport(docId: string, format: "md" | "txt"): Promise<Response> {
  return fetch(`https://docs.google.com/document/d/${docId}/export?format=${format}`, {
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
}

function looksLikeAuthWall(res: Response): boolean {
  const finalUrl = res.url || "";
  const contentType = res.headers.get("content-type") || "";
  // Restricted docs redirect to accounts.google.com, or serve an HTML
  // interstitial instead of the plain-text/markdown export.
  return finalUrl.includes("accounts.google.com") || contentType.includes("text/html");
}

/**
 * Fetch one doc's text. Tries the markdown export first (preserves headings
 * and lists — better synthesis input), falls back to plain text.
 * Throws DocAccessError when the doc isn't link-readable.
 */
export async function fetchDocExport(url: string): Promise<DocExtract> {
  const docId = parseGoogleDocId(url);
  if (!docId) throw new Error(`Not a Google Docs URL: ${url}`);

  for (const format of ["md", "txt"] as const) {
    let res: Response;
    try {
      res = await fetchExport(docId, format);
    } catch (err) {
      // Network/timeout on the md attempt: try txt before giving up.
      if (format === "md") continue;
      throw new Error(
        `Could not reach Google Docs for ${url}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (res.ok && !looksLikeAuthWall(res)) {
      const text = (await res.text()).slice(0, MAX_CHARS_PER_DOC).trim();
      if (text) return { url, text };
      // Empty export — fall through to the next format.
      continue;
    }
    if (looksLikeAuthWall(res)) throw new DocAccessError(url);
    // Non-OK without an auth wall (e.g. 404 = bad id / deleted doc).
    if (format === "txt") {
      throw new Error(`Google Docs returned ${res.status} for ${url} — is the link correct?`);
    }
  }
  throw new Error(`Google Docs export came back empty for ${url}.`);
}

export interface ExtractResult {
  extracts: DocExtract[];
  /** Links that aren't Google Docs, or Docs beyond the fetch cap — kept as reference-only sources. */
  skipped: string[];
  errors: Array<{ url: string; reason: string; sharing: boolean }>;
}

/** Fetch up to MAX_DOCS_FETCHED Google Docs from a link list; never throws. */
export async function extractFromLinks(links: string[]): Promise<ExtractResult> {
  const extracts: DocExtract[] = [];
  const skipped: string[] = [];
  const errors: ExtractResult["errors"] = [];
  let totalChars = 0;

  for (const url of links) {
    if (!parseGoogleDocId(url)) {
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
