const movieGrid = document.getElementById("movieGrid");
const chatBox = document.getElementById("chatBox");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const chatInput = document.getElementById("chatInput");
const chatSendBtn = document.getElementById("chatSendBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const editProfileBtn = document.getElementById("editProfileBtn");
const welcomeText = document.getElementById("welcomeText");
const movieSearch = document.getElementById("movieSearch");
const genreFilter = document.getElementById("genreFilter");
const yearFilter = document.getElementById("yearFilter");
const sortFilter = document.getElementById("sortFilter");
const resetFiltersBtn = document.getElementById("resetFiltersBtn");
const filterMenuToggle = document.getElementById("filterMenuToggle");
const filterMenu = document.getElementById("filterMenu");
const pagination = document.getElementById("pagination");
const wishlistCount = document.getElementById("wishlistCount");
const wishlistList = document.getElementById("wishlistList");
const aiAssistantToggle = document.getElementById("aiAssistantToggle");
const aiAssistantPanel = document.getElementById("aiAssistantPanel");
const aiAssistantClose = document.getElementById("aiAssistantClose");

const burgerBtn = document.getElementById("burgerBtn");
const navMenu = document.getElementById("navMenu");
const profileBtn = document.getElementById("profileBtn");
const profileDropdown = document.getElementById("profileDropdown");

const profileModal = document.getElementById("profileModal");
const closeProfileModal = document.getElementById("closeProfileModal");
const cancelProfileBtn = document.getElementById("cancelProfileBtn");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const firstNameInput = document.getElementById("firstNameInput");
const lastNameInput = document.getElementById("lastNameInput");
const emailInput = document.getElementById("emailInput");
const addressInput = document.getElementById("addressInput");
const contactInput = document.getElementById("contactInput");
const cityInput = document.getElementById("cityInput");
const stateInput = document.getElementById("stateInput");
const passwordInput = document.getElementById("passwordInput");

const profileAvatar = document.getElementById("profileAvatar");
const profilePreviewAvatar = document.getElementById("profilePreviewAvatar");
const settingsTitle = document.getElementById("settingsTitle");
const settingsItems = document.querySelectorAll(".settings-item");
const settingsPanels = document.querySelectorAll(".settings-panel");
const profileImageInput = document.getElementById("profileImageInput");
const feedbackTypeInput = document.getElementById("feedbackTypeInput");
const feedbackMessageInput = document.getElementById("feedbackMessageInput");
const feedbackList = document.getElementById("feedbackList");
const adminEmailInput = document.getElementById("adminEmailInput");
const adminPasswordInput = document.getElementById("adminPasswordInput");

let currentUser = null;
let currentSettingsTab = "profile";
let pendingProfilePhoto = "";
let originalProfileEmail = "";
let currentPage = 1;
let currentSearch = "";
let currentGenre = "";
let currentYear = "";
let currentSort = "newest";
let totalPagesGlobal = 1;
let aiBusy = false;
let wishlist = [];
let assistantConversation = [];
const limit = 15;
const localMovies = Array.isArray(window.LOCAL_MOVIES) ? window.LOCAL_MOVIES : [];
const genreNames = {
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
const posterFallbacks = [
  "images/inception.jpg",
  "images/lalaland.avif",
  "images/blade.jpg",
  "images/titanic.jpg",
  "images/Hangover.jpg",
  "images/about.jpg"
];
const settingsTitles = {
  profile: "Edit profile",
  feedback: "Feedback",
  admin: "Admin verification"
};

function addMessage(text, sender) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  msg.innerHTML = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

function setAssistantOpen(isOpen, focusInput = false) {
  aiAssistantPanel.classList.toggle("show", isOpen);
  aiAssistantPanel.setAttribute("aria-hidden", String(!isOpen));
  aiAssistantToggle.setAttribute("aria-expanded", String(isOpen));
  aiAssistantToggle.setAttribute("aria-label", isOpen ? "Close AI Assistant" : "Open AI Assistant");
  aiAssistantToggle.classList.toggle("active", isOpen);

  if (isOpen && focusInput) {
    window.setTimeout(() => chatInput.focus(), 180);
  }
}

function setFilterMenuOpen(isOpen) {
  filterMenu.classList.toggle("show", isOpen);
  filterMenu.setAttribute("aria-hidden", String(!isOpen));
  filterMenuToggle.setAttribute("aria-expanded", String(isOpen));
}

function setAiBusy(isBusy) {
  aiBusy = isBusy;
  sendBtn.disabled = isBusy;
  chatSendBtn.disabled = isBusy;
  sendBtn.textContent = isBusy ? "Thinking..." : "Ask AI";
  chatSendBtn.textContent = isBusy ? "..." : "Send";
}

function getDisplayName() {
  if (!currentUser) return "Guest";
  const fullName = `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim();
  return fullName || "Guest";
}

function getAvatarLetter() {
  if (!currentUser) return "G";
  return getDisplayName().charAt(0).toUpperCase();
}

function applyAvatar(element, letter, photo) {
  if (!element) return;

  if (photo) {
    element.textContent = "";
    element.style.backgroundImage = `url("${photo}")`;
    element.style.backgroundSize = "cover";
    element.style.backgroundPosition = "center";
  } else {
    element.textContent = letter;
    element.style.backgroundImage = "";
  }
}

async function saveCurrentUser(previousEmail = "") {
  if (!currentUser) return;

  localStorage.setItem("smartCurrentUser", JSON.stringify(currentUser));

  if (!currentUser.id) return;

  const response = await fetch(`/api/users/${encodeURIComponent(currentUser.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...currentUser,
      originalEmail: previousEmail || currentUser.email
    })
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Could not update the profile.");
  }

  currentUser = {
    ...currentUser,
    ...data.user,
    password: ""
  };
  localStorage.setItem("smartCurrentUser", JSON.stringify(currentUser));
}

function updateAuthUI() {
  if (!currentUser) {
    try {
      currentUser = JSON.parse(localStorage.getItem("smartCurrentUser") || "null");
    } catch (error) {
      currentUser = null;
    }
  }

  if (currentUser) {
    welcomeText.textContent = getDisplayName();
    applyAvatar(profileAvatar, getAvatarLetter(), currentUser.photo);
    applyAvatar(profilePreviewAvatar, getAvatarLetter(), currentUser.photo);
    loginBtn.style.display = "none";
    logoutBtn.style.display = "block";
    editProfileBtn.style.display = "block";
  } else {
    welcomeText.textContent = "Guest";
    applyAvatar(profileAvatar, "G", "");
    applyAvatar(profilePreviewAvatar, "G", "");
    loginBtn.style.display = "block";
    logoutBtn.style.display = "none";
    editProfileBtn.style.display = "none";
  }
}

async function renderFeedbackList() {
  try {
    const query = currentUser?.id ? `?userId=${encodeURIComponent(currentUser.id)}` : "";
    const response = await fetch(`/api/feedback${query}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load feedback.");
    const feedback = data.feedback || [];

    if (!feedback.length) {
      feedbackList.innerHTML = `<div class="feedback-empty">No feedback submitted yet.</div>`;
      return;
    }

    feedbackList.innerHTML = feedback.slice(0, 4).map(item => `
      <div class="feedback-item">
        <strong>${escapeHtml(item.type)}</strong>
        <p>${escapeHtml(item.message)}</p>
        <span>${escapeHtml(item.user || "Guest")} - ${escapeHtml(item.date)}</span>
      </div>
    `).join("");
  } catch (error) {
    feedbackList.innerHTML = `<div class="feedback-empty">${escapeHtml(error.message)}</div>`;
  }
}

function switchSettingsTab(tab) {
  currentSettingsTab = tab;
  settingsTitle.textContent = settingsTitles[tab] || "Settings";

  settingsItems.forEach(item => {
    item.classList.toggle("active", item.dataset.settingsTab === tab);
  });

  settingsPanels.forEach(panel => {
    const panelTab = panel.id.replace("settingsPanel", "").toLowerCase();
    panel.classList.toggle("active", panelTab === tab);
  });

  saveProfileBtn.style.display = "inline-flex";
  cancelProfileBtn.textContent = "Cancel";

  if (tab === "profile") saveProfileBtn.textContent = "Save";
  if (tab === "feedback") saveProfileBtn.textContent = "Submit Feedback";
  if (tab === "admin") saveProfileBtn.textContent = "Verify Admin";
  if (tab === "feedback") renderFeedbackList();
}

function openProfileModal() {
  if (!currentUser) return;

  switchSettingsTab("profile");
  firstNameInput.value = currentUser.firstName || "";
  lastNameInput.value = currentUser.lastName || "";
  emailInput.value = currentUser.email || "";
  addressInput.value = currentUser.address || "";
  contactInput.value = currentUser.contact || "";
  cityInput.value = currentUser.city || "";
  stateInput.value = currentUser.state || "";
  passwordInput.value = currentUser.password || "";
  pendingProfilePhoto = currentUser.photo || "";
  originalProfileEmail = currentUser.email || "";

  renderFeedbackList();
  applyAvatar(profilePreviewAvatar, getAvatarLetter(), pendingProfilePhoto);
  profileModal.classList.add("show");
}

function closeProfileEditor() {
  profileModal.classList.remove("show");
}

burgerBtn.addEventListener("click", function () {
  navMenu.classList.toggle("show");
});

profileBtn.addEventListener("click", function (event) {
  event.stopPropagation();
  profileDropdown.classList.toggle("show");
});

document.addEventListener("click", function (event) {
  if (!profileBtn.contains(event.target) && !profileDropdown.contains(event.target)) {
    profileDropdown.classList.remove("show");
  }
});

loginBtn.addEventListener("click", function () {
  window.location.href = "login.html";
});

logoutBtn.addEventListener("click", function () {
  addMessage(`User <b>${getDisplayName()}</b> has logged out.`, "bot");
  currentUser = null;
  localStorage.removeItem("smartCurrentUser");
  localStorage.removeItem("smartAdminVerified");
  updateAuthUI();
  profileDropdown.classList.remove("show");
});

editProfileBtn.addEventListener("click", function () {
  profileDropdown.classList.remove("show");
  openProfileModal();
});

closeProfileModal.addEventListener("click", closeProfileEditor);
cancelProfileBtn.addEventListener("click", closeProfileEditor);

settingsItems.forEach(item => {
  item.addEventListener("click", function () {
    switchSettingsTab(item.dataset.settingsTab);
  });
});

profileImageInput.addEventListener("change", function () {
  const file = profileImageInput.files && profileImageInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", function () {
    pendingProfilePhoto = reader.result;
    applyAvatar(profilePreviewAvatar, getAvatarLetter(), pendingProfilePhoto);
  });
  reader.readAsDataURL(file);
});

saveProfileBtn.addEventListener("click", async function () {
  if (!currentUser && currentSettingsTab !== "admin") return;

  if (currentSettingsTab === "profile") {
    currentUser.firstName = firstNameInput.value.trim();
    currentUser.lastName = lastNameInput.value.trim();
    currentUser.email = emailInput.value.trim();
    currentUser.address = addressInput.value.trim();
    currentUser.contact = contactInput.value.trim();
    currentUser.city = cityInput.value.trim();
    currentUser.state = stateInput.value.trim();
    currentUser.password = passwordInput.value;
    currentUser.photo = pendingProfilePhoto;

    try {
      await saveCurrentUser(originalProfileEmail);
      updateAuthUI();
      closeProfileEditor();
      addMessage("Profile updated successfully.", "bot");
    } catch (error) {
      addMessage(error.message, "bot");
    }
    return;
  }

  if (currentSettingsTab === "feedback") {
    const message = feedbackMessageInput.value.trim();
    if (!message) {
      addMessage("Please write your feedback before submitting.", "bot");
      return;
    }

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          type: feedbackTypeInput.value,
          message
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not submit feedback.");

      feedbackMessageInput.value = "";
      await renderFeedbackList();
      addMessage("Thank you. Your feedback has been submitted.", "bot");
    } catch (error) {
      addMessage(error.message, "bot");
    }
    return;
  }

  if (currentSettingsTab === "admin") {
    const email = adminEmailInput.value.trim().toLowerCase();
    const password = adminPasswordInput.value;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (!response.ok || data.user?.role !== "admin") {
        throw new Error("Admin verification failed. Please check the admin email and password.");
      }

      localStorage.setItem("smartAdminVerified", "true");
      window.location.href = "admin-dashboard.html";
    } catch (error) {
      addMessage(error.message, "bot");
    }
  }
});

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getPoster(item, index) {
  return item.poster || posterFallbacks[index % posterFallbacks.length];
}

function getGenreNames(item) {
  return (item.genre_ids || [])
    .map(id => genreNames[id])
    .filter(Boolean);
}

function getTrailerUrl(item) {
  const query = `${item.title || "movie"} ${item.year || ""} official trailer`.trim();
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function getMovieKey(item) {
  return String(item.id || `${item.title || "movie"}-${item.year || ""}`).toLowerCase();
}

async function loadWishlist() {
  if (currentUser?.id && location.protocol !== "file:") {
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(currentUser.id)}/wishlist`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load wishlist.");
      wishlist = data.movies || [];
      return;
    } catch (error) {
      addMessage(error.message, "bot");
    }
  }

  try {
    wishlist = JSON.parse(localStorage.getItem("movieWishlist") || "[]");
  } catch (error) {
    wishlist = [];
  }
}

function saveWishlist() {
  localStorage.setItem("movieWishlist", JSON.stringify(wishlist));
}

function isInWishlist(item) {
  const key = getMovieKey(item);
  return wishlist.some(movie => getMovieKey(movie) === key);
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

function populateFilterOptions() {
  const genreIds = Object.keys(genreNames)
    .filter(id => localMovies.some(movie => (movie.genre_ids || []).map(String).includes(id)))
    .sort((a, b) => genreNames[a].localeCompare(genreNames[b]));

  genreFilter.innerHTML = `<option value="">All genres</option>` + genreIds
    .map(id => `<option value="${id}">${genreNames[id]}</option>`)
    .join("");

  const years = [...new Set(localMovies.map(movie => String(movie.year || "")).filter(Boolean))]
    .sort((a, b) => Number(b) - Number(a));

  yearFilter.innerHTML = `<option value="">All years</option>` + years
    .map(year => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`)
    .join("");
}

function renderWishlist() {
  wishlistCount.textContent = `${wishlist.length} saved`;

  if (wishlist.length === 0) {
    wishlistList.innerHTML = `<div class="wishlist-empty">No movies saved yet.</div>`;
    return;
  }

  wishlistList.innerHTML = wishlist.map((movie, index) => {
    const title = escapeHtml(movie.title);
    const poster = escapeHtml(getPoster(movie, index));
    const fallback = escapeHtml(posterFallbacks[index % posterFallbacks.length]);
    const key = escapeHtml(getMovieKey(movie));
    const trailerUrl = escapeHtml(getTrailerUrl(movie));
    const trailerId = escapeHtml(movie.id || "");
    const trailerTitle = escapeHtml(movie.title || "Movie");
    const trailerYear = escapeHtml(movie.year || "");

    return `
      <div class="wishlist-item">
        <a class="wishlist-poster-link" href="${trailerUrl}" data-trailer-id="${trailerId}" data-trailer-title="${trailerTitle}" data-trailer-year="${trailerYear}" aria-label="Play ${title} trailer">
          <img src="${poster}" alt="${title}" onerror="this.onerror=null; this.src='${fallback}';">
        </a>
        <div>
          <div class="wishlist-title">${title}</div>
          <div class="wishlist-meta">${escapeHtml(movie.year || "N/A")} · Rating ${escapeHtml(movie.rating || "N/A")}/10</div>
        </div>
        <button class="wishlist-remove" type="button" data-wishlist-remove="${key}" aria-label="Remove ${title} from wishlist">×</button>
      </div>
    `;
  }).join("");
}

function updateWatchButtons() {
  document.querySelectorAll(".watch-flag").forEach(button => {
    const key = button.dataset.movieKey;
    const saved = wishlist.some(movie => getMovieKey(movie) === key);
    button.classList.toggle("saved", saved);
    button.textContent = saved ? "✓" : "+";
    button.setAttribute("aria-label", saved ? "Remove from wishlist" : "Add to wishlist");
  });
}

async function toggleWishlist(movie) {
  const key = getMovieKey(movie);
  const existingIndex = wishlist.findIndex(savedMovie => getMovieKey(savedMovie) === key);

  if (currentUser?.id && location.protocol !== "file:") {
    const url = `/api/users/${encodeURIComponent(currentUser.id)}/wishlist`;
    const response = await fetch(
      existingIndex >= 0 ? `${url}/${encodeURIComponent(movie.id)}` : url,
      existingIndex >= 0
        ? { method: "DELETE" }
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ movieId: movie.id })
          }
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not update wishlist.");

    if (existingIndex >= 0) {
      wishlist.splice(existingIndex, 1);
    } else {
      wishlist = data.movies || [movie, ...wishlist];
    }
  } else if (existingIndex >= 0) {
    wishlist.splice(existingIndex, 1);
    saveWishlist();
  } else {
    wishlist.unshift(movie);
    saveWishlist();
  }

  addMessage(
    `<b>${escapeHtml(movie.title)}</b> ${existingIndex >= 0 ? "removed from" : "added to"} your wishlist.`,
    "bot"
  );
  renderWishlist();
  updateWatchButtons();
}

function renderMovies(items) {
  if (!items || items.length === 0) {
    movieGrid.innerHTML = `<div class="empty-state">No movies found.</div>`;
    return;
  }

  movieGrid.innerHTML = items.map((item, index) => {
    const title = escapeHtml(item.title);
    const poster = escapeHtml(getPoster(item, index));
    const fallback = escapeHtml(posterFallbacks[index % posterFallbacks.length]);
    const movieKey = escapeHtml(getMovieKey(item));
    const trailerUrl = escapeHtml(getTrailerUrl(item));
    const trailerId = escapeHtml(item.id || "");
    const trailerTitle = escapeHtml(item.title || "Movie");
    const trailerYear = escapeHtml(item.year || "");
    const movieData = escapeHtml(JSON.stringify({
      id: item.id || "",
      title: item.title || "",
      year: item.year || "",
      rating: item.rating || "N/A",
      poster: getPoster(item, index),
      description: item.description || ""
    }));
    const saved = isInWishlist(item);

    return `
      <div class="movie-card">
        <div class="poster-wrap">
          <a class="poster-link" href="${trailerUrl}" data-trailer-id="${trailerId}" data-trailer-title="${trailerTitle}" data-trailer-year="${trailerYear}" aria-label="Play ${title} trailer">
            <img src="${poster}" alt="${title}" class="poster" onerror="this.onerror=null; this.src='${fallback}';">
          </a>
          <button
            class="watch-flag ${saved ? "saved" : ""}"
            type="button"
            data-movie-key="${movieKey}"
            data-movie="${movieData}"
            aria-label="${saved ? "Remove from wishlist" : `Add ${title || "movie"} to wishlist`}"
          >${saved ? "✓" : "+"}</button>
        </div>
        <div class="movie-info">
          <div class="movie-title">${title}</div>
          <div class="rating-row">
            <div class="rating">Rating ${escapeHtml(item.rating || "N/A")}/10</div>
            ${item.year ? `<div class="year-pill">${escapeHtml(item.year)}</div>` : ""}
          </div>
          <div class="desc">${escapeHtml(item.description)}</div>
          ${item.why ? `<div class="why">${escapeHtml(item.why)}</div>` : ""}
        </div>
      </div>
    `;
  }).join("");
}

function renderPagination() {
  pagination.innerHTML = "";

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "Previous";
  prevBtn.className = "page-btn";
  prevBtn.disabled = currentPage === 1;

  prevBtn.addEventListener("click", function () {
    if (currentPage > 1) {
      currentPage--;
      loadMovies();
    }
  });

  const pageIndicator = document.createElement("button");
  pageIndicator.textContent = `${currentPage} / ${totalPagesGlobal}`;
  pageIndicator.className = "page-btn active-page";
  pageIndicator.disabled = true;

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next";
  nextBtn.className = "page-btn";
  nextBtn.disabled = currentPage >= totalPagesGlobal;

  nextBtn.addEventListener("click", function () {
    if (currentPage < totalPagesGlobal) {
      currentPage++;
      loadMovies();
    }
  });

  pagination.appendChild(prevBtn);
  pagination.appendChild(pageIndicator);
  pagination.appendChild(nextBtn);
}

function filterLocalMovies() {
  const search = currentSearch.toLowerCase();
  const filtered = localMovies.filter(movie => {
    const searchableText = [
      movie.title,
      movie.year,
      movie.rating,
      movie.description,
      getGenreNames(movie).join(" ")
    ].join(" ").toLowerCase();

    const matchesSearch = searchableText.includes(search);
    const matchesGenre = !currentGenre || (movie.genre_ids || []).map(String).includes(currentGenre);
    const matchesYear = !currentYear || String(movie.year || "") === currentYear;

    return matchesSearch && matchesGenre && matchesYear;
  });

  sortMoviesByOption(filtered, currentSort);
  totalPagesGlobal = Math.max(1, Math.ceil(filtered.length / limit));
  const start = (currentPage - 1) * limit;
  return filtered.slice(start, start + limit);
}

async function loadMovies() {
  try {
    if (location.protocol === "file:") {
      if (localMovies.length === 0) {
        throw new Error("Local movie data is missing.");
      }

      renderMovies(filterLocalMovies());
      renderPagination();
      return;
    }

    const params = new URLSearchParams({
      page: currentPage,
      limit,
      search: currentSearch,
      genre: currentGenre,
      year: currentYear,
      sort: currentSort
    });
    const response = await fetch(`/api/movies?${params.toString()}`);

    if (!response.ok) {
      throw new Error("Failed to load movies from server.");
    }

    const data = await response.json();
    totalPagesGlobal = data.totalPages || 1;
    renderMovies(data.movies || []);
    renderPagination();
  } catch (error) {
    if (localMovies.length > 0) {
      renderMovies(filterLocalMovies());
      renderPagination();
      return;
    }

    movieGrid.innerHTML = `<div class="empty-state">Failed to load movies. Please run the app with <b>npm start</b> and open <b>http://localhost:3000</b>.</div>`;
  }
}

async function askAI(sourceInput = input) {
  if (aiBusy) return;

  const userText = sourceInput.value.trim();
  if (userText === "") return;

  setAssistantOpen(true);
  const history = assistantConversation.slice(-10);
  addMessage(escapeHtml(userText), "user");
  sourceInput.value = "";

  if (location.protocol === "file:") {
    addMessage("Ollama chat needs the local server. Run npm start, make sure Ollama is running, then open http://localhost:3000.", "bot");
    return;
  }

  setAiBusy(true);
  const thinkingMessage = addMessage("Ollama is thinking...", "bot");
  thinkingMessage.classList.add("thinking");

  try {
    const response = await fetch("/api/recommend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: userText,
        username: currentUser ? getDisplayName() : "guest",
        userId: currentUser?.id || null,
        history
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to get response");
    }

    thinkingMessage.remove();
    const reply = data.reply || "How can I help you?";
    assistantConversation.push(
      { role: "user", content: userText },
      { role: "assistant", content: reply }
    );
    assistantConversation = assistantConversation.slice(-10);
    addMessage(escapeHtml(reply).replace(/\n/g, "<br>"), "bot");

    if (data.recommendations && data.recommendations.length > 0) {
      renderMovies(data.recommendations);
      pagination.innerHTML = "";
    } else if (data.mode === "movies") {
      movieGrid.innerHTML = `<div class="empty-state">No recommended movies matched your request.</div>`;
    }

  } catch (error) {
    thinkingMessage.remove();
    addMessage("Error: " + error.message, "bot");
  } finally {
    setAiBusy(false);
    sourceInput.focus();
  }
}

sendBtn.addEventListener("click", function () {
  askAI(input);
});

chatSendBtn.addEventListener("click", function () {
  askAI(chatInput);
});

input.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    askAI(input);
  }
});

chatInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    askAI(chatInput);
  }
});

aiAssistantToggle.addEventListener("click", function () {
  setAssistantOpen(!aiAssistantPanel.classList.contains("show"), true);
});

aiAssistantClose.addEventListener("click", function () {
  setAssistantOpen(false);
  aiAssistantToggle.focus();
});

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && aiAssistantPanel.classList.contains("show")) {
    setAssistantOpen(false);
    aiAssistantToggle.focus();
  }

  if (event.key === "Escape" && filterMenu.classList.contains("show")) {
    setFilterMenuOpen(false);
    filterMenuToggle.focus();
  }
});

filterMenuToggle.addEventListener("click", function (event) {
  event.stopPropagation();
  setFilterMenuOpen(!filterMenu.classList.contains("show"));
});

filterMenu.addEventListener("click", function (event) {
  event.stopPropagation();
});

document.addEventListener("click", function (event) {
  if (!filterMenu.contains(event.target) && event.target !== filterMenuToggle) {
    setFilterMenuOpen(false);
  }
});

movieSearch.addEventListener("input", function () {
  currentSearch = movieSearch.value.trim();
  currentPage = 1;
  loadMovies();
});

genreFilter.addEventListener("change", function () {
  currentGenre = genreFilter.value;
  currentPage = 1;
  loadMovies();
});

