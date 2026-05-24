const grid = document.getElementById("movieGrid");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const searchInput = document.getElementById("searchInput");
const filterType = document.getElementById("filterType");
const sortType = document.getElementById("sortType");

const modal = document.getElementById("movieModal");
const modalBody = document.getElementById("modalBody");
const closeModal = document.getElementById("closeModal");


const POSTER_BASE = "https://sinxma.ir/assets/posters";
const ACTOR_BASE = "https://sinxma.ir/actors";


let movies = [];
let series = [];

let currentView = "movies";
let currentMovie = null;

let shown = 0;
const BATCH = 30;

let selectedType = null;
let selectedQuality = null;
let selectedUrl = null;

let overviews = {};

let genresData = {};
let selectedGenre = "";

let availableGenres = [];

let actorsMap = {};

const movieMainGenres = [28, 12, 16, 35, 18, 10749, 27];
const seriesMainGenres = [10759, 18, 35, 9648, 10765, 80, 10768, 10749];

const genreMapFA = {
  28: "اکشن",
  12: "ماجراجویی",
  16: "انیمیشن",
  35: "کمدی",
  80: "جنایی",
  18: "درام",
  53: "هیجانی",
  10749: "عاشقانه",
  27: "ترسناک",
  878: "علمی‌تخیلی",
  99: "مستند",
  9648: "معمایی",
  10759: "اکشن و ماجراجویی",
  10762: "کودک",
  10763: "خبری",
  10764: "رئالیتی‌شو",
  10765: "علمی‌تخیلی و فانتزی",
  10766: "درام صابونی",
  10767: "گفتگو محور (Talk)",
  10768: "جنگ و سیاست",
};

const favKey = "cinemax_favorites";
const historyKey = "cinemax_history";

const favorites = new Set(JSON.parse(localStorage.getItem(favKey) || "[]"));
let history = JSON.parse(localStorage.getItem(historyKey) || "[]");

/* INIT */

async function init() {
  const res = await fetch("OnePageArchive.html");
  const html = await res.text();

  const data = parseData(html);
  movies = data.movies;
  series = data.series;

  try {
    const o = await fetch("movies_overview_fa.json");
    overviews = await o.json();
  } catch {
    console.log("overview file not found");
  }

  try {
    const so = await fetch("series_overview.json");
    const seriesOver = await so.json();


    overviews = {
      ...overviews,
      ...seriesOver,
    };
  } catch {
    console.log("series_overview.json not found");
  }


  let movieGenres = {};
  let seriesGenres = {};

  try {
    movieGenres = await (await fetch("movies_genres.json")).json();
  } catch {
    console.log("movies_genres.json not found");
  }

  try {
    seriesGenres = await (await fetch("series-genres.json")).json(); 
  } catch {
    console.log("series-genres.json not found");
  }


  genresData = {
    ...movieGenres,
    ...seriesGenres,
  };


  movies.forEach((m) => {
    m.genres = genresData[m.imdb] || [];
  });

  series.forEach((s) => {
    s.genres = genresData[s.imdb] || [];
  });

  try {
    const a = await fetch("imdb_actors_map.json");
    actorsMap = await a.json();
    console.log("actors map loaded:", Object.keys(actorsMap).length);
  } catch (e) {
    console.log("imdb_actors_map.json not found / failed to load", e);
    actorsMap = {};
  }

  updateGenreFilter();

  render(true);
}

