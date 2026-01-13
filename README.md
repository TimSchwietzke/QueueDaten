# 🎬 Queue Exporter (Chrome Extension) - Für Delal :)

![Logo](src/icons/icon.png)

**Queue Exporter** ist eine Chrome-Erweiterung für [queue.co](https://queue.co).
Sie ermöglicht es dir, deine gesamte Watchlist (Filme & Serien) 
vollautomatisch zu extrahieren, theoretisch mit Ratings (TMDB/OMDb) 
anzureichern und als filterbare Excel-Datei zu exportieren.

## ✨ Features

* **Automatischer Scrape:** Lädt alle Seiten deiner Watchlist automatisch nach.
* **Excel-Export (.xlsx):** Erstellt eine Tabelle mit sortierbaren Spalten.
* **Smarte Filterung:**
    * Streaming-Dienste (Netflix, Amazon, etc.) werden automatisch erkannt und in einer filterbaren Spalte zusammengefasst.
    * Genres sind alphabetisch sortiert für einfache Suche.
* **Statistiken:** Ein eigenes Dashboard-Sheet in Excel zeigt dir:
    * Verteilung Filme vs. Serien.
    * Deine Top-Genres.
    * Verfügbarkeit bei Streaming-Anbietern.
* **Rating-Integration:** Lädt (optional/theoretisch) Bewertungen via TMDB oder OMDb API nach.

## 📂 Installation

Da diese Extension nicht im Chrome Web Store verfügbar ist, musst du sie manuell installieren ("Sideloading").

1.  **Repository klonen oder herunterladen:**
    Lade diesen Ordner auf deine Festplatte.

2.  **Entpacken**
    Entpacke den .zip Ordner

3. **In Chrome laden:**
    * Öffne Chrome und gehe zu `chrome://extensions`.
    * Aktiviere oben rechts den **Entwicklermodus**.
    * Klicke oben links auf **"Entpackte Erweiterung laden"**.
    * Wähle den Ordner dieser Extension aus.

## ⚙️ Konfiguration - API Key (WIP)

Damit die Extension Bewertungen (IMDb/TMDB Scores) laden kann, benötigst du einen kostenlosen API-Key.

1.  Öffne die Datei `content.js` in einem Texteditor.
2.  Suche ganz oben nach dem Bereich `--- KONFIGURATION ---`.
3.  Trage deinen Key ein:

```javascript
// BEISPIEL für TMDB
const TMDB_API_KEY = "dein_langer_key_von_tmdb_hier_einfuegen";
````

## 👏 Credits / Third Party Libraries

* **SheetJS (xlsx):** Used for Excel export. Licensed under the Apache License 2.0.
    * [Source Code](https://git.sheetjs.com/sheetjs/sheetjs)