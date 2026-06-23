const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const TMDB_TOKEN = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

if (!TMDB_TOKEN) {
  console.log("Missing TMDB_API_KEY in .env");
  process.exit(1);
}

// 2004 until 2026, 500 top popular movies each year
async function fetchYearMovies(year) {
  let page = 1;
  const results = [];

  while (results.length < 500 && page <= 25) {
    const url =
      `${TMDB_BASE}/discover/movie?language=en-US` +
      `&include_adult=false` +
      `&include_video=false` +
      `&sort_by=popularity.desc` +
      `&primary_release_year=${year}` +
      `&page=${page}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TMDB_TOKEN}`,
        accept: "application/json"
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`TMDb error for year ${year}, page ${page}: ${text}`);
    }

    const data = await response.json();

    for (const movie of data.results || []) {
      if (results.length >= 500) break;

      results.push({
        id: movie.id,
        title: movie.title,
        year: movie.release_date ? movie.release_date.slice(0, 4) : String(year),
        rating: movie.vote_average ? movie.vote_average.toFixed(1) : "N/A",
        genre_ids: movie.genre_ids || [],
        poster: movie.poster_path ? `${IMAGE_BASE}${movie.poster_path}` : "",
        description: movie.overview || "",
        popularity: movie.popularity || 0
      });
    }

    console.log(`Year ${year}: page ${page}, collected ${results.length}/500`);
    page++;
  }

  return results;
}

async function buildCatalog() {
  const allMovies = [];
  const seen = new Set();

  for (let year = 2026; year >= 2004; year--) {
    try {
      const yearMovies = await fetchYearMovies(year);

      for (const movie of yearMovies) {
        if (!seen.has(movie.id)) {
          seen.add(movie.id);
          allMovies.push(movie);
        }
      }

      console.log(`Saved ${yearMovies.length} popular movies for ${year}`);
    } catch (error) {
      console.error(error.message);
    }
  }

  const dataDir = path.join(__dirname, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  fs.writeFileSync(
    path.join(dataDir, "movies.json"),
    JSON.stringify(allMovies, null, 2),
    "utf-8"
  );

  console.log(`Done. Total movies saved: ${allMovies.length}`);
}

buildCatalog();