yearFilter.addEventListener("change", function () {
  currentYear = yearFilter.value;
  currentPage = 1;
  loadMovies();
});

sortFilter.addEventListener("change", function () {
  currentSort = sortFilter.value || "newest";
  currentPage = 1;
  loadMovies();
});

resetFiltersBtn.addEventListener("click", function () {
  movieSearch.value = "";
  genreFilter.value = "";
  yearFilter.value = "";
  sortFilter.value = "newest";
  currentSearch = "";
  currentGenre = "";
  currentYear = "";
  currentSort = "newest";
  currentPage = 1;
  loadMovies();
});

movieGrid.addEventListener("click", async function (event) {
  const button = event.target.closest(".watch-flag");
  if (!button) return;

  try {
    const movie = JSON.parse(button.dataset.movie || "{}");
    await toggleWishlist(movie);
  } catch (error) {
    addMessage("Could not update wishlist for this movie.", "bot");
  }
});

wishlistList.addEventListener("click", async function (event) {
  const button = event.target.closest("[data-wishlist-remove]");
  if (!button) return;

  const key = button.dataset.wishlistRemove;
  const movie = wishlist.find(savedMovie => getMovieKey(savedMovie) === key);

  if (currentUser?.id && movie?.id && location.protocol !== "file:") {
    const response = await fetch(
      `/api/users/${encodeURIComponent(currentUser.id)}/wishlist/${encodeURIComponent(movie.id)}`,
      { method: "DELETE" }
    );
    const data = await response.json();
    if (!response.ok) {
      addMessage(data.error || "Could not remove the movie.", "bot");
      return;
    }
  }

  wishlist = wishlist.filter(savedMovie => getMovieKey(savedMovie) !== key);
  if (!currentUser?.id) saveWishlist();
  renderWishlist();
  updateWatchButtons();

  if (movie) {
    addMessage(`<b>${escapeHtml(movie.title)}</b> removed from your wishlist.`, "bot");
  }
});

async function initializePage() {
  updateAuthUI();
  await loadWishlist();
  renderWishlist();
  populateFilterOptions();
  loadMovies();
}

initializePage();
