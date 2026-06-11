const wishlistPageGrid = document.getElementById("wishlistPageGrid");
const wishlistPageCount = document.getElementById("wishlistPageCount");
const clearWishlistBtn = document.getElementById("clearWishlistBtn");
let wishlist = [];
let currentUser = null;

const posterFallbacks = [
  "images/inception.jpg",
  "images/lalaland.avif",
  "images/blade.jpg",
  "images/titanic.jpg",
  "images/Hangover.jpg",
  "images/about.jpg"
];

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getMovieKey(item) {
  return String(item.id || `${item.title || "movie"}-${item.year || ""}`).toLowerCase();
}

function getPoster(item, index) {
  return item.poster || posterFallbacks[index % posterFallbacks.length];
}

function getTrailerUrl(item) {
  const query = `${item.title || "movie"} ${item.year || ""} official trailer`.trim();
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("smartCurrentUser") || "null");
  } catch (error) {
    return null;
  }
}

async function loadWishlist() {
  currentUser = getCurrentUser();

  if (currentUser?.id && location.protocol !== "file:") {
    const response = await fetch(`/api/users/${encodeURIComponent(currentUser.id)}/wishlist`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load wishlist.");
    wishlist = data.movies || [];
    return;
  }

  try {
    wishlist = JSON.parse(localStorage.getItem("movieWishlist") || "[]");
  } catch (error) {
    wishlist = [];
  }
}

function saveGuestWishlist() {
  localStorage.setItem("movieWishlist", JSON.stringify(wishlist));
}

function renderWishlistPage() {
  wishlistPageCount.textContent = `${wishlist.length} saved`;
  clearWishlistBtn.disabled = wishlist.length === 0;

  if (wishlist.length === 0) {
    wishlistPageGrid.innerHTML = `
      <div class="wishlist-page-empty">
        <h2>No movies saved yet</h2>
        <p>Go back to the movie library and click the + button on any movie poster.</p>
        <a href="index.html">Browse Movies</a>
      </div>
    `;
    return;
  }

  wishlistPageGrid.innerHTML = wishlist.map((movie, index) => {
    const title = escapeHtml(movie.title);
    const poster = escapeHtml(getPoster(movie, index));
    const fallback = escapeHtml(posterFallbacks[index % posterFallbacks.length]);
    const key = escapeHtml(getMovieKey(movie));
    const trailerUrl = escapeHtml(getTrailerUrl(movie));
    const trailerTitle = escapeHtml(movie.title || "Movie");
    const trailerYear = escapeHtml(movie.year || "");

    return `
      <article class="wishlist-page-card">
        <div class="wishlist-page-poster">
          <a class="wishlist-page-poster-link" href="${trailerUrl}" data-trailer-title="${trailerTitle}" data-trailer-year="${trailerYear}" aria-label="Play ${title} trailer">
            <img src="${poster}" alt="${title}" onerror="this.onerror=null; this.src='${fallback}';">
          </a>
        </div>
        <div class="wishlist-page-info">
          <div class="wishlist-page-meta">
            <span>${escapeHtml(movie.year || "N/A")}</span>
            <span>Rating ${escapeHtml(movie.rating || "N/A")}/10</span>
          </div>
          <h2>${title}</h2>
          <p>${escapeHtml(movie.description || "No description available.")}</p>
          <button class="wishlist-page-remove" type="button" data-remove-key="${key}">Remove</button>
        </div>
      </article>
    `;
  }).join("");
}

wishlistPageGrid.addEventListener("click", async function (event) {
  const button = event.target.closest("[data-remove-key]");
  if (!button) return;

  const key = button.dataset.removeKey;
  const movie = wishlist.find(item => getMovieKey(item) === key);

  if (currentUser?.id && movie?.id && location.protocol !== "file:") {
    const response = await fetch(
      `/api/users/${encodeURIComponent(currentUser.id)}/wishlist/${encodeURIComponent(movie.id)}`,
      { method: "DELETE" }
    );
    const data = await response.json();
    if (!response.ok) {
      alert(data.error || "Could not remove the movie.");
      return;
    }
  }

  wishlist = wishlist.filter(item => getMovieKey(item) !== key);
  if (!currentUser?.id) saveGuestWishlist();
  renderWishlistPage();
});

clearWishlistBtn.addEventListener("click", async function () {
  if (!confirm("Remove all movies from your wishlist?")) return;

  if (currentUser?.id && location.protocol !== "file:") {
    const response = await fetch(
      `/api/users/${encodeURIComponent(currentUser.id)}/wishlist`,
      { method: "DELETE" }
    );
    const data = await response.json();
    if (!response.ok) {
      alert(data.error || "Could not clear the wishlist.");
      return;
    }
  }

  wishlist = [];
  if (!currentUser?.id) saveGuestWishlist();
  renderWishlistPage();
});

async function initializeWishlistPage() {
  try {
    await loadWishlist();
    renderWishlistPage();
  } catch (error) {
    wishlistPageGrid.innerHTML = `
      <div class="wishlist-page-empty">
        <h2>Could not load wishlist</h2>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

initializeWishlistPage();
