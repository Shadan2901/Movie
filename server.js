const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const OLLAMA_URL = "http://localhost:11434/api/generate";
const OLLAMA_MODEL = "gemma3";

const moviesPath = path.join(__dirname, "data", "movies.json");
let movies = [];

const GENRE_NAMES = {
  12: "Adventure",
  14: "Fantasy",
  16: "Animation",
  18: "Drama",
  27: "Horror",
  28: "Action",
  35: "Comedy",
  36: "History",
  37: "Western",
  53: "Thriller",
  80: "Crime",
  99: "Documentary",
  878: "Science Fiction",
  9648: "Mystery",
  10402: "Music",
  10749: "Romance",
  10751: "Family",
  10752: "War",
  10770: "TV Movie"
};

if (fs.existsSync(moviesPath)) {
  movies = JSON.parse(fs.readFileSync(moviesPath, "utf-8"));
}

console.log("TOTAL MOVIES LOADED:", movies.length);

function saveMovies() {
  fs.writeFileSync(moviesPath, JSON.stringify(movies, null, 2), "utf-8");
}

function normalizeMovie(payload, existingMovie = {}) {
  return {
    ...existingMovie,
    id: payload.id || existingMovie.id || `admin-${Date.now()}`,
    title: String(payload.title || "").trim(),
    year: String(payload.year || "").trim(),
    rating: String(payload.rating || "N/A").trim(),
    genre_ids: Array.isArray(payload.genre_ids) ? payload.genre_ids : (existingMovie.genre_ids || []),
    poster: String(payload.poster || "").trim(),
    description: String(payload.description || "").trim(),
    popularity: Number(payload.popularity || existingMovie.popularity || 0)
  };
}

function isTargetYear(movie) {
  const year = Number(movie.year);
  return year >= 2004 && year <= 2026;
}

function getGenreNames(movie) {
  return (movie.genre_ids || [])
    .map(id => GENRE_NAMES[id])
    .filter(Boolean);
}

function sortMoviesByOption(items, sortOption) {
  return items.sort((a, b) => {
    if (sortOption === "oldest") {
      if (Number(a.year) !== Number(b.year)) return Number(a.year) - Number(b.year);
      return (b.popularity || 0) - (a.popularity || 0);
    }

    if (sortOption === "az") {
      return String(a.title || "").localeCompare(String(b.title || ""));
    }

    if (sortOption === "za") {
      return String(b.title || "").localeCompare(String(a.title || ""));
    }

    if (sortOption === "rating") {
      if (Number(b.rating || 0) !== Number(a.rating || 0)) return Number(b.rating || 0) - Number(a.rating || 0);
      return (b.popularity || 0) - (a.popularity || 0);
    }

    if (sortOption === "popular") {
      if ((b.popularity || 0) !== (a.popularity || 0)) return (b.popularity || 0) - (a.popularity || 0);
      return Number(b.year) - Number(a.year);
    }

    if (Number(b.year) !== Number(a.year)) {
      return Number(b.year) - Number(a.year);
    }
    return (b.popularity || 0) - (a.popularity || 0);
  });
}

function getCandidateMovies(promptText) {
  const cleanPrompt = promptText.toLowerCase().trim();

  let filtered = movies.filter(movie => {
    const title = (movie.title || "").toLowerCase();
    const description = (movie.description || "").toLowerCase();

    return (
      isTargetYear(movie) &&
      (
        title.includes(cleanPrompt) ||
        description.includes(cleanPrompt)
      )
    );
  });

  if (
    cleanPrompt.includes("marvel") ||
    cleanPrompt.includes("mcu") ||
    cleanPrompt.includes("superhero")
  ) {
    filtered = movies.filter(movie => {
      const title = (movie.title || "").toLowerCase();
      const description = (movie.description || "").toLowerCase();

      return (
        isTargetYear(movie) &&
        (
          title.includes("deadpool") ||
          title.includes("black widow") ||
          title.includes("shang-chi") ||
          title.includes("doctor strange") ||
          title.includes("spider-man") ||
          title.includes("venom") ||
          title.includes("eternals") ||
          title.includes("thor") ||
          title.includes("captain marvel") ||
          title.includes("avengers") ||
          description.includes("marvel") ||
          description.includes("superhero")
        )
      );
    });
  }

  if (filtered.length === 0) {
    filtered = movies
      .filter(isTargetYear)
      .sort((a, b) => {
        if (Number(b.year) !== Number(a.year)) {
          return Number(b.year) - Number(a.year);
        }
        return (b.popularity || 0) - (a.popularity || 0);
      })
      .slice(0, 150);
  }

  return filtered;
}