function parseData(html) {
  const movies = [];
  const series = [];

  const blocks = html.split(/<hr\s*\/?>/i);

  blocks.forEach((block) => {
    const h = block.match(/<h3>(\d+)\.\s*(.*?)<\/h3>/i);
    if (!h) return;

    const rank = Number(h[1]);
    const titleFull = h[2];

    const year = titleFull.match(/\d{4}/)?.[0] || "";
    const title = titleFull.replace(year, "").trim();

    const get = (label) => block.match(new RegExp(`<b>${label}<\\/b>\\s*(.*?)<`, "i"))?.[1] || "";

    const imdb = get("IMDb Code:");
    const type = get("Title Type:").toLowerCase();

    const rating = parseFloat(get("IMDb Rates:")) || 0;
    const votes = get("IMDb Votes:");

    const links = [...block.matchAll(/<a href="([^"]+)"[^>]*>(.*?)<\/a>/gi)];

    /* ---------- MOVIE ---------- */

    if (type === "movie") {
      const qualities = { dubbed: {}, softsub: {} };

      links.forEach((l) => {
        const url = l[1];
        const txt = (url + l[2]).toLowerCase();

        let t = "softsub";

        if (
          txt.includes("dub") ||
          txt.includes("دوبله") ||
          txt.includes("persian") ||
          txt.includes("fa")
        ) {
          t = "dubbed";
        }

        if (txt.includes("1080")) qualities[t]["1080"] = url;
        if (txt.includes("720")) qualities[t]["720"] = url;
        if (txt.includes("480")) qualities[t]["480"] = url;
      });

      movies.push({
        id: rank,
        imdb,
        rank,
        title,
        year,
        rating,
        votes,
        qualities,
        dub: Object.keys(qualities.dubbed).length > 0,
        soft: Object.keys(qualities.softsub).length > 0,
      });
    }

    /* ---------- SERIES ---------- */

    if (type === "tvseries" || type === "tvseries " || type.includes("tv")) {
      const seasons = [];

      const parts = block.split(/season\s+\d+/gi);
      const nums = [...block.matchAll(/season\s+(\d+)/gi)].map((m) => Number(m[1]));

      nums.forEach((s, i) => {
        const part = parts[i + 1];
        if (!part) return;

        const seasonLinks = [];

        const seasonMatches = [...part.matchAll(/<a href="([^"]+)"[^>]*>(.*?)<\/a>/gi)];

        seasonMatches.forEach((l) => {
          
          const url = l[1];
          const txt = (url + l[2]).toLowerCase();

          const type =
            txt.includes("dub") ||
            txt.includes("دوبله") ||
            txt.includes("persian") ||
            txt.includes("fa")
              ? "dubbed"
              : "softsub";

          seasonLinks.push({
            label: l[2],
            url,
            type,
          });
        });

if (seasonLinks.length) {
  seasons.push({
    season: s,
    url: seasonLinks[0].url, 
    links: seasonLinks,
  });
}



      });

      if (seasons.length) {
        series.push({
          id: "s" + rank,
          imdb,
          rank,
          title,
          rating,
          votes,
          seasons,
          dub: seasons.some((s) => s.links.some((l) => l.type === "dubbed")),
          soft: seasons.some((s) => s.links.some((l) => l.type === "softsub")),
        });
      }
    }
  });

  console.log("movies:", movies.length);
  console.log("series:", series.length);

  return { movies, series };
}

function updateGenreFilter() {
  const select = document.getElementById("genreFilter");
  select.innerHTML = `<option value="">همه ژانرها</option>`;

  const allowed = currentView === "series" ? seriesMainGenres : movieMainGenres;

  allowed.forEach((id) => {
    const name = genreMapFA[id];
    if (!name) return;

    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = name;

    select.appendChild(opt);
  });
}



function filtered() {
  let source = currentView === "series" ? series : movies;
  let r = [...source];

  const q = searchInput.value.toLowerCase();

  if (q) r = r.filter((m) => m.title.toLowerCase().includes(q));

  if (filterType.value === "softsub") r = r.filter((m) => m.soft);

  if (filterType.value === "dubbed") r = r.filter((m) => m.dub);

  if (currentView === "movies") {
    if (sortType.value === "rating") r.sort((a, b) => b.rating - a.rating);
    else if (sortType.value === "votes")
      r.sort((a, b) => parseInt(b.votes.replace(/,/g, "")) - parseInt(a.votes.replace(/,/g, "")));
    else r.sort((a, b) => a.rank - b.rank);
  }

  if (currentView === "favorites") r = r.filter((m) => favorites.has(m.id));

  if (currentView === "history")
    r = history.map((id) => source.find((m) => m.id === id)).filter(Boolean);

  if (selectedGenre) {
    r = r.filter((m) => m.genres.includes(selectedGenre));
  }

  return r;
}


