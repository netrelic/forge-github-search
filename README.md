# Forge — GitHub repository search

Static site that searches GitHub repositories from the browser and downloads source as a ZIP of the default branch.

## Run locally

Open `index.html` in a browser, or:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Usage

- Query supports GitHub search syntax: `language:go stars:>500 topic:cli`
- Sort by best match, stars, forks, or last update
- **Download ZIP** hits `https://github.com/{owner}/{repo}/archive/refs/heads/{default_branch}.zip`
- Optional PAT (button in the header) is stored in `localStorage` and sent as `Authorization: Bearer` to raise the unauthenticated 10 requests/minute cap

No backend. All calls go to `api.github.com`.