app.get("/api/movies", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const search = (req.query.search || "").toLowerCase().trim();
  const genre = String(req.query.genre || "").trim();
  const year = String(req.query.year || "").trim();
  const sort = String(req.query.sort || "newest").trim();

  let filteredMovies = [...movies]
    .filter(isTargetYear);

  if (search) {
    filteredMovies = filteredMovies.filter(movie =>
      (movie.title || "").toLowerCase().includes(search) ||
      (movie.description || "").toLowerCase().includes(search) ||
      String(movie.year || "").toLowerCase().includes(search) ||
      getGenreNames(movie).join(" ").toLowerCase().includes(search)
    );
  }

  if (genre) {
    filteredMovies = filteredMovies.filter(movie =>
      (movie.genre_ids || []).map(String).includes(genre)
    );
  }

  if (year) {
    filteredMovies = filteredMovies.filter(movie => String(movie.year || "") === year);
  }

  sortMoviesByOption(filteredMovies, sort);

  const total = filteredMovies.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const paginatedMovies = filteredMovies.slice(start, start + limit);

  res.json({
    total,
    totalPages,
    currentPage: page,
    movies: paginatedMovies
  });
});

app.get("/api/admin/movies", (req, res) => {
  const search = (req.query.search || "").toLowerCase().trim();

  let filteredMovies = [...movies].sort((a, b) => {
    if (Number(b.year) !== Number(a.year)) {
      return Number(b.year) - Number(a.year);
    }
    return (b.popularity || 0) - (a.popularity || 0);
  });

  if (search) {
    filteredMovies = filteredMovies.filter(movie =>
      (movie.title || "").toLowerCase().includes(search) ||
      (movie.description || "").toLowerCase().includes(search) ||
      String(movie.year || "").toLowerCase().includes(search) ||
      String(movie.rating || "").toLowerCase().includes(search)
    );
  }

  res.json({
    total: filteredMovies.length,
    movies: filteredMovies.slice(0, 250)
  });
});

app.post("/api/admin/movies", (req, res) => {
  const movie = normalizeMovie(req.body || {});

  if (!movie.title || !movie.year) {
    return res.status(400).json({ error: "Title and year are required." });
  }

  movies.unshift(movie);
  saveMovies();

  res.status(201).json({ movie });
});

app.put("/api/admin/movies/:id", (req, res) => {
  const id = String(req.params.id);
  const index = movies.findIndex(movie => String(movie.id) === id);

  if (index === -1) {
    return res.status(404).json({ error: "Movie not found." });
  }

  const movie = normalizeMovie({ ...req.body, id: movies[index].id }, movies[index]);

  if (!movie.title || !movie.year) {
    return res.status(400).json({ error: "Title and year are required." });
  }

  movies[index] = movie;
  saveMovies();

  res.json({ movie });
});

app.delete("/api/admin/movies/:id", (req, res) => {
  const id = String(req.params.id);
  const beforeCount = movies.length;
  movies = movies.filter(movie => String(movie.id) !== id);

  if (movies.length === beforeCount) {
    return res.status(404).json({ error: "Movie not found." });
  }

  saveMovies();
  res.json({ ok: true });
});

app.get("/api/health", async (req, res) => {
  try {
    const response = await fetch("http://localhost:11434/api/tags");
    const data = await response.json();

    res.json({
      ok: true,
      models: data.models || []
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: "Ollama is not running."
    });
  }
});