function render(reset = false) {
  if (reset) {
    grid.innerHTML = "";
    shown = 0;
  }

  const list = filtered();

  list.slice(shown, shown + BATCH).forEach((m) => {
    const el = document.createElement("div");
    el.className = "movie-card";
    el.dataset.id = m.id;

    const poster = `${POSTER_BASE}/${m.imdb}.jpg`;

    const genres = (m.genres || [])
      .map((id) => genreMapFA[Number(id)])
      .filter(Boolean)
      .join(" • ");

    console.log(m.title, m.imdb, m.genres);

    el.innerHTML = `

    <div class="poster">
      <img src="${poster}" loading="lazy"
        onerror="this.src='assets/no-poster.jpg'">
    </div>

    <div class="movie-title">${m.title} ${m.year ? `(${m.year})` : ""}</div>


    <div class="movie-genres genre-badge">${genres}</div>


  ${
    currentView === "movies" || currentView === "series"
      ? `<div class="movie-meta">⭐ ${m.rating} | ${m.votes}</div>`
      : ""
  }


  <div class="fav-btn ${favorites.has(m.id) ? "on" : ""}">
    <span class="heart">♥</span>
  </div>

`;

    el.querySelector(".fav-btn").onclick = (e) => {
      e.stopPropagation();

      favorites.has(m.id) ? favorites.delete(m.id) : favorites.add(m.id);

      localStorage.setItem(favKey, JSON.stringify([...favorites]));

      render(true);
    };

    el.onclick = () => {
      if (currentView === "series") openSeriesModal(m);
      else openMovieModal(m);
    };

    grid.appendChild(el);
  });

  shown += BATCH;

  loadMoreBtn.style.display = shown < list.length ? "block" : "none";
}

function getActorsForImdb(imdb) {
  const entry = actorsMap?.[imdb];
  return entry?.a || [];
}

function renderActorsHtml(imdb) {
  const actors = getActorsForImdb(imdb);
  if (!actors.length) return "";

  return `
    <div class="actors-strip">
      ${actors
        .map(
          (a) => `
        <div class="actor-chip" title="${a.n}">
          <div class="actor-img-wrapper">
            <img src="${ACTOR_BASE}/${a.i}"
            onerror="this.src='assets/no-actor.jpg'">
          </div>
          <div class="actor-name">${a.n}</div>
        </div>
      `,
        )
        .join("")}
    </div>
  `;
}



function openMovieModal(m) {
  currentMovie = m;

  const overview = overviews[m.imdb]?.overview_fa || "";

  const actorsHtml = renderActorsHtml(m.imdb);

  modalBody.innerHTML = `
    <div class="modal-header">
      <h2>${m.title} (${m.year})</h2>

      <div class="modal-fav ${favorites.has(m.id) ? "on" : ""}" id="modalFav">
        بعدا میبینم ♥
      </div>
    </div>

    ${overview ? `<div class="movie-overview">${overview}</div>` : ""}

    ${actorsHtml ? `<h3>بازیگران</h3>${actorsHtml}` : ""}


    <h3>انتخاب نسخه</h3>

    <div class="buttons">
      ${m.dub ? `<button class="version-btn" onclick="selectType(this,'dubbed')">دوبله</button>` : ""}
      ${m.soft ? `<button class="version-btn" onclick="selectType(this,'softsub')">زیرنویس</button>` : ""}
    </div>

    <div id="qualityStep"></div>
    <div id="playerArea"></div>
  `;

  const favBtn = document.getElementById("modalFav");

  favBtn.onclick = () => {
    if (favorites.has(m.id)) {
      favorites.delete(m.id);
    } else {
      favorites.add(m.id);
    }
    localStorage.setItem(favKey, JSON.stringify([...favorites]));
    favBtn.classList.toggle("on");
  };

  modal.classList.remove("hidden");
}



function selectType(btn, type) {
  document.querySelectorAll(".version-btn").forEach((b) => b.classList.remove("active"));

  btn.classList.add("active");

  selectedType = type;

  const q = currentMovie.qualities[type];

  const html = Object.keys(q)
    .map(
      (qual) =>
        `<button class="quality-btn"
      onclick="selectQuality(this,'${qual}','${q[qual]}')">
      ${qual}p
    </button>`,
    )
    .join("");

  document.getElementById("qualityStep").innerHTML = `
    <h3>کیفیت</h3>
    <div class="buttons">${html}</div>
  `;
}

function selectQuality(btn, qual, url) {
  document.querySelectorAll(".quality-btn").forEach((b) => b.classList.remove("active"));

  btn.classList.add("active");

  selectedQuality = qual;
  selectedUrl = url;

  document.getElementById("playerArea").innerHTML = `
    <div id="playerActions">
      <button id="playOnlineBtn" onclick="playMovie('${url}')">
        ▶ پخش آنلاین
      </button>

      <button id="downloadBtn" onclick="downloadMovie('${url}')">
        ⬇ دانلود
      </button>
    </div>
  `;
}

function downloadMovie(url) {
  if (window.electronAPI && window.electronAPI.downloadVideo) {
    window.electronAPI.downloadVideo(url);
  } else {
    window.open(url, "_blank");
  }
}



