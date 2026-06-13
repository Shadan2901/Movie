const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config();

const databaseConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "movie"
};

const moviesJsonPath = path.join(__dirname, "data", "movies.json");
let pool;

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

function toDatabaseMovie(movie) {
  return [
    String(movie.id),
    String(movie.title || "").trim(),
    String(movie.year || "").trim(),
    String(movie.rating || "N/A").trim(),
    JSON.stringify(Array.isArray(movie.genre_ids) ? movie.genre_ids : []),
    String(movie.poster || "").trim(),
    String(movie.description || "").trim(),
    Number(movie.popularity || 0)
  ];
}

function fromDatabaseMovie(row) {
  let genreIds = [];

  try {
    genreIds = typeof row.genre_ids === "string"
      ? JSON.parse(row.genre_ids || "[]")
      : (row.genre_ids || []);
  } catch (error) {
    genreIds = [];
  }

  return {
    id: row.id,
    title: row.title,
    year: row.year,
    rating: row.rating,
    genre_ids: genreIds,
    poster: row.poster,
    description: row.description,
    popularity: Number(row.popularity || 0)
  };
}

function moviesMatch(existing, incoming) {
  return (
    String(existing.title || "") === String(incoming.title || "") &&
    String(existing.year || "") === String(incoming.year || "") &&
    String(existing.rating || "") === String(incoming.rating || "") &&
    JSON.stringify(existing.genre_ids || []) === JSON.stringify(incoming.genre_ids || []) &&
    String(existing.poster || "") === String(incoming.poster || "") &&
    String(existing.description || "") === String(incoming.description || "") &&
    Number(existing.popularity || 0) === Number(incoming.popularity || 0)
  );
}

