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
const pagination = document.getElementById("pagination");
const wishlistCount = document.getElementById("wishlistCount");
const wishlistList = document.getElementById("wishlistList");

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
const languageInputs = document.querySelectorAll("input[name='language']");
const languagePreview = document.getElementById("languagePreview");
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
let totalPagesGlobal = 1;
let aiBusy = false;
let wishlist = [];
const limit = 15;
const localMovies = Array.isArray(window.LOCAL_MOVIES) ? window.LOCAL_MOVIES : [];
const posterFallbacks = [
  "images/inception.jpg",
  "images/lalaland.avif",
  "images/blade.jpg",
  "images/titanic.jpg",
  "images/Hangover.jpg",
  "images/about.jpg"
];
const languageNames = {
  en: "English",
  ms: "Bahasa Melayu",
  zh: "Chinese",
  ta: "Tamil"
};
const settingsTitles = {
  profile: "Edit profile",
  language: "Language",
  feedback: "Feedback",
  admin: "Admin verification",
  help: "Help"
};

function addMessage(text, sender) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  msg.innerHTML = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
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

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem("smartMovieUsers") || "[]");
  } catch (error) {
    return [];
  }
}

function saveCurrentUser(previousEmail = "") {
  if (!currentUser) return;

  localStorage.setItem("smartCurrentUser", JSON.stringify(currentUser));

  const users = getUsers();
  const userIndex = users.findIndex(user => user.email === (previousEmail || currentUser.email));
  if (userIndex >= 0) {
    users[userIndex] = { ...users[userIndex], ...currentUser };
    localStorage.setItem("smartMovieUsers", JSON.stringify(users));
  }
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

function getSelectedLanguage() {
  const selected = Array.from(languageInputs).find(inputItem => inputItem.checked);
  return selected ? selected.value : "en";
}

function updateLanguagePreview(language) {
  const selectedLanguage = language || getSelectedLanguage();
  languagePreview.textContent = `Language selected: ${languageNames[selectedLanguage] || "English"}`;
}

function renderFeedbackList() {
  let feedback = [];

  try {
    feedback = JSON.parse(localStorage.getItem("smartFeedback") || "[]");
  } catch (error) {
    feedback = [];
  }

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

  saveProfileBtn.style.display = tab === "help" ? "none" : "inline-flex";
  cancelProfileBtn.textContent = tab === "help" ? "Close" : "Cancel";

  if (tab === "profile") saveProfileBtn.textContent = "Save";
  if (tab === "language") saveProfileBtn.textContent = "Save Language";
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

  const savedLanguage = currentUser.language || localStorage.getItem("smartLanguage") || "en";
  languageInputs.forEach(inputItem => {
    inputItem.checked = inputItem.value === savedLanguage;
  });
  updateLanguagePreview(savedLanguage);
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

languageInputs.forEach(inputItem => {
  inputItem.addEventListener("change", function () {
    updateLanguagePreview(inputItem.value);
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

saveProfileBtn.addEventListener("click", function () {
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

    saveCurrentUser(originalProfileEmail);
    updateAuthUI();
    closeProfileEditor();
    addMessage("Profile updated successfully.", "bot");
    return;
  }

  if (currentSettingsTab === "language") {
    const selectedLanguage = getSelectedLanguage();
    currentUser.language = selectedLanguage;
    localStorage.setItem("smartLanguage", selectedLanguage);
    saveCurrentUser();
    updateLanguagePreview(selectedLanguage);
    addMessage(`Language saved: ${languageNames[selectedLanguage] || "English"}.`, "bot");
    return;
  }

  if (currentSettingsTab === "feedback") {
    const message = feedbackMessageInput.value.trim();
    if (!message) {
      addMessage("Please write your feedback before submitting.", "bot");
      return;
    }

    const feedback = JSON.parse(localStorage.getItem("smartFeedback") || "[]");
    feedback.unshift({
      type: feedbackTypeInput.value,
      message,
      user: currentUser.email || getDisplayName(),
      date: new Date().toLocaleString()
    });

    localStorage.setItem("smartFeedback", JSON.stringify(feedback));
    feedbackMessageInput.value = "";
    renderFeedbackList();
    addMessage("Thank you. Your feedback has been submitted.", "bot");
    return;
  }

  if (currentSettingsTab === "admin") {
    const email = adminEmailInput.value.trim().toLowerCase();
    const password = adminPasswordInput.value;
    const isAdmin = email === "admin@smartmovies.com" && password === "admin123";

    if (!isAdmin) {
      addMessage("Admin verification failed. Please check the admin email and password.", "bot");
      return;
    }

    localStorage.setItem("smartAdminVerified", "true");
    window.location.href = "admin-dashboard.html";
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

function getMovieKey(item) {
  return String(item.id || `${item.title || "movie"}-${item.year || ""}`).toLowerCase();
}

function loadWishlist() {
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

    return `
      <div class="wishlist-item">
        <img src="${poster}" alt="${title}" onerror="this.onerror=null; this.src='${fallback}';">
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

function toggleWishlist(movie) {
  const key = getMovieKey(movie);
  const existingIndex = wishlist.findIndex(savedMovie => getMovieKey(savedMovie) === key);

  if (existingIndex >= 0) {
    wishlist.splice(existingIndex, 1);
    addMessage(`<b>${escapeHtml(movie.title)}</b> removed from your wishlist.`, "bot");
  } else {
    wishlist.unshift(movie);
    addMessage(`<b>${escapeHtml(movie.title)}</b> added to your wishlist.`, "bot");
  }

  saveWishlist();
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
          <img src="${poster}" alt="${title}" class="poster" onerror="this.onerror=null; this.src='${fallback}';">
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
      movie.description
    ].join(" ").toLowerCase();

    return searchableText.includes(search);
  });

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

    const response = await fetch(
      `/api/movies?page=${currentPage}&limit=${limit}&search=${encodeURIComponent(currentSearch)}`
    );

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

function isLikelyMovieRequest(text) {
  const cleanText = text.toLowerCase();
  const keywords = [
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
    "thriller movie",
    "marvel",
    "spider-man",
    "batman",
    "best movie"
  ];

  return keywords.some(keyword => cleanText.includes(keyword));
}

async function askAI(sourceInput = input) {
  if (aiBusy) return;

  const userText = sourceInput.value.trim();
  if (userText === "") return;

  const movieRequest = isLikelyMovieRequest(userText);
  addMessage(userText, "user");
  sourceInput.value = "";

  if (location.protocol === "file:") {
    addMessage("Ollama chat needs the local server. Run npm start, make sure Ollama is running, then open http://localhost:3000.", "bot");
    return;
  }

  setAiBusy(true);
  const thinkingMessage = addMessage("Ollama is thinking...", "bot");
  thinkingMessage.classList.add("thinking");

  if (movieRequest) {
    movieGrid.innerHTML = `<div class="loading">Ollama is thinking...</div>`;
  }

  try {
    const response = await fetch("/api/recommend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: userText,
        username: currentUser ? getDisplayName() : "guest"
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to get response");
    }

    thinkingMessage.remove();
    addMessage(data.reply || "How can I help you?", "bot");

    if (data.recommendations && data.recommendations.length > 0) {
      renderMovies(data.recommendations);
      pagination.innerHTML = "";
    } else if (movieRequest) {
      movieGrid.innerHTML = `<div class="empty-state">No recommended movies matched your request.</div>`;
    }

  } catch (error) {
    thinkingMessage.remove();
    addMessage("Error: " + error.message, "bot");

    if (movieRequest) {
      movieGrid.innerHTML = `<div class="empty-state">Failed to load AI recommendation.</div>`;
    }
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

movieSearch.addEventListener("input", function () {
  currentSearch = movieSearch.value.trim();
  currentPage = 1;
  loadMovies();
});

movieGrid.addEventListener("click", function (event) {
  const button = event.target.closest(".watch-flag");
  if (!button) return;

  try {
    const movie = JSON.parse(button.dataset.movie || "{}");
    toggleWishlist(movie);
  } catch (error) {
    addMessage("Could not update wishlist for this movie.", "bot");
  }
});

wishlistList.addEventListener("click", function (event) {
  const button = event.target.closest("[data-wishlist-remove]");
  if (!button) return;

  const key = button.dataset.wishlistRemove;
  const movie = wishlist.find(savedMovie => getMovieKey(savedMovie) === key);
  wishlist = wishlist.filter(savedMovie => getMovieKey(savedMovie) !== key);
  saveWishlist();
  renderWishlist();
  updateWatchButtons();

  if (movie) {
    addMessage(`<b>${escapeHtml(movie.title)}</b> removed from your wishlist.`, "bot");
  }
});

loadWishlist();
renderWishlist();
updateAuthUI();
loadMovies();
