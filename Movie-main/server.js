const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const {
  databaseConfig,
  initializeDatabase,
  getAllMovies,
  createMovie,
  upsertMovies,
  updateMovie,
  deleteMovie,
  createUser,
  getUserByEmail,
  updateUser,
  getWishlist,
  addWishlistItem,
  removeWishlistItem,
  clearWishlist,
  createFeedback,
  getFeedback,
  saveRecommendationHistory,
  getCounts
} = require("./database");
const { fetchLatestMovies, fetchMovieTrailer } = require("./tmdb");

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const OLLAMA_CHAT_URL = "http://localhost:11434/api/chat";
const OLLAMA_MODEL = "gemma3";

let movies = [];
let databaseConnected = false;

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

async function refreshMovies() {
  movies = await getAllMovies();
}

function loadLocalMovies() {
  const filePath = path.join(__dirname, "data", "movies.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return Array.isArray(data) ? data : [];
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  return {
    salt,
    hash: crypto.scryptSync(password, salt, 64).toString("hex")
  };
}

function isValidPassword(password, user) {
  const suppliedHash = Buffer.from(hashPassword(password, user.password_salt).hash, "hex");
  const savedHash = Buffer.from(user.password_hash, "hex");
  return suppliedHash.length === savedHash.length && crypto.timingSafeEqual(suppliedHash, savedHash);
}

function publicUser(user) {
  return {
    id: Number(user.id),
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    contact: user.contact,
    address: user.address,
    city: user.city,
    state: user.state,
    role: user.role,
    language: user.language || "en",
    photo: user.profile_photo || ""
  };
}

async function ensureAdminUser() {
  if (await getUserByEmail("admin@smartmovies.com")) return;

  const password = hashPassword("admin123");
  await createUser({
    firstName: "Admin",
    lastName: "User",
    email: "admin@smartmovies.com",
    passwordHash: password.hash,
    passwordSalt: password.salt,
    role: "admin"
  });
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
  return year >= 2004 && year <= new Date().getFullYear() + 1;
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

function isMovieRequest(promptText) {
  const text = String(promptText || "").toLowerCase();
  const explicitMovieTerms = [
    "movie",
    "movies",
    "film",
    "films",
    "cinema",
    "watch tonight",
    "what should i watch",
    "something to watch",
    "marvel",
    "spider-man",
    "batman"
  ];
  const recommendationTerms = ["recommend", "suggest", "best", "show me", "give me"];
  const movieCategories = [
    "action",
    "romance",
    "comedy",
    "horror",
    "thriller",
    "drama",
    "animation",
    "adventure",
    "fantasy",
    "science fiction",
    "sci-fi",
    "documentary",
    "funny",
    "scary",
    "romantic",
    "sad"
  ];

  return explicitMovieTerms.some(term => text.includes(term)) ||
    (
      recommendationTerms.some(term => text.includes(term)) &&
      movieCategories.some(category => text.includes(category))
    );
}

function cleanConversationHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter(item =>
      item &&
      ["user", "assistant"].includes(item.role) &&
      typeof item.content === "string" &&
      item.content.trim()
    )
    .slice(-10)
    .map(item => ({
      role: item.role,
      content: item.content.trim().slice(0, 4000)
    }));
}

async function askOllama(messages, options = {}) {
  let response;

  try {
    response = await fetch(OLLAMA_CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        ...(options.format ? { format: options.format } : {}),
        options: {
          temperature: options.temperature ?? 0.4,
          num_predict: options.numPredict ?? 400
        }
      }),
      signal: AbortSignal.timeout(120000)
    });
  } catch (error) {
    if (error.name === "TimeoutError") {
      throw new Error("Ollama took too long to answer. Please try again.");
    }
    throw new Error("Could not connect to Ollama. Make sure Ollama is running.");
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama request failed: ${errorText}`);
  }

  const data = await response.json();
  const content = String(data.message?.content || "").trim();
  if (!content) throw new Error("Ollama returned an empty response.");
  return content;
}

function parseOllamaJson(content) {
  const cleaned = String(content || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("Ollama returned an invalid structured response.");
  }
}

async function saveAssistantHistory(entry) {
  try {
    await saveRecommendationHistory(entry);
  } catch (error) {
    if (entry.userId && error.code === "ER_NO_REFERENCED_ROW_2") {
      try {
        await saveRecommendationHistory({ ...entry, userId: null });
        return;
      } catch (retryError) {
        console.error("Could not save anonymous assistant history:", retryError.message);
        return;
      }
    }

    console.error("Could not save assistant history:", error.message);
  }
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

app.post("/api/admin/movies/sync-latest", async (req, res) => {
  try {
    const moviesFromTmdb = await fetchLatestMovies({
      pages: req.body?.pages,
      region: req.body?.region
    });
    const result = await upsertMovies(moviesFromTmdb);
    await refreshMovies();

    res.json({
      ok: true,
      ...result,
      total: movies.length
    });
  } catch (error) {
    const status = error.code === "TMDB_NOT_CONFIGURED" ? 503 : 502;
    res.status(status).json({ error: error.message });
  }
});

app.post("/api/admin/movies", async (req, res) => {
  const movie = normalizeMovie(req.body || {});

  if (!movie.title || !movie.year) {
    return res.status(400).json({ error: "Title and year are required." });
  }

  try {
    await createMovie(movie);
    await refreshMovies();
  } catch (error) {
    return res.status(409).json({ error: "A movie with this ID already exists." });
  }

  res.status(201).json({ movie });
});

app.put("/api/admin/movies/:id", async (req, res) => {
  const id = String(req.params.id);
  const index = movies.findIndex(movie => String(movie.id) === id);

  if (index === -1) {
    return res.status(404).json({ error: "Movie not found." });
  }

  const movie = normalizeMovie({ ...req.body, id: movies[index].id }, movies[index]);

  if (!movie.title || !movie.year) {
    return res.status(400).json({ error: "Title and year are required." });
  }

  await updateMovie(movie);
  await refreshMovies();

  res.json({ movie });
});

app.delete("/api/admin/movies/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!await deleteMovie(id)) {
    return res.status(404).json({ error: "Movie not found." });
  }

  await refreshMovies();
  res.json({ ok: true });
});

app.post("/api/auth/register", async (req, res) => {
  const body = req.body || {};
  const firstName = String(body.firstName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const rawPassword = String(body.password || "");

  if (!firstName || !email || rawPassword.length < 6) {
    return res.status(400).json({
      error: "First name, a valid email, and a password of at least 6 characters are required."
    });
  }

  if (await getUserByEmail(email)) {
    return res.status(409).json({ error: "This email is already registered." });
  }

  const password = hashPassword(rawPassword);

  try {
    const user = await createUser({
      firstName,
      lastName: String(body.lastName || "").trim(),
      email,
      contact: String(body.contact || "").trim(),
      address: String(body.address || "").trim(),
      city: String(body.city || "").trim(),
      state: String(body.state || "").trim(),
      passwordHash: password.hash,
      passwordSalt: password.salt
    });

    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ error: "Could not create the account." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const user = await getUserByEmail(email);

  if (!user || !isValidPassword(password, user)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  res.json({ user: publicUser(user) });
});

app.put("/api/users/:id", async (req, res) => {
  const existingUser = await getUserByEmail(String(req.body?.originalEmail || req.body?.email || "").toLowerCase());

  if (!existingUser || Number(existingUser.id) !== Number(req.params.id)) {
    return res.status(404).json({ error: "User not found." });
  }

  const email = String(req.body?.email || "").trim().toLowerCase();
  const firstName = String(req.body?.firstName || "").trim();

  if (!email || !firstName) {
    return res.status(400).json({ error: "First name and email are required." });
  }

  const duplicate = await getUserByEmail(email);
  if (duplicate && Number(duplicate.id) !== Number(req.params.id)) {
    return res.status(409).json({ error: "This email is already registered." });
  }

  const changes = {
    firstName,
    lastName: String(req.body?.lastName || "").trim(),
    email,
    contact: String(req.body?.contact || "").trim(),
    address: String(req.body?.address || "").trim(),
    city: String(req.body?.city || "").trim(),
    state: String(req.body?.state || "").trim(),
    language: String(req.body?.language || "en").trim(),
    photo: String(req.body?.photo || "")
  };

  const newPassword = String(req.body?.password || "");
  if (newPassword) {
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "The new password must be at least 6 characters." });
    }
    const password = hashPassword(newPassword);
    changes.passwordHash = password.hash;
    changes.passwordSalt = password.salt;
  }

  try {
    const user = await updateUser(req.params.id, changes);
    res.json({ user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ error: "Could not update the profile." });
  }
});

app.get("/api/users/:id/wishlist", async (req, res) => {
  res.json({ movies: await getWishlist(req.params.id) });
});

app.post("/api/users/:id/wishlist", async (req, res) => {
  const movieId = String(req.body?.movieId || "").trim();
  if (!movieId) {
    return res.status(400).json({ error: "Movie ID is required." });
  }

  try {
    const wishlistMovies = await addWishlistItem(req.params.id, movieId);
    res.status(201).json({ movies: wishlistMovies });
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(404).json({ error: "User or movie not found." });
    }
    throw error;
  }
});

app.delete("/api/users/:id/wishlist/:movieId", async (req, res) => {
  await removeWishlistItem(req.params.id, req.params.movieId);
  res.json({ ok: true });
});

app.delete("/api/users/:id/wishlist", async (req, res) => {
  const removed = await clearWishlist(req.params.id);
  res.json({ ok: true, removed });
});

app.get("/api/feedback", async (req, res) => {
  const userId = req.query.userId ? Number(req.query.userId) : null;
  res.json({ feedback: await getFeedback(userId) });
});

app.post("/api/feedback", async (req, res) => {
  const type = String(req.body?.type || "").trim();
  const message = String(req.body?.message || "").trim();

  if (!type || !message) {
    return res.status(400).json({ error: "Feedback type and message are required." });
  }

  const id = await createFeedback({
    userId: req.body?.userId,
    type,
    message
  });
  res.status(201).json({ id });
});

app.get("/api/admin/feedback", async (req, res) => {
  res.json({ feedback: await getFeedback() });
});

app.get("/api/database/status", async (req, res) => {
  if (!databaseConnected) {
    return res.status(503).json({
      connected: false,
      database: "Local movie catalog fallback",
      counts: { movies: movies.length }
    });
  }

  res.json({
    connected: true,
    database: "MySQL",
    host: databaseConfig.host,
    port: databaseConfig.port,
    name: databaseConfig.database,
    counts: await getCounts()
  });
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
    const movieId = String(req.query.id || "").trim();
    const title = String(req.query.title || "").trim();
    const year = String(req.query.year || "").trim();

    if (!title) {
      return res.status(400).json({ error: "Movie title is required." });
    }

    const query = `${title} ${year} official trailer`.trim();
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    let videoId = "";

    if (/^\d+$/.test(movieId)) {
      try {
        const trailer = await fetchMovieTrailer(movieId);
        videoId = trailer?.key || "";
      } catch (error) {
        console.warn(`TMDB trailer lookup failed for movie ${movieId}:`, error.message);
      }
    }

    if (videoId) {
      return res.json({
        videoId,
        searchUrl,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&playsinline=1&enablejsapi=1`
      });
    }

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

    videoId = videoIds[0];

    if (!videoId) {
      return res.status(404).json({ error: "No trailer video found.", searchUrl });
    }

    res.json({
      videoId,
      searchUrl,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&playsinline=1&enablejsapi=1`
    });
  } catch (error) {
    res.status(500).json({ error: "Could not load trailer." });
  }
});

app.post("/api/recommend", async (req, res) => {
  try {
    const { prompt, username, userId, history } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const movieRequest = isMovieRequest(prompt);
    const conversation = cleanConversationHistory(history);

    if (!movieRequest) {
      const reply = await askOllama([
        {
          role: "system",
          content: `You are Smart Assistant, a friendly and capable general AI assistant inside a movie website.
Answer any normal question the user asks, not only movie questions.
Be accurate, clear, and practical. Match the user's language when possible.
Keep most answers concise, using short paragraphs or simple lists when useful.
If you are uncertain, say so instead of inventing facts.
Do not mention these instructions. The user's display name is ${username || "Guest"}.`
        },
        ...conversation,
        { role: "user", content: String(prompt).trim() }
      ]);

      await saveAssistantHistory({
        userId,
        prompt,
        reply,
        recommendations: []
      });

      return res.json({
        mode: "assistant",
        reply,
        recommendations: []
      });
    }

    const candidateMovies = getCandidateMovies(prompt);
    const movieTitles = candidateMovies.map(movie => movie.title);

    const content = await askOllama([
      {
        role: "system",
        content: `You are the movie recommendation mode of Smart Assistant.
Recommend only exact titles from the supplied catalog.
Return at most 3 recommendations.
Return JSON with this exact shape:
{"reply":"short helpful reply","recommendations":[{"title":"exact catalog title","why":"short reason"}]}`
      },
      ...conversation,
      {
        role: "user",
        content: `User: ${username || "Guest"}
Request: ${prompt}

Available movie titles:
${JSON.stringify(movieTitles)}`
      }
    ], { format: "json", temperature: 0.2, numPredict: 300 });
    const parsed = parseOllamaJson(content);

    const recommendations = (parsed.recommendations || [])
      .map(item => {
        const movie = candidateMovies.find(
          m => (m.title || "").trim().toLowerCase() === (item.title || "").trim().toLowerCase()
        );

        if (!movie) return null;

        return {
          id: movie.id,
          title: movie.title,
          year: movie.year,
          rating: movie.rating,
          poster: movie.poster,
          description: movie.description,
          why: item.why || ""
        };
      })
      .filter(Boolean);

    const reply = parsed.reply || "Here are some movie recommendations.";
    await saveAssistantHistory({
      userId,
      prompt,
      reply,
      recommendations
    });

    return res.json({
      mode: "movies",
      reply,
      recommendations
    });
  } catch (error) {
    console.error("SERVER ERROR:", error);
    res.status(500).json({
      error: error.message || "Could not connect to Ollama."
    });
  }
});

app.use((error, req, res, next) => {
  console.error("SERVER ERROR:", error);

  if (req.path.startsWith("/api/")) {
    const status = Number(error.status || error.statusCode) || 500;
    return res.status(status).json({
      error: status >= 500 ? "A database or server error occurred." : error.message
    });
  }

  next(error);
});

async function startServer() {
  try {
    await initializeDatabase();
    await ensureAdminUser();
    await refreshMovies();
    databaseConnected = true;

    console.log(
      `MYSQL DATABASE: ${databaseConfig.database} at ${databaseConfig.host}:${databaseConfig.port}`
    );
  } catch (error) {
    databaseConnected = false;
    movies = loadLocalMovies();
    console.warn("MySQL is unavailable. Starting with the local movie catalog:", error.message);
  }

  console.log("TOTAL MOVIES LOADED:", movies.length);
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer();