const versionButtons = document.querySelectorAll(".version-btn");
versionButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    versionButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });
});


const qualityButtons = document.querySelectorAll(".quality-btn");
qualityButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    qualityButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");


    const playerActions = document.getElementById("playerActions");
    if (playerActions) {
      playerActions.style.display = "flex";
      playerActions.style.opacity = "0";
      setTimeout(() => {
        playerActions.style.transition = "opacity 0.4s ease";
        playerActions.style.opacity = "1";
      }, 50);
    }
  });
});

function playMovie(url) {

  if (!history.includes(currentMovie.id)) {
    history.unshift(currentMovie.id);

    localStorage.setItem(historyKey, JSON.stringify(history.slice(0, 30)));
  }


  if (window.electronAPI && window.electronAPI.playVideo) {
    window.electronAPI.playVideo(url);
  } else {

    window.open(url, "_blank");
  }

  // پیام ساده در UI
  document.getElementById("playerArea").innerHTML = `
    <div style="margin-top:15px">
      در حال اجرای پلیر لطفا صبور باش جیگر ...
    </div>
  `;
}


function openSeriesModal(series) {
  modal.classList.remove("hidden");
  modalBody.innerHTML = "";

  const title = document.createElement("h2");
  title.textContent = series.title;

  modalBody.appendChild(title);

  const overview = overviews[series.imdb]?.fa || "";

  if (overview) {
    const p = document.createElement("div");
    p.className = "movie-overview";
    p.textContent = overview;
    modalBody.appendChild(p);
  }

  const actorsHtml = renderActorsHtml(series.imdb);
  if (actorsHtml) {
    const h = document.createElement("h3");
    h.textContent = "بازیگران";
    modalBody.appendChild(h);

    const wrap = document.createElement("div");
    wrap.innerHTML = actorsHtml;
    modalBody.appendChild(wrap.firstElementChild);
  }



  const versionBox = document.createElement("div");
  versionBox.className = "buttons";

  if (series.dub) {
    versionBox.innerHTML += `<button class="version-btn" onclick="selectSeriesType(this,'dubbed')">دوبله</button>`;
  }

  if (series.soft) {
    versionBox.innerHTML += `<button class="version-btn" onclick="selectSeriesType(this,'softsub')">زیرنویس</button>`;
  }

  modalBody.appendChild(versionBox);

  const seasonContainer = document.createElement("div");
  seasonContainer.id = "seriesSeasons";

  modalBody.appendChild(seasonContainer);


  currentSeries = series;
}

let currentSeries = null;
let selectedSeriesType = null;

async function selectSeriesType(btn, type) {

  document.querySelectorAll(".version-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");

  selectedSeriesType = type;
  const container = document.getElementById("seriesSeasons");
  container.innerHTML = "";

  currentSeries.seasons.forEach((s) => {
    const linksOfType = s.links.filter((l) => l.type === type);
    if (linksOfType.length === 0) return;

    const seasonDiv = document.createElement("div");
    seasonDiv.className = "season";

    const header = document.createElement("div");
    header.className = "season-header";
    header.innerHTML = `<span>فصل ${s.season}</span> <span class="season-arrow">▼</span>`;

    const content = document.createElement("div");
    content.className = "season-content";

    header.onclick = async () => {
      seasonDiv.classList.toggle("open");
      
      if (seasonDiv.classList.contains("open")) {
        content.innerHTML = `<div class="quality-selector-series"></div><div class="episodes-list"></div>`;
        const qSelector = content.querySelector(".quality-selector-series");
        const epList = content.querySelector(".episodes-list");

        linksOfType.forEach(link => {
          const qBtn = document.createElement("button");
          qBtn.className = "quality-btn";
          qBtn.textContent = link.label;
          

qBtn.onclick = async () => {
    epList.innerHTML = `<div class="loading-status">در حال شکار قسمت‌ها... صبور باش جیگر 😉</div>`;
    
    const episodes = await window.electronAPI.fetchEpisodes(link.url);
    
    if (!episodes || episodes.length === 0) {
      epList.innerHTML = `<div class="error-status">قسمتی پیدا نشد یا سرور خوابیده!</div>`;
      return;
    }

epList.innerHTML = episodes.map((ep, index) => {
    const cleanTitle = ep.title.replace(/\.(mkv|mp4)$/i, '').replace(/\./g, ' ');
    
    return `
      <div class="episode-row">
        <div class="ep-info">
            <span class="ep-number">${index + 1}</span>
            <span class="ep-name" title="${ep.title}">${cleanTitle}</span>
        </div>

        <div class="ep-actions">
            <button class="play-ep-btn" data-url="${ep.url}">
                <i class="play-icon">▶</i> پخش
            </button>

            <button class="download-ep-btn" data-url="${ep.url}">
                <i class="download-icon">⬇</i> دانلود
            </button>
        </div>
      </div>
    `;
}).join("");


epList.querySelectorAll('.play-ep-btn').forEach(playBtn => {
  playBtn.onclick = () => {
    const videoUrl = playBtn.getAttribute('data-url');
    if (window.electronAPI && window.electronAPI.playVideo) {
      window.electronAPI.playVideo(videoUrl);
    } else {
      window.open(videoUrl, '_blank');
    }
  };
});

epList.querySelectorAll('.download-ep-btn').forEach(downloadBtn => {
  downloadBtn.onclick = (e) => {
    e.stopPropagation();

    const videoUrl = downloadBtn.getAttribute('data-url');

    if (window.electronAPI && window.electronAPI.downloadVideo) {
      window.electronAPI.downloadVideo(videoUrl);
    } else {
      window.open(videoUrl, '_blank');
    }
  };
});




};

          qSelector.appendChild(qBtn);
        });

        content.style.maxHeight = "1000px";
      } else {
        content.style.maxHeight = null;
      }
    };

    seasonDiv.appendChild(header);
    seasonDiv.appendChild(content);
    container.appendChild(seasonDiv);
  });
}





