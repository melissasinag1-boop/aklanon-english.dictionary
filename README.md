# Aklanon-English Dictionary (web app)

A mobile-first dictionary that runs in the browser, installs to the home screen, and works offline after the first visit. Entries come from Salas Reyes, Zorc, and Prado (1969), *A Study of the Aklanon Dialect, Volume Two: Dictionary*, Peace Corps (ERIC ED145704).

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure |
| `style.css` | Appearance |
| `app.js` | Search and display |
| `entries.json` | The word list. This is the only file you edit to add words |
| `sw.js` | Offline support |
| `manifest.webmanifest`, `icon-192.png`, `icon-512.png` | Home screen install |

All files sit in one folder on purpose, so they can be uploaded together from a phone or tablet.

## Publish on GitHub Pages

1. Create a new public repository on GitHub.
2. On the repository page, choose **Add file > Upload files**, select all files in this folder, and commit.
3. Open **Settings > Pages**. Under **Build and deployment**, set Source to **Deploy from a branch**, choose branch `main` and folder `/ (root)`, then save.
4. After a minute the site is live at `https://<your-username>.github.io/<repository-name>/`.
5. Open the link in Chrome on Android, then use the menu and choose **Install app** or **Add to Home screen**.

## Add entries

Open `entries.json` (github.dev works well for this) and copy an existing block. Fields:

```json
{
  "word": "abá(h)",
  "pos": "RV6",
  "meaning": "to get or climb up on one's back",
  "examples": [{ "akl": "Aklanon sentence.", "eng": "English translation." }],
  "derived": [{ "form": "paabá", "pos": "CV", "meaning": "to carry on one's back" }],
  "syn": ["similar word"],
  "opp": ["opposite word"],
  "origin": "Sp",
  "page": 39
}
```

- Required: `word`, `pos`, `meaning`. Everything else is optional.
- `pos` uses the source's codes: `n`, `adj`, `intj`, `RV1` to `RV9`, `CV`, and so on.
- `origin` codes: `Sp`, `Eng`, `Tag`, `Ch`, `Hil`, `Jp`.
- `page` is the printed page number in the source, used for citation.
- Put every derived form (for example `pangahóy`) in `derived` under its root so users can search it and land on the root.
- Every entry except the last needs a comma after its closing brace. A missing comma stops the whole list from loading, so check the file after each edit.

After changing files, edit `CACHE` in `sw.js` (for example `v1` to `v2`) so returning users get the update.

## Notes for the study

- Entries were transcribed from a low-quality scan. Proofread each one against the source, especially accents, apostrophes, and the letter `e`.
- English meaning search can be turned off by setting `SEARCH_ENGLISH_MEANINGS` to `false` at the top of `app.js`, if your scope is strictly Aklanon to English.
- Sorting is simple alphabetical order. The source treats i and e as one letter and o and u as one letter, which this version does not copy.
