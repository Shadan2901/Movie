const dotenv = require("dotenv");

dotenv.config();

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_URL = "https://image.tmdb.org/t/p/w500";

function getTmdbCredentials() {
  return {
    accessToken: String(process.env.TMDB_ACCESS_TOKEN || "").trim(),
    apiKey: String(process.env.TMDB_API_KEY || "").trim()
  };
}

function normalizeTmdbMovie(movie) {
  const releaseDate = String(movie.release_date || "").trim();

  return {
    id: String(movie.id),
    title: String(movie.title || movie.original_title || "").trim(),
    year: releaseDate ? releaseDate.slice(0, 4) : "",
    rating: Number(movie.vote_count || 0) > 0
      ? Number(movie.vote_average || 0).toFixed(1)
      : "N/A",
    genre_ids: Array.isArray(movie.genre_ids) ? movie.genre_ids : [],
    poster: movie.poster_path ? `${TMDB_IMAGE_URL}${movie.poster_path}` : "",
    description: String(movie.overview || "").trim(),
    popularity: Number(movie.popularity || 0),
    releaseDate
  };
}

async function requestTmdb(pathname, query = {}) {
  const { accessToken, apiKey } = getTmdbCredentials();

  if (!accessToken && !apiKey) {
    const error = new Error(
      "TMDB is not configured. Add TMDB_ACCESS_TOKEN or TMDB_API_KEY to the .env file."
    );
    error.code = "TMDB_NOT_CONFIGURED";
    throw error;
  }

  const url = new URL(`${TMDB_BASE_URL}${pathname}`);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  if (!accessToken) url.searchParams.set("api_key", apiKey);

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`TMDB request failed (${response.status}): ${body.slice(0, 300)}`);
    error.code = "TMDB_REQUEST_FAILED";
    throw error;
  }

  return response.json();
}

async function fetchLatestMovies(options = {}) {
  const requestedPages = Number(options.pages || process.env.TMDB_SYNC_PAGES || 5);
  const pageLimit = Math.min(10, Math.max(1, requestedPages));
  const region = String(options.region || process.env.TMDB_REGION || "MY").toUpperCase();
  const seen = new Map();
  let availablePages = pageLimit;

  for (let page = 1; page <= Math.min(pageLimit, availablePages); page += 1) {
    const data = await requestTmdb("/movie/now_playing", {
      language: "en-US",
      region,
      page
    });

    availablePages = Math.max(1, Number(data.total_pages || 1));

    for (const item of data.results || []) {
      const movie = normalizeTmdbMovie(item);
      if (movie.id && movie.title && movie.year) seen.set(movie.id, movie);
    }
  }

  return [...seen.values()].sort((a, b) => {
    if (b.releaseDate !== a.releaseDate) return b.releaseDate.localeCompare(a.releaseDate);
    return b.popularity - a.popularity;
  });
}

async function fetchMovieTrailer(movieId) {
  if (!/^\d+$/.test(String(movieId || ""))) return null;

  const data = await requestTmdb(`/movie/${movieId}/videos`, {
    language: "en-US"
  });
  const youtubeVideos = (data.results || []).filter(video =>
    video.site === "YouTube" &&
    video.key &&
    ["Trailer", "Teaser"].includes(video.type)
  );

  youtubeVideos.sort((a, b) => {
    const officialDifference = Number(Boolean(b.official)) - Number(Boolean(a.official));
    if (officialDifference) return officialDifference;

    const trailerDifference = Number(b.type === "Trailer") - Number(a.type === "Trailer");
    if (trailerDifference) return trailerDifference;

    return new Date(b.published_at || 0) - new Date(a.published_at || 0);
  });

  return youtubeVideos[0] || null;
}

module.exports = {
  fetchLatestMovies,
  fetchMovieTrailer
};