async function createSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS movies (
      id VARCHAR(100) PRIMARY KEY,
      title VARCHAR(500) NOT NULL,
      year VARCHAR(4) NOT NULL,
      rating VARCHAR(20) NOT NULL DEFAULT 'N/A',
      genre_ids LONGTEXT NOT NULL,
      poster TEXT NOT NULL,
      description LONGTEXT NOT NULL,
      popularity DOUBLE NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_movies_year (year),
      INDEX idx_movies_title (title),
      INDEX idx_movies_popularity (popularity)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL DEFAULT '',
      email VARCHAR(255) NOT NULL UNIQUE,
      contact VARCHAR(100) NOT NULL DEFAULT '',
      address TEXT NOT NULL,
      city VARCHAR(100) NOT NULL DEFAULT '',
      state VARCHAR(100) NOT NULL DEFAULT '',
      password_hash VARCHAR(255) NOT NULL,
      password_salt VARCHAR(255) NOT NULL,
      role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS genres (
      id INT NOT NULL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS movie_genres (
      movie_id VARCHAR(100) NOT NULL,
      genre_id INT NOT NULL,
      PRIMARY KEY (movie_id, genre_id),
      CONSTRAINT fk_movie_genres_movie
        FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
      CONSTRAINT fk_movie_genres_genre
        FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id INT UNSIGNED NOT NULL PRIMARY KEY,
      language VARCHAR(10) NOT NULL DEFAULT 'en',
      profile_photo LONGTEXT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_user_preferences_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS wishlists (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      movie_id VARCHAR(100) NOT NULL,
      added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_wishlist_user_movie (user_id, movie_id),
      INDEX idx_wishlists_user (user_id),
      CONSTRAINT fk_wishlists_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_wishlists_movie
        FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NULL,
      type VARCHAR(50) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_feedback_user (user_id),
      INDEX idx_feedback_created (created_at),
      CONSTRAINT fk_feedback_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS recommendation_history (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NULL,
      prompt TEXT NOT NULL,
      reply TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_recommendation_user (user_id),
      INDEX idx_recommendation_created (created_at),
      CONSTRAINT fk_recommendation_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS recommendation_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      history_id BIGINT UNSIGNED NOT NULL,
      movie_id VARCHAR(100) NOT NULL,
      reason TEXT NOT NULL,
      position INT NOT NULL DEFAULT 1,
      INDEX idx_recommendation_items_history (history_id),
      CONSTRAINT fk_recommendation_items_history
        FOREIGN KEY (history_id) REFERENCES recommendation_history(id) ON DELETE CASCADE,
      CONSTRAINT fk_recommendation_items_movie
        FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await pool.query(`
    INSERT IGNORE INTO user_preferences (user_id, language)
    SELECT id, 'en' FROM users
  `);
}

async function importMoviesIfEmpty() {
  const [countRows] = await pool.query("SELECT COUNT(*) AS total FROM movies");
  if (Number(countRows[0].total) > 0 || !fs.existsSync(moviesJsonPath)) return;

  const movies = JSON.parse(fs.readFileSync(moviesJsonPath, "utf8"));
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (let index = 0; index < movies.length; index += 100) {
      const batch = movies.slice(index, index + 100).map(toDatabaseMovie);
      await connection.query(`
        INSERT INTO movies (
          id, title, year, rating, genre_ids, poster, description, popularity
        ) VALUES ?
      `, [batch]);
    }

    await connection.commit();
    console.log(`Imported ${movies.length} movies into MySQL.`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function syncGenres() {
  const genreRows = Object.entries(GENRE_NAMES).map(([id, name]) => [Number(id), name]);
  await pool.query(
    "INSERT INTO genres (id, name) VALUES ? ON DUPLICATE KEY UPDATE name = VALUES(name)",
    [genreRows]
  );

  const [countRows] = await pool.query("SELECT COUNT(*) AS total FROM movie_genres");
  if (Number(countRows[0].total) > 0) return;

  const [movieRows] = await pool.query("SELECT id, genre_ids FROM movies");
  const links = [];

  for (const movie of movieRows) {
    let genreIds = [];
    try {
      genreIds = JSON.parse(movie.genre_ids || "[]");
    } catch (error) {
      genreIds = [];
    }

    for (const genreId of genreIds) {
      if (GENRE_NAMES[genreId]) links.push([String(movie.id), Number(genreId)]);
    }
  }

  for (let index = 0; index < links.length; index += 500) {
    await pool.query(
      "INSERT IGNORE INTO movie_genres (movie_id, genre_id) VALUES ?",
      [links.slice(index, index + 500)]
    );
  }
}

async function syncMovieGenres(movie) {
  const genreIds = Array.isArray(movie.genre_ids)
    ? movie.genre_ids.map(Number).filter(id => GENRE_NAMES[id])
    : [];

  await pool.execute("DELETE FROM movie_genres WHERE movie_id = ?", [String(movie.id)]);

  if (genreIds.length > 0) {
    await pool.query(
      "INSERT INTO movie_genres (movie_id, genre_id) VALUES ?",
      [genreIds.map(genreId => [String(movie.id), genreId])]
    );
  }
}

async function initializeDatabase() {
  const serverConnection = await mysql.createConnection({
    host: databaseConfig.host,
    port: databaseConfig.port,
    user: databaseConfig.user,
    password: databaseConfig.password
  });

  await serverConnection.query(
    `CREATE DATABASE IF NOT EXISTS \`${databaseConfig.database}\`
     CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`
  );
  await serverConnection.end();

  pool = mysql.createPool({
    ...databaseConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4"
  });

  await createSchema();
  await importMoviesIfEmpty();
  await syncGenres();
}

async function getAllMovies() {
  const [rows] = await pool.query("SELECT * FROM movies");
  return rows.map(fromDatabaseMovie);
}

async function getMovieById(id) {
  const [rows] = await pool.execute("SELECT * FROM movies WHERE id = ?", [String(id)]);
  return rows[0] ? fromDatabaseMovie(rows[0]) : null;
}

async function createMovie(movie) {
  await pool.execute(`
    INSERT INTO movies (
      id, title, year, rating, genre_ids, poster, description, popularity
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, toDatabaseMovie(movie));

  await syncMovieGenres(movie);
  return getMovieById(movie.id);
}

async function upsertMovies(movieList) {
  const uniqueMovies = [...new Map(
    (movieList || [])
      .filter(movie => movie && movie.id && movie.title && movie.year)
      .map(movie => [String(movie.id), movie])
  ).values()];

  if (uniqueMovies.length === 0) {
    return { fetched: 0, added: 0, updated: 0, unchanged: 0 };
  }

  const ids = uniqueMovies.map(movie => String(movie.id));
  const [existingRows] = await pool.query(
    "SELECT * FROM movies WHERE id IN (?)",
    [ids]
  );
  const existingById = new Map(
    existingRows.map(row => [String(row.id), fromDatabaseMovie(row)])
  );

  let added = 0;
  let updated = 0;
  let unchanged = 0;

  for (const movie of uniqueMovies) {
    const existing = existingById.get(String(movie.id));
    if (!existing) {
      added += 1;
    } else if (moviesMatch(existing, movie)) {
      unchanged += 1;
    } else {
      updated += 1;
    }
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (let index = 0; index < uniqueMovies.length; index += 100) {
      const batch = uniqueMovies.slice(index, index + 100);
      await connection.query(`
        INSERT INTO movies (
          id, title, year, rating, genre_ids, poster, description, popularity
        ) VALUES ?
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          year = VALUES(year),
          rating = VALUES(rating),
          genre_ids = VALUES(genre_ids),
          poster = VALUES(poster),
          description = VALUES(description),
          popularity = VALUES(popularity)
      `, [batch.map(toDatabaseMovie)]);
    }

    await connection.query(
      "DELETE FROM movie_genres WHERE movie_id IN (?)",
      [ids]
    );

    const genreLinks = uniqueMovies.flatMap(movie =>
      (movie.genre_ids || [])
        .map(Number)
        .filter(genreId => GENRE_NAMES[genreId])
        .map(genreId => [String(movie.id), genreId])
    );

    for (let index = 0; index < genreLinks.length; index += 500) {
      await connection.query(
        "INSERT IGNORE INTO movie_genres (movie_id, genre_id) VALUES ?",
        [genreLinks.slice(index, index + 500)]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return {
    fetched: uniqueMovies.length,
    added,
    updated,
    unchanged
  };
}

async function updateMovie(movie) {
  const [result] = await pool.execute(`
    UPDATE movies
    SET title = ?,
        year = ?,
        rating = ?,
        genre_ids = ?,
        poster = ?,
        description = ?,
        popularity = ?
    WHERE id = ?
  `, [
    String(movie.title || "").trim(),
    String(movie.year || "").trim(),
    String(movie.rating || "N/A").trim(),
    JSON.stringify(Array.isArray(movie.genre_ids) ? movie.genre_ids : []),
    String(movie.poster || "").trim(),
    String(movie.description || "").trim(),
    Number(movie.popularity || 0),
    String(movie.id)
  ]);

  if (Number(result.affectedRows) === 0) return null;
  await syncMovieGenres(movie);
  return getMovieById(movie.id);
}

async function deleteMovie(id) {
  const [result] = await pool.execute("DELETE FROM movies WHERE id = ?", [String(id)]);
  return Number(result.affectedRows) > 0;
}

async function getUserById(id) {
  const [rows] = await pool.execute(`
    SELECT users.*, user_preferences.language, user_preferences.profile_photo
    FROM users
    LEFT JOIN user_preferences ON user_preferences.user_id = users.id
    WHERE users.id = ?
  `, [Number(id)]);
  return rows[0] || null;
}

async function getUserByEmail(email) {
  const [rows] = await pool.execute(`
    SELECT users.*, user_preferences.language, user_preferences.profile_photo
    FROM users
    LEFT JOIN user_preferences ON user_preferences.user_id = users.id
    WHERE users.email = ?
  `, [String(email).toLowerCase()]);
  return rows[0] || null;
}

async function createUser(user) {
  const [result] = await pool.execute(`
    INSERT INTO users (
      first_name, last_name, email, contact, address, city, state,
      password_hash, password_salt, role
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    user.firstName,
    user.lastName || "",
    user.email,
    user.contact || "",
    user.address || "",
    user.city || "",
    user.state || "",
    user.passwordHash,
    user.passwordSalt,
    user.role || "user"
  ]);

  await pool.execute(
    "INSERT INTO user_preferences (user_id, language) VALUES (?, 'en')",
    [result.insertId]
  );
  return getUserById(result.insertId);
}

async function updateUser(id, user) {
  const fields = [
    "first_name = ?",
    "last_name = ?",
    "email = ?",
    "contact = ?",
    "address = ?",
    "city = ?",
    "state = ?"
  ];
  const values = [
    user.firstName,
    user.lastName || "",
    user.email,
    user.contact || "",
    user.address || "",
    user.city || "",
    user.state || ""
  ];

  if (user.passwordHash && user.passwordSalt) {
    fields.push("password_hash = ?", "password_salt = ?");
    values.push(user.passwordHash, user.passwordSalt);
  }

  values.push(Number(id));
  const [result] = await pool.execute(
    `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
    values
  );

  if (Object.hasOwn(user, "language") || Object.hasOwn(user, "photo")) {
    await pool.execute(`
      INSERT INTO user_preferences (user_id, language, profile_photo)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        language = VALUES(language),
        profile_photo = VALUES(profile_photo)
    `, [
      Number(id),
      user.language || "en",
      user.photo || null
    ]);
  }

  return getUserById(id);
}

async function getWishlist(userId) {
  const [rows] = await pool.execute(`
    SELECT movies.*
    FROM wishlists
    INNER JOIN movies ON movies.id = wishlists.movie_id
    WHERE wishlists.user_id = ?
    ORDER BY wishlists.added_at DESC
  `, [Number(userId)]);

  return rows.map(fromDatabaseMovie);
}

async function addWishlistItem(userId, movieId) {
  await pool.execute(
    "INSERT IGNORE INTO wishlists (user_id, movie_id) VALUES (?, ?)",
    [Number(userId), String(movieId)]
  );
  return getWishlist(userId);
}

async function removeWishlistItem(userId, movieId) {
  const [result] = await pool.execute(
    "DELETE FROM wishlists WHERE user_id = ? AND movie_id = ?",
    [Number(userId), String(movieId)]
  );
  return Number(result.affectedRows) > 0;
}

async function clearWishlist(userId) {
  const [result] = await pool.execute(
    "DELETE FROM wishlists WHERE user_id = ?",
    [Number(userId)]
  );
  return Number(result.affectedRows);
}

async function createFeedback({ userId, type, message }) {
  const [result] = await pool.execute(
    "INSERT INTO feedback (user_id, type, message) VALUES (?, ?, ?)",
    [userId ? Number(userId) : null, String(type), String(message)]
  );
  return Number(result.insertId);
}

async function getFeedback(userId) {
  const values = [];
  let whereClause = "";

  if (userId) {
    whereClause = "WHERE feedback.user_id = ?";
    values.push(Number(userId));
  }

  const [rows] = await pool.execute(`
    SELECT
      feedback.id,
      feedback.type,
      feedback.message,
      feedback.created_at,
      COALESCE(users.email, 'Guest') AS user
    FROM feedback
    LEFT JOIN users ON users.id = feedback.user_id
    ${whereClause}
    ORDER BY feedback.created_at DESC
    LIMIT 100
  `, values);

  return rows.map(row => ({
    id: Number(row.id),
    type: row.type,
    message: row.message,
    user: row.user,
    date: new Date(row.created_at).toLocaleString()
  }));
}

async function saveRecommendationHistory({ userId, prompt, reply, recommendations }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [historyResult] = await connection.execute(`
      INSERT INTO recommendation_history (user_id, prompt, reply)
      VALUES (?, ?, ?)
    `, [userId ? Number(userId) : null, String(prompt), String(reply)]);

    const items = (recommendations || [])
      .filter(item => item.id)
      .map((item, index) => [
        historyResult.insertId,
        String(item.id),
        String(item.why || ""),
        index + 1
      ]);

    if (items.length > 0) {
      await connection.query(`
        INSERT INTO recommendation_items (history_id, movie_id, reason, position)
        VALUES ?
      `, [items]);
    }

    await connection.commit();
    return Number(historyResult.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getCounts() {
  const tables = [
    "movies",
    "users",
    "genres",
    "movie_genres",
    "user_preferences",
    "wishlists",
    "feedback",
    "recommendation_history",
    "recommendation_items"
  ];
  const counts = {};

  for (const table of tables) {
    const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM \`${table}\``);
    counts[table] = Number(rows[0].total);
  }

  return counts;
}

module.exports = {
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
};
