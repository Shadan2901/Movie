const adminMovieTable = document.getElementById("adminMovieTable");
const adminSearchInput = document.getElementById("adminSearchInput");
const adminCount = document.getElementById("adminCount");
const movieForm = document.getElementById("movieForm");
const formTitle = document.getElementById("formTitle");
const formStatus = document.getElementById("formStatus");
const movieIdInput = document.getElementById("movieIdInput");
const titleInput = document.getElementById("titleInput");
const yearInput = document.getElementById("yearInput");
const ratingInput = document.getElementById("ratingInput");
const popularityInput = document.getElementById("popularityInput");
const posterInput = document.getElementById("posterInput");
const descriptionInput = document.getElementById("descriptionInput");
const newMovieBtn = document.getElementById("newMovieBtn");
const resetFormBtn = document.getElementById("resetFormBtn");
const adminFeedbackList = document.getElementById("adminFeedbackList");

if (localStorage.getItem("smartAdminVerified") !== "true") {
  alert("Please verify admin access first.");
  window.location.href = "login.html";
}

const fallbackPosters = [
  "images/inception.jpg",
  "images/lalaland.avif",
  "images/blade.jpg",
  "images/titanic.jpg",
  "images/Hangover.jpg",
  "images/about.jpg"
];

let movies = [];
let searchText = "";
let serverMode = location.protocol !== "file:";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getPoster(movie, index) {
  return movie.poster || fallbackPosters[index % fallbackPosters.length];
}

function setStatus(message) {
  formStatus.textContent = message;
}

function saveLocalMovies() {
  localStorage.setItem("adminMovies", JSON.stringify(movies));
}

function loadLocalMovies() {
  const saved = localStorage.getItem("adminMovies");
  if (saved) {
    movies = JSON.parse(saved);
    return;
  }

  movies = Array.isArray(window.LOCAL_MOVIES) ? window.LOCAL_MOVIES.slice(0, 120) : [];
  saveLocalMovies();
}

async function fetchMovies() {
  if (!serverMode) {
    loadLocalMovies();
    renderMovies();
    setStatus("Local file mode");
    return;
  }

  try {
    const response = await fetch(`/api/admin/movies?search=${encodeURIComponent(searchText)}`);
    if (!response.ok) throw new Error("Failed to load movies.");
    const data = await response.json();
    movies = data.movies || [];
    renderMovies(data.total);
    setStatus("Server catalog");
  } catch (error) {
    serverMode = false;
    loadLocalMovies();
    renderMovies();
    setStatus("Local fallback");
  }
}

function getFilteredLocalMovies() {
  const query = searchText.toLowerCase().trim();
  if (!query) return movies;

  return movies.filter(movie => {
    return [
      movie.title,
      movie.year,
      movie.rating,
      movie.description
    ].join(" ").toLowerCase().includes(query);
  });
}

function resetForm() {
  formTitle.textContent = "Add Movie";
  movieIdInput.value = "";
  movieForm.reset();
  titleInput.focus();
}

function fillForm(movie) {
  formTitle.textContent = "Edit Movie";
  movieIdInput.value = movie.id;
  titleInput.value = movie.title || "";
  yearInput.value = movie.year || "";
  ratingInput.value = movie.rating || "";
  popularityInput.value = movie.popularity || "";
  posterInput.value = movie.poster || "";
  descriptionInput.value = movie.description || "";
  titleInput.focus();
}

function getFormRecord() {
  const id = movieIdInput.value || `admin-${Date.now()}`;
  return {
    id,
    title: titleInput.value.trim(),
    year: yearInput.value.trim(),
    rating: ratingInput.value.trim() || "N/A",
    popularity: Number(popularityInput.value || 0),
    poster: posterInput.value.trim(),
    description: descriptionInput.value.trim(),
    genre_ids: []
  };
}

