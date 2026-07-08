const wishlistPageGrid = document.getElementById("wishlistPageGrid");
const wishlistPageCount = document.getElementById("wishlistPageCount");
const clearWishlistBtn = document.getElementById("clearWishlistBtn");
let wishlist = [];
let currentUser = null;
let activeWishlistDescriptionTrigger = null;
let wishlistDescriptionPinned = false;

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

function hasServerApi() {
  const localHosts = ["localhost", "127.0.0.1"];
  const isStaticPreview =
    location.protocol === "file:" ||
    location.hostname.endsWith("github.io") ||
    (localHosts.includes(location.hostname) && location.port && location.port !== "3000");
  return !isStaticPreview;
}

async function loadWishlist() {
  currentUser = getCurrentUser();

  if (currentUser?.id && hasServerApi()) {
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

function ensureWishlistDescriptionPopover() {
  let popover = document.getElementById("movieDescriptionPopover");
  if (popover) return popover;

  popover = document.createElement("div");
  popover.id = "movieDescriptionPopover";
  popover.className = "movie-description-popover";
  popover.setAttribute("role", "dialog");
  popover.setAttribute("aria-live", "polite");
  popover.setAttribute("aria-hidden", "true");
  popover.innerHTML = `
    <button class="movie-description-close" type="button" aria-label="Close movie description">&times;</button>
    <strong class="movie-description-heading"></strong>
    <p class="movie-description-text"></p>
  `;
  document.body.appendChild(popover);
  popover.querySelector(".movie-description-close").addEventListener("click", hideWishlistDescriptionPopover);
  return popover;
}

function positionWishlistDescriptionPopover(trigger, popover) {
  const rect = trigger.getBoundingClientRect();
  const gap = 12;
  const width = Math.min(420, window.innerWidth - 24);
  popover.style.width = `${width}px`;

  const popoverHeight = Math.min(popover.offsetHeight || 260, window.innerHeight - 24);
  let left = rect.left;
  let top = rect.bottom + gap;

  if (left + width > window.innerWidth - 12) {
    left = window.innerWidth - width - 12;
  }

  if (top + popoverHeight > window.innerHeight - 12) {
    top = rect.top - popoverHeight - gap;
  }

  popover.style.left = `${Math.max(12, left)}px`;
  popover.style.top = `${Math.max(12, top)}px`;
}

function showWishlistDescriptionPopover(trigger, pinned = false) {
  const description = trigger.dataset.fullDescription || "";
  if (!description.trim()) return;

  const popover = ensureWishlistDescriptionPopover();
  activeWishlistDescriptionTrigger = trigger;
  wishlistDescriptionPinned = pinned;
  popover.querySelector(".movie-description-heading").textContent = trigger.dataset.movieTitle || "Movie description";
  popover.querySelector(".movie-description-text").textContent = description;
  popover.classList.add("show");
  popover.classList.toggle("pinned", pinned);
  popover.setAttribute("aria-hidden", "false");
  positionWishlistDescriptionPopover(trigger, popover);
}

function hideWishlistDescriptionPopover(force = false) {
  if (wishlistDescriptionPinned && !force) return;

  const popover = document.getElementById("movieDescriptionPopover");
  if (!popover) return;

  popover.classList.remove("show", "pinned");
  popover.setAttribute("aria-hidden", "true");
  activeWishlistDescriptionTrigger = null;
  wishlistDescriptionPinned = false;
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
    const trailerId = escapeHtml(movie.id || "");
    const trailerTitle = escapeHtml(movie.title || "Movie");
    const trailerYear = escapeHtml(movie.year || "");
    const description = escapeHtml(movie.description || "No description available.");

    return `
      <article class="wishlist-page-card">
        <div class="wishlist-page-poster">
          <a class="wishlist-page-poster-link" href="${trailerUrl}" data-trailer-id="${trailerId}" data-trailer-title="${trailerTitle}" data-trailer-year="${trailerYear}" aria-label="Play ${title} trailer">
            <img src="${poster}" alt="${title}" onerror="this.onerror=null; this.src='${fallback}';">
          </a>
        </div>
        <div class="wishlist-page-info">
          <div class="wishlist-page-meta">
            <span>${escapeHtml(movie.year || "N/A")}</span>
            <span>Rating ${escapeHtml(movie.rating || "N/A")}/10</span>
          </div>
          <h2>${title}</h2>
          <button
            class="wishlist-page-desc"
            type="button"
            data-movie-title="${title}"
            data-full-description="${description}"
            aria-label="Show full description for ${title || "this movie"}"
          >${description}</button>
          <button class="wishlist-page-remove" type="button" data-remove-key="${key}">Remove</button>
        </div>
      </article>
    `;
  }).join("");
}

wishlistPageGrid.addEventListener("click", async function (event) {
  const descriptionButton = event.target.closest(".wishlist-page-desc");
  if (descriptionButton) {
    showWishlistDescriptionPopover(descriptionButton, true);
    return;
  }

  const button = event.target.closest("[data-remove-key]");
  if (!button) return;

  const key = button.dataset.removeKey;
  const movie = wishlist.find(item => getMovieKey(item) === key);

  if (currentUser?.id && movie?.id && hasServerApi()) {
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

wishlistPageGrid.addEventListener("mouseover", function (event) {
  const descriptionButton = event.target.closest(".wishlist-page-desc");
  if (descriptionButton) showWishlistDescriptionPopover(descriptionButton);
});

wishlistPageGrid.addEventListener("focusin", function (event) {
  const descriptionButton = event.target.closest(".wishlist-page-desc");
  if (descriptionButton) showWishlistDescriptionPopover(descriptionButton);
});

wishlistPageGrid.addEventListener("mouseout", function (event) {
  const descriptionButton = event.target.closest(".wishlist-page-desc");
  if (!descriptionButton || descriptionButton.contains(event.relatedTarget)) return;
  hideWishlistDescriptionPopover();
});

wishlistPageGrid.addEventListener("focusout", function (event) {
  const descriptionButton = event.target.closest(".wishlist-page-desc");
  if (!descriptionButton) return;
  window.setTimeout(() => {
    const popover = document.getElementById("movieDescriptionPopover");
    if (!popover?.contains(document.activeElement)) hideWishlistDescriptionPopover();
  }, 0);
});

document.addEventListener("click", function (event) {
  const popover = document.getElementById("movieDescriptionPopover");
  if (
    !popover ||
    event.target.closest(".wishlist-page-desc") ||
    popover.contains(event.target)
  ) return;

  hideWishlistDescriptionPopover(true);
});

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") hideWishlistDescriptionPopover(true);
});

window.addEventListener("scroll", function () {
  if (!activeWishlistDescriptionTrigger) return;

  const popover = document.getElementById("movieDescriptionPopover");
  if (!popover?.classList.contains("show")) return;
  positionWishlistDescriptionPopover(activeWishlistDescriptionTrigger, popover);
}, { passive: true });

window.addEventListener("resize", function () {
  if (!activeWishlistDescriptionTrigger) return;

  const popover = document.getElementById("movieDescriptionPopover");
  if (!popover?.classList.contains("show")) return;
  positionWishlistDescriptionPopover(activeWishlistDescriptionTrigger, popover);
});

clearWishlistBtn.addEventListener("click", async function () {
  if (!confirm("Remove all movies from your wishlist?")) return;

  if (currentUser?.id && hasServerApi()) {
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
