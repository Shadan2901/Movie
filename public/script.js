const movieGrid = document.getElementById("movieGrid");
const chatBox = document.getElementById("chatBox");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const editProfileBtn = document.getElementById("editProfileBtn");
const welcomeText = document.getElementById("welcomeText");
const movieSearch = document.getElementById("movieSearch");
const pagination = document.getElementById("pagination");

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

let currentUser = null;
let currentPage = 1;
let currentSearch = "";
let totalPagesGlobal = 1;
const limit = 15;

function addMessage(text, sender) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  msg.innerHTML = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
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

function updateAuthUI() {
  if (currentUser) {
    welcomeText.textContent = getDisplayName();
    profileAvatar.textContent = getAvatarLetter();
    profilePreviewAvatar.textContent = getAvatarLetter();
    loginBtn.style.display = "none";
    logoutBtn.style.display = "block";
    editProfileBtn.style.display = "block";
  } else {
    welcomeText.textContent = "Guest";
    profileAvatar.textContent = "G";
    profilePreviewAvatar.textContent = "G";
    loginBtn.style.display = "block";
    logoutBtn.style.display = "none";
    editProfileBtn.style.display = "none";
  }
}

function openProfileModal() {
  if (!currentUser) return;

  firstNameInput.value = currentUser.firstName || "";
  lastNameInput.value = currentUser.lastName || "";
  emailInput.value = currentUser.email || "";
  addressInput.value = currentUser.address || "";
  contactInput.value = currentUser.contact || "";
  cityInput.value = currentUser.city || "";
  stateInput.value = currentUser.state || "";
  passwordInput.value = currentUser.password || "";

  profilePreviewAvatar.textContent = getAvatarLetter();
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
  const username = prompt("Enter your username:");
  if (username && username.trim() !== "") {
    const cleanName = username.trim();

    currentUser = {
      firstName: cleanName,
      lastName: "",
      email: "",
      address: "",
      contact: "",
      city: "",
      state: "",
      password: ""
    };

    updateAuthUI();
    profileDropdown.classList.remove("show");
    addMessage(`User <b>${getDisplayName()}</b> has logged in.`, "bot");
  }
});

logoutBtn.addEventListener("click", function () {
  addMessage(`User <b>${getDisplayName()}</b> has logged out.`, "bot");
  currentUser = null;
  updateAuthUI();
  profileDropdown.classList.remove("show");
});

editProfileBtn.addEventListener("click", function () {
  profileDropdown.classList.remove("show");
  openProfileModal();
});

closeProfileModal.addEventListener("click", closeProfileEditor);
cancelProfileBtn.addEventListener("click", closeProfileEditor);

saveProfileBtn.addEventListener("click", function () {
  if (!currentUser) return;

  currentUser.firstName = firstNameInput.value.trim();
  currentUser.lastName = lastNameInput.value.trim();
  currentUser.email = emailInput.value.trim();
  currentUser.address = addressInput.value.trim();
  currentUser.contact = contactInput.value.trim();
  currentUser.city = cityInput.value.trim();
  currentUser.state = stateInput.value.trim();
  currentUser.password = passwordInput.value;

  updateAuthUI();
  closeProfileEditor();
  addMessage("Profile updated successfully.", "bot");
});

function renderMovies(items) {
  if (!items || items.length === 0) {
    movieGrid.innerHTML = `<div class="empty-state">No movies found.</div>`;
    return;
  }

  movieGrid.innerHTML = items.map(item => `
    <div class="movie-card">
      <div class="poster-wrap">
        <img src="${item.poster || ""}" alt="${item.title || ""}" class="poster">
        <button class="watch-flag" type="button" aria-label="Add ${item.title || "movie"} to watchlist">+</button>
      </div>
      <div class="movie-info">
        <div class="movie-title">${item.title || ""}</div>
        <div class="rating-row">
          <div class="rating">Rating ${item.rating || "N/A"}/10</div>
          ${item.year ? `<div class="year-pill">${item.year}</div>` : ""}
        </div>
        <div class="desc">${item.description || ""}</div>
        ${item.why ? `<div class="why">${item.why}</div>` : ""}
      </div>
    </div>
  `).join("");
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

async function loadMovies() {
  try {
    const response = await fetch(
      `/api/movies?page=${currentPage}&limit=${limit}&search=${encodeURIComponent(currentSearch)}`
    );
    const data = await response.json();

    totalPagesGlobal = data.totalPages || 1;
    renderMovies(data.movies || []);
    renderPagination();
  } catch (error) {
    movieGrid.innerHTML = `<div class="empty-state">Failed to load movies.</div>`;
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

async function askAI() {
  const userText = input.value.trim();
  if (userText === "") return;

  const movieRequest = isLikelyMovieRequest(userText);

  addMessage(userText, "user");

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

    addMessage(data.reply || "How can I help you?", "bot");

    if (data.recommendations && data.recommendations.length > 0) {
      renderMovies(data.recommendations);
      pagination.innerHTML = "";
    } else if (movieRequest) {
      movieGrid.innerHTML = `<div class="empty-state">No recommended movies matched your request.</div>`;
    }

    input.value = "";
  } catch (error) {
    addMessage("Error: " + error.message, "bot");

    if (movieRequest) {
      movieGrid.innerHTML = `<div class="empty-state">Failed to load AI recommendation.</div>`;
    }
  }
}

sendBtn.addEventListener("click", askAI);

input.addEventListener("keypress", function (event) {
  if (event.key === "Enter") {
    askAI();
  }
});

movieSearch.addEventListener("input", function () {
  currentSearch = movieSearch.value.trim();
  currentPage = 1;
  loadMovies();
});

updateAuthUI();
loadMovies();
