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
const syncMoviesBtn = document.getElementById("syncMoviesBtn");
const resetFormBtn = document.getElementById("resetFormBtn");
const adminFeedbackList = document.getElementById("adminFeedbackList");
const adminFeedbackCount = document.getElementById("adminFeedbackCount");
const refreshFeedbackBtn = document.getElementById("refreshFeedbackBtn");
const feedbackReplyTemplate = document.getElementById("feedbackReplyTemplate");
const adminSectionTabs = document.querySelectorAll(".admin-section-tab");
const adminPanels = document.querySelectorAll(".admin-panel");

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
let feedback = [];
let serverMode = hasServerApi();

function hasServerApi() {
  const localHosts = ["localhost", "127.0.0.1"];
  const isStaticPreview =
    location.protocol === "file:" ||
    location.hostname.endsWith("github.io") ||
    (localHosts.includes(location.hostname) && location.port && location.port !== "3000");
  return !isStaticPreview;
}

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

function saveLocalFeedback() {
  localStorage.setItem("adminFeedback", JSON.stringify(feedback));
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

function loadLocalFeedback() {
  const saved = localStorage.getItem("adminFeedback");
  if (saved) {
    feedback = JSON.parse(saved);
    return;
  }

  feedback = [
    {
      id: "local-feedback-1",
      type: "Suggestion",
      message: "Please add more action movies and make trailer playback easier.",
      user: "demo.user@example.com",
      date: new Date().toLocaleString(),
      reply: "",
      repliedAt: ""
    }
  ];
  saveLocalFeedback();
}

function switchAdminSection(section) {
  adminSectionTabs.forEach(tab => {
    tab.classList.toggle("active", tab.dataset.adminSection === section);
  });

  adminPanels.forEach(panel => {
    const isMovies = section === "movies" && panel.id === "adminMoviesPanel";
    const isFeedback = section === "feedback" && panel.id === "adminFeedbackPanel";
    panel.classList.toggle("active", isMovies || isFeedback);
  });
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
    setStatus("MySQL database");
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
    const trailerId = escapeHtml(movie.id || "");
    const trailerTitle = escapeHtml(movie.title || "Movie");
    const trailerYear = escapeHtml(movie.year || "");
    const trailerUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      `${movie.title || "movie"} ${movie.year || ""} official trailer`.trim()
    )}`;

    return `
      <tr>
        <td>
          <div class="admin-movie-cell">
            <a
              class="admin-poster-link"
              href="${trailerUrl}"
              data-trailer-id="${trailerId}"
              data-trailer-title="${trailerTitle}"
              data-trailer-year="${trailerYear}"
              aria-label="Play ${trailerTitle} trailer"
            >
              <img src="${poster}" alt="${trailerTitle}" onerror="this.onerror=null; this.src='${fallback}';">
            </a>
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

async function renderAdminFeedback() {
  if (!adminFeedbackList) return;

  try {
    if (!serverMode) {
      loadLocalFeedback();
    } else {
      const response = await fetch("/api/admin/feedback");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load feedback.");
      feedback = data.feedback || [];
    }

    if (!feedback.length) {
      adminFeedbackCount.textContent = "0 feedback";
      adminFeedbackList.innerHTML = `<div class="feedback-empty">No feedback submitted yet.</div>`;
      return;
    }

    adminFeedbackCount.textContent = `${feedback.length} feedback`;
    adminFeedbackList.innerHTML = "";

    feedback.forEach(item => {
      const node = feedbackReplyTemplate.content.cloneNode(true);
      const article = node.querySelector(".admin-feedback-item");
      const state = node.querySelector("[data-feedback-state]");
      const existingReply = node.querySelector("[data-feedback-existing-reply]");
      const textarea = node.querySelector("[data-feedback-reply]");
      const saveButton = node.querySelector("[data-feedback-save]");

      article.dataset.feedbackId = item.id;
      node.querySelector("[data-feedback-type]").textContent = item.type || "Feedback";
      node.querySelector("[data-feedback-message]").textContent = item.message || "";
      node.querySelector("[data-feedback-user]").textContent = `${item.user || "Guest"} - ${item.date || ""}`;
      state.textContent = item.reply ? "Replied" : "Needs reply";
      state.className = item.reply ? "feedback-state replied" : "feedback-state pending";
      textarea.value = item.reply || "";
      saveButton.dataset.feedbackSave = item.id;

      if (item.reply) {
        existingReply.innerHTML = `
          <strong>Current reply</strong>
          <p>${escapeHtml(item.reply)}</p>
          <small>${escapeHtml(item.repliedAt || "")}</small>
        `;
      } else {
        existingReply.innerHTML = `<em>No admin reply yet.</em>`;
      }

      adminFeedbackList.appendChild(node);
    });
  } catch (error) {
    adminFeedbackCount.textContent = "Unavailable";
    adminFeedbackList.innerHTML = `<div class="feedback-empty">${escapeHtml(error.message)}</div>`;
  }
}

async function saveFeedbackReply(id, reply) {
  if (!serverMode) {
    const index = feedback.findIndex(item => String(item.id) === String(id));
    if (index === -1) throw new Error("Feedback not found.");
    feedback[index] = {
      ...feedback[index],
      reply,
      repliedAt: new Date().toLocaleString()
    };
    saveLocalFeedback();
    return feedback[index];
  }

  const response = await fetch(`/api/admin/feedback/${encodeURIComponent(id)}/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reply })
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Could not save reply.");
  }

  return data.feedback;
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

async function syncLatestMovies() {
  if (!serverMode) {
    throw new Error("Start the website server before fetching movies.");
  }

  const response = await fetch("/api/admin/movies/sync-latest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Could not fetch the latest movies.");
  }

  await fetchMovies();
  return data;
}

movieForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const record = getFormRecord();
  if (!record.title || !record.year) return;

  try {
    setStatus("Saving...");
    await saveMovie(record);
    resetForm();
    setStatus(serverMode ? "Saved to MySQL database" : "Saved locally");
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
adminSectionTabs.forEach(tab => {
  tab.addEventListener("click", function () {
    switchAdminSection(tab.dataset.adminSection);
  });
});
syncMoviesBtn.addEventListener("click", async function () {
  try {
    syncMoviesBtn.disabled = true;
    syncMoviesBtn.textContent = "Fetching...";
    setStatus("Checking TMDB for new movies...");

    const result = await syncLatestMovies();
    setStatus(
      `${result.added} new, ${result.updated} updated, ` +
      `${result.unchanged} unchanged`
    );
  } catch (error) {
    setStatus(error.message);
  } finally {
    syncMoviesBtn.disabled = false;
    syncMoviesBtn.textContent = "Fetch Latest Movies";
  }
});
resetFormBtn.addEventListener("click", resetForm);
refreshFeedbackBtn.addEventListener("click", renderAdminFeedback);
adminFeedbackList.addEventListener("click", async function (event) {
  const button = event.target.closest("[data-feedback-save]");
  if (!button) return;

  const item = button.closest(".admin-feedback-item");
  const status = item.querySelector("[data-feedback-status]");
  const textarea = item.querySelector("[data-feedback-reply]");
  const reply = textarea.value.trim();

  if (!reply) {
    status.textContent = "Write a reply first.";
    return;
  }

  try {
    button.disabled = true;
    status.textContent = "Saving reply...";
    await saveFeedbackReply(button.dataset.feedbackSave, reply);
    await renderAdminFeedback();
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

fetchMovies();
renderAdminFeedback();
