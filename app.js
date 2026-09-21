const $ = (id) => document.getElementById(id);

const state = {
  page: 1,
  perPage: 20,
  lastQuery: "",
  lastSort: "",
  total: 0,
};

const TOKEN_KEY = "forge.gh.token";

function token() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function headers() {
  const h = { Accept: "application/vnd.github+json" };
  const t = token();
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

function fmt(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "m";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&")
    .replaceAll("<", "<")
    .replaceAll(">", ">")
    .replaceAll('"', """);
}

function zipUrl(fullName, defaultBranch) {
  const branch = defaultBranch || "HEAD";
  return `https://github.com/${fullName}/archive/refs/heads/${encodeURIComponent(branch)}.zip`;
}

function cloneUrl(fullName) {
  return `https://github.com/${fullName}.git`;
}

async function search(page = 1) {
  const q = $("q").value.trim();
  if (!q) {
    $("status").textContent = "Enter a search query.";
    return;
  }
  state.page = page;
  state.lastQuery = q;
  state.lastSort = $("sort").value;

  $("status").textContent = "Searching…";
  $("results").innerHTML = "";

  const params = new URLSearchParams({
    q,
    page: String(page),
    per_page: String(state.perPage),
  });
  if (state.lastSort) {
    params.set("sort", state.lastSort);
    params.set("order", "desc");
  }

  try {
    const res = await fetch(`https://api.github.com/search/repositories?${params}`, {
      headers: headers(),
    });
    const remaining = res.headers.get("x-ratelimit-remaining");
    const data = await res.json();
    if (!res.ok) {
      const msg = data.message || res.statusText;
      $("status").textContent = `GitHub error: ${msg}`;
      if (res.status === 403 || res.status === 401) {
        $("status").textContent += " — add a token (top right) if you hit the rate limit.";
      }
      return;
    }
    state.total = data.total_count || 0;
    render(data.items || []);
    const shownFrom = (page - 1) * state.perPage + 1;
    const shownTo = shownFrom + (data.items?.length || 0) - 1;
    $("status").textContent = state.total
      ? `${fmt(state.total)} repos · showing ${shownFrom}–${Math.max(shownTo, shownFrom)} · rate left ${remaining ?? "?"}`
      : "No repositories matched.";
    updatePager();
  } catch (err) {
    $("status").textContent = "Network error: " + err.message;
  }
}

function render(items) {
  const root = $("results");
  if (!items.length) {
    root.innerHTML = `<div class="empty">Nothing found. Try a broader query or drop a qualifier.</div>`;
    return;
  }
  root.innerHTML = items.map((repo) => {
    const desc = escapeHtml(repo.description || "No description.");
    const lang = escapeHtml(repo.language || "n/a");
    const updated = repo.updated_at ? new Date(repo.updated_at).toISOString().slice(0, 10) : "";
    const zip = zipUrl(repo.full_name, repo.default_branch);
    const clone = cloneUrl(repo.full_name);
    return `
      <article class="card">
        <div>
          <h2><a href="${repo.html_url}" target="_blank" rel="noopener">${escapeHtml(repo.full_name)}</a></h2>
          <p class="desc">${desc}</p>
          <div class="stats">
            <span class="chip"><span class="dot"></span>${lang}</span>
            <span>★ ${fmt(repo.stargazers_count)}</span>
            <span>⑂ ${fmt(repo.forks_count)}</span>
            <span>${repo.archived ? "archived" : "active"}</span>
            <span>updated ${updated}</span>
            <span>${escapeHtml(repo.license?.spdx_id || "no license")}</span>
          </div>
        </div>
        <div class="actions">
          <a class="dl" href="${zip}">Download ZIP</a>
          <button type="button" data-clone="${clone}">Copy clone URL</button>
          <a href="${repo.html_url}" target="_blank" rel="noopener">Open on GitHub</a>
        </div>
      </article>`;
  }).join("");
}

function updatePager() {
  const maxPage = Math.min(50, Math.ceil(state.total / state.perPage) || 1);
  const pager = $("pager");
  if (state.total <= state.perPage) {
    pager.hidden = true;
    return;
  }
  pager.hidden = false;
  $("pageLabel").textContent = `Page ${state.page} / ${maxPage}`;
  $("prevPage").disabled = state.page <= 1;
  $("nextPage").disabled = state.page >= maxPage;
}

$("searchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  search(1);
});
$("prevPage").addEventListener("click", () => search(state.page - 1));
$("nextPage").addEventListener("click", () => search(state.page + 1));

$("results").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-clone]");
  if (!btn) return;
  const url = btn.dataset.clone;
  try {
    await navigator.clipboard.writeText(url);
    btn.textContent = "Copied";
    setTimeout(() => { btn.textContent = "Copy clone URL"; }, 1400);
  } catch {
    prompt("Clone URL", url);
  }
});

const dialog = $("tokenDialog");
$("tokenBtn").addEventListener("click", () => {
  $("tokenInput").value = token();
  dialog.showModal();
});
$("saveToken").addEventListener("click", (e) => {
  e.preventDefault();
  const v = $("tokenInput").value.trim();
  if (v) localStorage.setItem(TOKEN_KEY, v);
  else localStorage.removeItem(TOKEN_KEY);
  dialog.close();
  $("status").textContent = v ? "Token saved in this browser." : "Token cleared.";
});
$("clearToken").addEventListener("click", () => {
  $("tokenInput").value = "";
  localStorage.removeItem(TOKEN_KEY);
});

const params = new URLSearchParams(location.search);
if (params.get("q")) {
  $("q").value = params.get("q");
  if (params.get("sort")) $("sort").value = params.get("sort");
  search(1);
}
