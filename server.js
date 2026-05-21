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

if (fs.existsSync(moviesPath)) {
  movies = JSON.parse(fs.readFileSync(moviesPath, "utf-8"));
}

console.log("TOTAL MOVIES LOADED:", movies.length);

function isTargetYear(movie) {
  const year = Number(movie.year);
  return year >= 2004 && year <= 2026;
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

  let filteredMovies = [...movies]
    .filter(isTargetYear)
    .sort((a, b) => {
      if (Number(b.year) !== Number(a.year)) {
        return Number(b.year) - Number(a.year);
      }
      return (b.popularity || 0) - (a.popularity || 0);
    });

  if (search) {
    filteredMovies = filteredMovies.filter(movie =>
      (movie.title || "").toLowerCase().includes(search) ||
      (movie.description || "").toLowerCase().includes(search) ||
      String(movie.year || "").toLowerCase().includes(search)
    );
  }

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