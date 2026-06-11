function buildTrailerSearchUrl(title, year) {
  const query = `${title || "movie"} ${year || ""} official trailer`.trim();
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function ensureTrailerModal() {
  let modal = document.getElementById("trailerModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.className = "trailer-modal";
  modal.id = "trailerModal";
  modal.innerHTML = `
    <div class="trailer-dialog" role="dialog" aria-modal="true" aria-labelledby="trailerModalTitle">
      <div class="trailer-topbar">
        <div class="trailer-heading">
          <span>Now Playing</span>
          <h2 id="trailerModalTitle">Trailer</h2>
        </div>
        <div class="trailer-actions">
          <a id="trailerYoutubeLink" href="#" target="_blank" rel="noopener noreferrer">Open YouTube</a>
          <button class="trailer-close" id="trailerCloseBtn" type="button" aria-label="Close trailer">&times;</button>
        </div>
      </div>
      <div class="trailer-frame-wrap">
        <iframe
          id="trailerFrame"
          title="Movie trailer"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
        <div class="trailer-status" id="trailerStatus">Loading trailer...</div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener("click", event => {
    if (event.target === modal) closeTrailerModal();
  });
  modal.querySelector("#trailerCloseBtn").addEventListener("click", closeTrailerModal);

  return modal;
}

function closeTrailerModal() {
  const modal = document.getElementById("trailerModal");
  if (!modal) return;

  const frame = modal.querySelector("#trailerFrame");
  frame.src = "";
  modal.classList.remove("show");
  document.body.classList.remove("trailer-open");
}

async function openTrailerModal(title, year) {
  const modal = ensureTrailerModal();
  const frame = modal.querySelector("#trailerFrame");
  const status = modal.querySelector("#trailerStatus");
  const heading = modal.querySelector("#trailerModalTitle");
  const youtubeLink = modal.querySelector("#trailerYoutubeLink");
  const searchUrl = buildTrailerSearchUrl(title, year);

  heading.textContent = `${title}${year ? ` (${year})` : ""}`;
  youtubeLink.href = searchUrl;
  frame.src = "";
  status.textContent = "Loading trailer...";
  status.style.display = "grid";
  modal.classList.add("show");
  document.body.classList.add("trailer-open");

  try {
    if (location.protocol === "file:") {
      throw new Error("Trailer autoplay needs the local server.");
    }

    const response = await fetch(`/api/trailer?title=${encodeURIComponent(title)}&year=${encodeURIComponent(year || "")}`);
    const data = await response.json();

    if (!response.ok || !data.embedUrl) {
      throw new Error(data.error || "Trailer unavailable.");
    }

    youtubeLink.href = data.watchUrl || data.searchUrl || searchUrl;
    frame.src = data.embedUrl;
    frame.addEventListener("load", () => {
      status.style.display = "none";
    }, { once: true });
  } catch (error) {
    status.innerHTML = `Trailer could not autoplay. <a href="${searchUrl}" target="_blank" rel="noopener noreferrer">Open on YouTube</a>`;
  }
}

document.addEventListener("click", event => {
  const trailerLink = event.target.closest("[data-trailer-title]");
  if (!trailerLink) return;

  event.preventDefault();
  openTrailerModal(trailerLink.dataset.trailerTitle, trailerLink.dataset.trailerYear || "");
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeTrailerModal();
  }
});
