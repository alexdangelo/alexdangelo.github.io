# Tab Practice Player

A guitar practice tool for beginners that runs in the browser. Open a tab file,
see which notes to play on the tab and on a fretboard, slow it down, loop the
hard parts, and play along with a distorted or clean guitar and a backing band.

Everything is self-contained: the app makes no requests to any other website,
and your tab files never leave your computer.

## Features

- Opens Guitar Pro (`.gp`, `.gpx`, `.gp5`, `.gp4`, `.gp3`), MusicXML
  (`.musicxml`, `.xml`, `.mxl`), Capella (`.capx`) and alphaTex files
- Simple view (big tab numbers, chord names, tappable technique badges) and
  Detailed view (full notation, optional standard notation)
- Fretboard showing the current and next notes with suggested fingers
- Speed from 10% to 100% without changing pitch, plus a speed trainer
- Loops (choose any range, or loop a section), count-in, metronome
- Follows repeats, alternate endings, D.S./D.C./coda jumps and tempo changes
- Grunge distortion or clean guitar built from recorded notes, plus bass,
  drums and other tracks as a backing band
- Light and dark mode, keep-screen-on, keyboard shortcuts

Keyboard: `Space` play/pause, `L` loop, `M` metronome, `←` `→` step one beat,
`+` `−` speed.

## Run it

**On GitHub Pages:** in the repository, go to Settings → Pages, choose
"Deploy from a branch", pick the `main` branch and the `/ (root)` folder.
The app is then live at `https://<your-user>.github.io/<repository>/`.

**On your own computer:** the app must be served by a web server (browsers
block a page opened straight from disk from loading its sound file). From the
project folder run:

    python3 -m http.server 8000

and open <http://localhost:8000>.

**As one file, no server needed:** run

    python3 tools/make-single-file.py

This writes `tab-practice-player.html`, which contains everything and works by
double-clicking it, even offline.

## Project layout

| Path | What it is |
|---|---|
| `index.html` | The page |
| `style.css` | Styling, light and dark themes |
| `app.js` | The app: song model, both views, fretboard, audio engine, controls |
| `vendor/alphaTab.min.js` | alphaTab 1.8.4: reads tab files, draws the Detailed view, works out the play order |
| `fonts/` | Bravura (music symbols) and IBM Plex (text) |
| `sounds/samples.json` | Recorded clean guitar, palm-muted guitar and bass notes |
| `tools/make-single-file.py` | Optional: builds the one-file version |
| `licenses/` | License texts for the bundled third-party files |

There is no build step. Edit the files and reload the page.

## Tab files and copyright

Don't commit tab files of copyrighted songs to a public repository. The
`.gitignore` skips Guitar Pro files and a `my-tabs/` folder to help with that.
The built-in demo riff was written for this app and is covered by the MIT license.

## Licenses

The app's own code is under the [MIT License](LICENSE).

Bundled third-party files keep their own licenses:

- **alphaTab 1.8.4** (`vendor/alphaTab.min.js`), Mozilla Public License 2.0,
  included unmodified. Source: <https://github.com/CoderLine/alphaTab>.
  See `licenses/alphaTab-LICENSE-MPL-2.0.txt`.
- **Bravura** music font by Steinberg (`fonts/Bravura.woff2`), SIL Open Font
  License 1.1. See `licenses/Bravura-OFL.txt`.
- **IBM Plex** fonts by IBM (`fonts/ibm-plex-*.woff2`), SIL Open Font License
  1.1. See `licenses/IBM-Plex-OFL.txt`.
- **Guitar and bass sounds** (`sounds/samples.json`): from the Fluid R3 GM
  SoundFont by Frank Wen (MIT License), as converted to per-note MP3 files by
  the [midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts) project.