closeModal.onclick = () => {
  const v = document.getElementById("videoPlayer");
  if (v) v.pause();
  modal.classList.add("hidden");
};

modal.onclick = (e) => {
  if (e.target === modal) closeModal.click();
};

loadMoreBtn.onclick = () => render();

let t;

searchInput.oninput = () => {
  clearTimeout(t);
  t = setTimeout(() => render(true), 400);
};

filterType.onchange = sortType.onchange = () => render(true);



document.querySelectorAll(".side-item").forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll(".side-item").forEach((b) => b.classList.remove("active"));

    btn.classList.add("active");

    currentView = btn.dataset.view;

    updateGenreFilter();

    render(true);
  };
});



function setInitialActive() {
  const items = document.querySelectorAll(".side-item");

  items.forEach((b) => b.classList.remove("active"));

  const movieBtn = document.querySelector('.side-item[data-view="movies"]');

  if (movieBtn) {
    movieBtn.classList.add("active");
  }


  if (document.activeElement) {
    document.activeElement.blur();
  }
}


async function fetchEpisodesFromDirectory(url) {
  const res = await fetch(url);
  const html = await res.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const links = [...doc.querySelectorAll("a")]
    .map((a) => {
      const href = a.getAttribute("href") || "";
      const text = (a.textContent || "").trim();
      return { href, text };
    })
    .filter((x) => x.href.toLowerCase().includes(".mkv"));

  return links;
}

async function openSeasonDirectory(seasonUrl, container) {
  container.innerHTML = `<div>در حال خواندن قسمت‌ها...</div>`;

  try {
    const episodes = await fetchEpisodesFromDirectory(seasonUrl);

    if (!episodes.length) {
      container.innerHTML = `<div>قسمتی پیدا نشد.</div>`;
      return;
    }

    container.innerHTML = episodes
      .map(
        (ep) => `
          <button class="season-btn" onclick="window.open('${ep.href}', '_blank')">
            ${ep.text || ep.href.split("/").pop()}
          </button>
        `,
      )
      .join("");
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div>خطا در خواندن فصل</div>`;
  }
}

const randomBtn = document.getElementById("randomMovie");

randomBtn.onclick = () => {
  if (!movies || movies.length === 0) return;


  const topMovies = movies.filter((movie) => movie.rank <= 500);

  if (topMovies.length === 0) return;


  const randomMovie = topMovies[Math.floor(Math.random() * topMovies.length)];


  openMovieModal(randomMovie);
};

const menuToggle = document.querySelector(".menu-toggle");
const toolbar = document.querySelector(".toolbar");

menuToggle.addEventListener("click", () => {
  toolbar.classList.toggle("active");
});

document.getElementById("genreFilter").onchange = (e) => {
  selectedGenre = Number(e.target.value) || "";
  render(true);
};



init().then(() => {
  setInitialActive();
  render(true);
});