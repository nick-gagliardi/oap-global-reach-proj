/**
 * Minimal GitHub REST helper for the incorporation pipeline: branch a content
 * repo, commit one file, open a PR. Raw fetch — no SDK dependency. Server-side
 * only (needs HUB_GITHUB_TOKEN, a PAT with repo scope on the hub repo).
 */

const API = "https://api.github.com";

export function getGithubConfig(): { token: string | null; repo: string; baseBranch: string } {
  return {
    token: process.env.HUB_GITHUB_TOKEN || null,
    repo: process.env.HUB_GITHUB_REPO || "nickgag626/oap-global-reach-hub",
    baseBranch: process.env.HUB_GITHUB_BASE_BRANCH || "main",
  };
}

async function gh(token: string, path: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    signal: AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GitHub ${res.status} on ${path}: ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : null;
}

export interface OpenPrArgs {
  filePath: string;
  content: string;
  branchName: string;
  commitMessage: string;
  prTitle: string;
  prBody: string;
}

export interface OpenPrResult {
  prUrl: string;
  branch: string;
}

/** Branch from base, commit one file, open a PR. Returns the PR's html_url. */
export async function openContentPr(args: OpenPrArgs): Promise<OpenPrResult> {
  const { token, repo, baseBranch } = getGithubConfig();
  if (!token) {
    throw new Error("HUB_GITHUB_TOKEN is not configured — the app can't open content PRs.");
  }

  const ref = (await gh(token, `/repos/${repo}/git/ref/heads/${baseBranch}`)) as {
    object: { sha: string };
  };
  const baseSha = ref.object.sha;

  try {
    await gh(token, `/repos/${repo}/git/refs`, {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${args.branchName}`, sha: baseSha }),
    });
  } catch (err) {
    // Retry after a partial run: the branch already exists — reuse it.
    if (!(err instanceof Error && err.message.includes("already exists"))) throw err;
  }

  // Existing-file sha on the new branch (== base) so the Contents API updates it.
  const existing = (await gh(
    token,
    `/repos/${repo}/contents/${args.filePath}?ref=${encodeURIComponent(args.branchName)}`,
  ).catch(() => null)) as { sha?: string } | null;

  await gh(token, `/repos/${repo}/contents/${args.filePath}`, {
    method: "PUT",
    body: JSON.stringify({
      message: args.commitMessage,
      content: Buffer.from(args.content, "utf8").toString("base64"),
      branch: args.branchName,
      ...(existing?.sha ? { sha: existing.sha } : {}),
    }),
  });

  try {
    const pr = (await gh(token, `/repos/${repo}/pulls`, {
      method: "POST",
      body: JSON.stringify({
        title: args.prTitle,
        body: args.prBody,
        head: args.branchName,
        base: baseBranch,
      }),
    })) as { html_url: string };
    return { prUrl: pr.html_url, branch: args.branchName };
  } catch (err) {
    // Retry after a partial run: a PR for this branch is already open — return it.
    if (err instanceof Error && err.message.includes("already exists")) {
      const owner = repo.split("/")[0];
      const existing = (await gh(
        token,
        `/repos/${repo}/pulls?head=${owner}:${encodeURIComponent(args.branchName)}&state=open`,
      )) as Array<{ html_url: string }>;
      if (existing[0]) return { prUrl: existing[0].html_url, branch: args.branchName };
    }
    throw err;
  }
}