app.get("/api/trailer", async (req, res) => {
  try {
    const title = String(req.query.title || "").trim();
    const year = String(req.query.year || "").trim();

    if (!title) {
      return res.status(400).json({ error: "Movie title is required." });
    }

    const query = `${title} ${year} official trailer`.trim();
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Could not search YouTube for a trailer." });
    }

    const html = await response.text();
    const videoIds = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)]
      .map(match => match[1])
      .filter((videoId, index, list) => list.indexOf(videoId) === index);

    const videoId = videoIds[0];

    if (!videoId) {
      return res.status(404).json({ error: "No trailer video found.", searchUrl });
    }

    res.json({
      videoId,
      searchUrl,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&playsinline=1`
    });
  } catch (error) {
    res.status(500).json({ error: "Could not load trailer." });
  }
});

app.post("/api/recommend", async (req, res) => {
  try {
    const { prompt, username } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const cleanPrompt = prompt.toLowerCase().trim();

    const movieIntentKeywords = [
      "recommend",
      "movie",
      "movies",
      "watch",
      "suggest",
      "film",
      "action movie",
      "romance movie",
      "comedy movie",
      "horror movie",
      "marvel movie",
      "spider-man",
      "batman",
      "thriller movie",
      "what should i watch",
      "give me movie",
      "best movie"
    ];

    const isMovieRequest = movieIntentKeywords.some(keyword =>
      cleanPrompt.includes(keyword)
    );

    if (!isMovieRequest) {
      const chatPrompt = `
You are a friendly AI assistant for a movie website.

Rules:
1. Answer normally like ChatGPT.
2. Be simple, helpful, and short.
3. Do not recommend movies unless the user is clearly asking for movies.
4. Return JSON only.

Use exactly this format:
{
  "reply": "your normal assistant reply here",
  "recommendations": []
}

User: ${username || "Guest"}
Message: ${prompt}
      `.trim();

      const ollamaResponse = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: chatPrompt,
          stream: false,
          format: "json"
        })
      });

      if (!ollamaResponse.ok) {
        const errorText = await ollamaResponse.text();
        return res.status(500).json({
          error: "Ollama request failed: " + errorText
        });
      }

      const data = await ollamaResponse.json();

      let parsed;
      try {
        parsed = JSON.parse(data.response);
      } catch (err) {
        return res.status(500).json({
          error: "Ollama returned invalid JSON."
        });
      }

      return res.json({
        reply: parsed.reply || "How can I help you?",
        recommendations: []
      });
    }

    const candidateMovies = getCandidateMovies(prompt);
    const movieTitles = candidateMovies.map(movie => movie.title);

    const recommendPrompt = `
You are a smart movie assistant.

The user is asking for movie recommendations.

Rules:
1. Recommend only from the movie titles below.
2. "title" must be an exact title from the list.
3. Return at most 3 recommendations.
4. Keep reply natural and simple.
5. Return JSON only.

Use exactly this format:
{
  "reply": "short helpful reply",
  "recommendations": [
    {
      "title": "exact movie title",
      "why": "short reason"
    }
  ]
}

Movie titles:
${JSON.stringify(movieTitles, null, 2)}

User: ${username || "Guest"}
Request: ${prompt}
    `.trim();

    const ollamaResponse = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: recommendPrompt,
        stream: false,
        format: "json"
      })
    });

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      return res.status(500).json({
        error: "Ollama request failed: " + errorText
      });
    }

    const data = await ollamaResponse.json();

    let parsed;
    try {
      parsed = JSON.parse(data.response);
    } catch (err) {
      return res.status(500).json({
        error: "Ollama returned invalid JSON."
      });
    }

    const recommendations = (parsed.recommendations || [])
      .map(item => {
        const movie = candidateMovies.find(
          m => (m.title || "").trim().toLowerCase() === (item.title || "").trim().toLowerCase()
        );

        if (!movie) return null;

        return {
          title: movie.title,
          year: movie.year,
          rating: movie.rating,
          poster: movie.poster,
          description: movie.description,
          why: item.why || ""
        };
      })
      .filter(Boolean);

    return res.json({
      reply: parsed.reply || "Here are some movie recommendations.",
      recommendations
    });
  } catch (error) {
    console.error("SERVER ERROR:", error);
    res.status(500).json({
      error: "Could not connect to Ollama."
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
