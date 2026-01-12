(async function() {
    console.log("🚀 Queue API Exporter gestartet...");

    // --- KONFIGURATION ---
    const OMDB_API_KEY = "DEIN_KEY_HIER";
    const USE_OMDB = OMDB_API_KEY !== "DEIN_KEY_HIER";

    // --- 1. USER DETECTOR ---
    class UserDetector {
        static getUsername() {
            const pathParts = window.location.pathname.split('/').filter(p => p);
            if (pathParts.length >= 2 && pathParts[0] === 'users') {
                return pathParts[1];
            }
            throw new Error("Keine gültige Queue-URL! Bitte öffne: queue.co/users/DEINNAME");
        }
    }

    // --- 2. API ENGINE ---
    class QueueApi {
        constructor(username) {
            this.baseUrl = "/api/cache/public/feed";
            this.username = username;
            this.movies = [];
        }

        async fetchAllMovies(onProgress) {
            let pageToken = null;
            let pageCount = 0;
            let keepFetching = true;
            console.log(`⚡ Starte API-Abruf für: ${this.username}`);

            while (keepFetching) {
                pageCount++;
                let url = `${this.baseUrl}?user_handle=${this.username}&title_action=QUEUED`;
                if (pageToken) url += `&page_token=${pageToken}`;

                try {
                    const response = await fetch(url, {
                        method: 'GET',
                        credentials: 'include',
                        headers: { 'Accept': 'application/json', 'x-requested-with': 'XMLHttpRequest' }
                    });

                    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

                    const json = await response.json();
                    const newMovies = json.data || [];
                    const meta = json.meta || {};

                    this.movies = [...this.movies, ...newMovies];
                    console.log(`✅ Seite ${pageCount}: +${newMovies.length} Titel.`);
                    pageToken = meta.next || null;
                    if (onProgress) onProgress(this.movies.length, pageCount, meta.total);
                    if (meta.last === true || !pageToken || newMovies.length === 0) keepFetching = false;
                    await new Promise(r => setTimeout(r, 200));
                } catch (error) {
                    console.error("❌ API Fehler:", error);
                    keepFetching = false;
                }
            }
            return this.movies;
        }
    }

    // --- 3. OMDB ENRICHER ---
    class OmdbEnricher {
        static async fetchRating(title, year) {
            if (!USE_OMDB) return "N/A";
            try {
                const url = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(title)}&y=${year}&type=movie`;
                const res = await fetch(url);
                const data = await res.json();
                return data.Response === "True" ? data.imdbRating || "N/A" : "N/A";
            } catch (e) { return "N/A"; }
        }

        static async enrichMovies(movies, onProgress) {
            if (!USE_OMDB) return movies;
            console.log("🎬 Hole IMDB Ratings...");
            const enriched = [];
            for (let i = 0; i < movies.length; i++) {
                const m = movies[i];
                const rating = await OmdbEnricher.fetchRating(m.title?.title, m.title?.releaseYear);
                enriched.push({ ...m, imdbRating: rating });
                if (onProgress) onProgress(i + 1, movies.length);
                if ((i + 1) % 10 === 0) await new Promise(r => setTimeout(r, 500));
            }
            return enriched;
        }
    }

    // --- 4. DATA PROCESSOR ---
    class DataProcessor {
        static processMovies(itemList) {
            return itemList.map(item => {
                const movie = item.title || {};
                const rating = parseFloat(item.imdbRating) || 0;

                // PROVIDER: Liste bereinigen, Duplikate raus, alphabetisch sortieren
                const providers = movie.streamingProviders || [];
                const providerList = providers
                    .map(p => p.type || p.imageName || "Unknown")
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .sort((a, b) => a.localeCompare(b)); // A-Z Sortierung

                // GENRES: Ebenfalls alphabetisch sortieren
                const genreList = (movie.genres || [])
                    .sort((a, b) => a.localeCompare(b));

                const countries = providers
                    .map(p => p.country)
                    .filter((v, i, a) => v && a.indexOf(v) === i)
                    .join(", ");

                return {
                    title: movie.title || "Unknown",
                    type: movie.type || "UNKNOWN",
                    year: movie.releaseYear || "",
                    genre: genreList.join(", "),
                    rating: rating > 0 ? rating : "N/A",
                    streaming: providerList.length > 0 ? providerList.join(", ") : "Nicht verfügbar",
                    country: countries || "N/A",
                    addedDate: item.timestamp ? item.timestamp.split('T')[0] : "",
                    link: `https://www.queue.co/${movie.slug || movie.id}`,

                    // Hilfsdaten
                    primaryGenre: genreList[0] || "Unknown",
                    hasStreaming: providers.length > 0,
                    ratingNum: rating,
                    providerArr: providerList
                };
            });
        }

        static sortData(data, sortBy = 'rating') {
            const sorted = [...data];
            switch(sortBy) {
                case 'rating': return sorted.sort((a, b) => b.ratingNum - a.ratingNum);
                case 'year': return sorted.sort((a, b) => (b.year || 0) - (a.year || 0));
                case 'title': return sorted.sort((a, b) => a.title.localeCompare(b.title));
                case 'date': return sorted.sort((a, b) => b.addedDate.localeCompare(a.addedDate));
                default: return sorted;
            }
        }

        static categorize(data) {
            return {
                movies: data.filter(d => d.type === 'MOVIE'),
                shows: data.filter(d => d.type === 'SHOW'),
                topRated: data.filter(d => d.ratingNum >= 7.5),
                byGenre: DataProcessor.groupByGenre(data)
            };
        }

        static groupByGenre(data) {
            const genres = {};
            data.forEach(item => {
                const genre = item.primaryGenre;
                if (!genres[genre]) genres[genre] = [];
                genres[genre].push(item);
            });
            return genres;
        }

        static calculateStats(data) {
            const genreCounts = {};
            data.forEach(item => {
                const genre = item.primaryGenre;
                genreCounts[genre] = (genreCounts[genre] || 0) + 1;
            });

            const streamingCounts = {};
            data.forEach(item => {
                if (item.providerArr) {
                    item.providerArr.forEach(s => streamingCounts[s] = (streamingCounts[s] || 0) + 1);
                }
            });

            const rated = data.filter(d => d.ratingNum > 0);
            return {
                total: data.length,
                movies: data.filter(d => d.type === 'MOVIE').length,
                shows: data.filter(d => d.type === 'SHOW').length,
                avgRating: rated.length > 0 ? (rated.reduce((sum, d) => sum + d.ratingNum, 0) / rated.length).toFixed(2) : "N/A",
                topGenre: Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0] || ["N/A", 0],
                topStreaming: Object.entries(streamingCounts).sort((a, b) => b[1] - a[1])[0] || ["N/A", 0],
                available: data.filter(d => d.hasStreaming).length,
                notAvailable: data.filter(d => !d.hasStreaming).length,
                genreCounts,
                streamingCounts
            };
        }
    }

    // --- 5. EXCEL EXPORTER ---
    class ExcelExporter {
        static async download(itemList, username) {
            if (typeof XLSX === 'undefined') throw new Error("XLSX Library fehlt!");

            const processed = DataProcessor.processMovies(itemList);
            const categories = DataProcessor.categorize(processed);
            const stats = DataProcessor.calculateStats(processed);
            const wb = XLSX.utils.book_new();

            ExcelExporter.createStatsSheet(wb, stats);
            ExcelExporter.createDataSheet(wb, "Alle Titel", DataProcessor.sortData(processed, 'rating'));
            ExcelExporter.createDataSheet(wb, "Filme", DataProcessor.sortData(categories.movies, 'rating'));
            ExcelExporter.createDataSheet(wb, "Serien", DataProcessor.sortData(categories.shows, 'rating'));
            ExcelExporter.createDataSheet(wb, "Top Rated", DataProcessor.sortData(categories.topRated, 'rating'));

            const today = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `queue_${username}_${today}.xlsx`);
        }

        static createStatsSheet(wb, stats) {
            const data = [
                ["📊 QUEUE STATISTIKEN", ""], ["", ""],
                ["Gesamt", stats.total], ["🎬 Filme", stats.movies], ["📺 Serien", stats.shows],
                ["", ""], ["Verfügbar", stats.available], ["Nicht verfügbar", stats.notAvailable],
                ["", ""], ["--- GENRES ---", "Anzahl"]
            ];
            Object.entries(stats.genreCounts).sort((a, b) => b[1] - a[1]).forEach(e => data.push(e));
            data.push(["", ""]); data.push(["--- STREAMING ---", "Anzahl"]);
            Object.entries(stats.streamingCounts).sort((a, b) => b[1] - a[1]).forEach(e => data.push(e));

            const ws = XLSX.utils.aoa_to_sheet(data);
            ws['!cols'] = [{ wch: 30 }, { wch: 15 }];
            XLSX.utils.book_append_sheet(wb, ws, "Statistiken");
        }

        static createDataSheet(wb, sheetName, data) {
            const headers = ["Titel", "Typ", "Jahr", "Genre", "Rating", "Streaming", "Land", "Hinzugefügt", "Link"];

            const rows = data.map(d => [
                d.title, d.type, d.year, d.genre, d.rating, d.streaming, d.country, d.addedDate, d.link
            ]);

            const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

            ws['!cols'] = [
                { wch: 40 }, // Titel
                { wch: 10 }, // Typ
                { wch: 6 },  // Jahr
                { wch: 30 }, // Genre
                { wch: 6 },  // Rating
                { wch: 40 }, // Streaming
                { wch: 10 }, // Land
                { wch: 12 }, // Datum
                { wch: 50 }  // Link
            ];

            if (ws['!ref']) ws['!autofilter'] = { ref: ws['!ref'] };

            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
    }

    // --- 6. START ---
    try {
        const username = UserDetector.getUsername();
        const originalTitle = document.title;
        const startTime = Date.now();

        const api = new QueueApi(username);

        const movies = await api.fetchAllMovies((c, p, t) => document.title = `Lade... ${c}/${t || '?'}`);
        if (!movies.length) {
            document.title = originalTitle;
            throw new Error("Keine Filme gefunden.");
        }

        let enriched = movies;
        if (USE_OMDB) enriched = await OmdbEnricher.enrichMovies(movies, (c, t) => document.title = `IMDB... ${c}/${t}`);

        await ExcelExporter.download(enriched, username);

        // --- Statistik-Berechnung für Popup ---
        document.title = originalTitle;
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        // Wir zählen anhand der Rohdaten ('enriched')
        const totalCount = enriched.length;
        const movieCount = enriched.filter(m => m.title?.type === 'MOVIE').length;
        const showCount = enriched.filter(m => m.title?.type === 'SHOW').length;

        alert(
            `✅ Fertig! Excel erstellt.\n\n` +
            `📦 Gesamt: ${totalCount} Titel\n` +
            `🎬 Filme: ${movieCount}\n` +
            `📺 Serien: ${showCount}\n` +
            `⏱️ Dauer: ${duration}s\n\n`
        );

    } catch (e) {
        console.error(e);
        alert("Fehler: " + e.message);
        document.title = "Fehler";
    }
})();