function renderMovies(totalOverride) {
  const visibleMovies = serverMode ? movies : getFilteredLocalMovies();
  adminCount.textContent = `${totalOverride ?? visibleMovies.length} movies`;

  if (visibleMovies.length === 0) {
    adminMovieTable.innerHTML = `<tr><td colspan="4">No movies found.</td></tr>`;
    return;
  }

  adminMovieTable.innerHTML = visibleMovies.map((movie, index) => {
    const poster = escapeHtml(getPoster(movie, index));
    const fallback = escapeHtml(fallbackPosters[index % fallbackPosters.length]);

    return `
      <tr>
        <td>
          <div class="admin-movie-cell">
            <img src="${poster}" alt="${escapeHtml(movie.title)}" onerror="this.onerror=null; this.src='${fallback}';">
            <div>
              <strong>${escapeHtml(movie.title)}</strong>
              <p>${escapeHtml(movie.description || "No description.").slice(0, 110)}</p>
            </div>
          </div>
        </td>
        <td>${escapeHtml(movie.year)}</td>
        <td>${escapeHtml(movie.rating || "N/A")}</td>
        <td>
          <div class="admin-row-actions">
            <button class="admin-secondary-btn" type="button" data-edit-id="${escapeHtml(movie.id)}">Edit</button>
            <button class="admin-danger-btn" type="button" data-delete-id="${escapeHtml(movie.id)}">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderAdminFeedback() {
  if (!adminFeedbackList) return;

  let feedback = [];
  try {
    feedback = JSON.parse(localStorage.getItem("smartFeedback") || "[]");
  } catch (error) {
    feedback = [];
  }

  if (!feedback.length) {
    adminFeedbackList.innerHTML = `<div class="feedback-empty">No feedback submitted yet.</div>`;
    return;
  }

  adminFeedbackList.innerHTML = feedback.map(item => `
    <div class="feedback-item">
      <strong>${escapeHtml(item.type)}</strong>
      <p>${escapeHtml(item.message)}</p>
      <span>${escapeHtml(item.user || "Guest")} - ${escapeHtml(item.date || "")}</span>
    </div>
  `).join("");
}

async function saveMovie(record) {
  if (!serverMode) {
    const existingIndex = movies.findIndex(movie => String(movie.id) === String(record.id));
    if (existingIndex >= 0) {
      movies[existingIndex] = record;
    } else {
      movies.unshift(record);
    }
    saveLocalMovies();
    renderMovies();
    return;
  }

  const isEdit = Boolean(movieIdInput.value);
  const url = isEdit ? `/api/admin/movies/${encodeURIComponent(record.id)}` : "/api/admin/movies";
  const method = isEdit ? "PUT" : "POST";

  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record)
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Could not save movie.");
  }

  await fetchMovies();
}

async function deleteMovie(id) {
  if (!serverMode) {
    movies = movies.filter(movie => String(movie.id) !== String(id));
    saveLocalMovies();
    renderMovies();
    return;
  }

  const response = await fetch(`/api/admin/movies/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Could not delete movie.");
  }

  await fetchMovies();
}

movieForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const record = getFormRecord();
  if (!record.title || !record.year) return;

  try {
    setStatus("Saving...");
    await saveMovie(record);
    resetForm();
    setStatus(serverMode ? "Saved to data/movies.json" : "Saved locally");
  } catch (error) {
    setStatus(error.message);
  }
});

adminMovieTable.addEventListener("click", async function (event) {
  const editButton = event.target.closest("[data-edit-id]");
  const deleteButton = event.target.closest("[data-delete-id]");

  if (editButton) {
    const movie = movies.find(item => String(item.id) === String(editButton.dataset.editId));
    if (movie) fillForm(movie);
  }

  if (deleteButton) {
    const movie = movies.find(item => String(item.id) === String(deleteButton.dataset.deleteId));
    if (!movie || !confirm(`Delete "${movie.title}"?`)) return;

    try {
      setStatus("Deleting...");
      await deleteMovie(deleteButton.dataset.deleteId);
      resetForm();
      setStatus(serverMode ? "Deleted from catalog" : "Deleted locally");
    } catch (error) {
      setStatus(error.message);
    }
  }
});

adminSearchInput.addEventListener("input", function () {
  searchText = adminSearchInput.value;
  if (serverMode) {
    fetchMovies();
  } else {
    renderMovies();
  }
});

newMovieBtn.addEventListener("click", resetForm);
resetFormBtn.addEventListener("click", resetForm);

fetchMovies();
renderAdminFeedback();
