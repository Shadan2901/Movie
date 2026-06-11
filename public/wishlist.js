const wishlistPageGrid = document.getElementById("wishlistPageGrid");
const wishlistPageCount = document.getElementById("wishlistPageCount");
const clearWishlistBtn = document.getElementById("clearWishlistBtn");

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

function loadWishlist() {
  try {
    return JSON.parse(localStorage.getItem("movieWishlist") || "[]");
  } catch (error) {
    return [];
  }
}

function saveWishlist(items) {
  localStorage.setItem("movieWishlist", JSON.stringify(items));
}

function renderWishlistPage() {
  const wishlist = loadWishlist();
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

wishlistPageGrid.addEventListener("click", function (event) {
  const button = event.target.closest("[data-remove-key]");
  if (!button) return;

  const key = button.dataset.removeKey;
  const nextWishlist = loadWishlist().filter(movie => getMovieKey(movie) !== key);
  saveWishlist(nextWishlist);
  renderWishlistPage();
});

clearWishlistBtn.addEventListener("click", function () {
  if (!confirm("Remove all movies from your wishlist?")) return;
  saveWishlist([]);
  renderWishlistPage();
});

renderWishlistPage();
