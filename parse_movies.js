const fs = require("fs");
const path = require("path");

// const html = fs.readFileSync("top_5000_movies.html", "utf8");

const distDir = path.join(__dirname, "dist");
const movieDataDir = path.join(distDir, "movie-data");

fs.mkdirSync(distDir, { recursive: true });
fs.mkdirSync(movieDataDir, { recursive: true });


const blocks = html.split("<hr>");

const moviesIndex = [];

blocks.forEach((block) => {
  const titleMatch = block.match(/<h3>(.*?)<\/h3>/);
  if (!titleMatch) return;

  const titleLine = titleMatch[1];

  const titleParts = titleLine.match(/^\d+\.\s(.+)\s(\d{4})$/);
  if (!titleParts) return;

  const title = titleParts[1].trim();
  const year = titleParts[2];

  const ratingMatch = block.match(/IMDb Rates:<\/b>\s*([0-9.]+)/);
  const rating = ratingMatch ? ratingMatch[1] : null;

  const imdbMatch = block.match(/IMDb Code:<\/b>\s*(tt\d+)/);
  const imdb = imdbMatch ? imdbMatch[1] : null;

  if (!imdb) return;

  const links = [
    ...block.matchAll(/<a href="([^"]+)">([^<]+)<\/a>\s*\/\s*([^<]+)/g),
  ];

  const softsub = [];
  const dubbed = [];

  links.forEach((link) => {
    const url = link[1];
    const quality = link[2].trim();
    const size = link[3].trim();

    const item = { quality, size, url };

    if (url.includes("SoftSub")) {
      softsub.push(item);
    } else if (url.includes("Dubbed")) {
      dubbed.push(item);
    }
  });

  const movieDetails = {
    id: imdb,
    title,
    year,
    imdb,
    rating,
    streams: {
      softsub,
      dubbed,
    },
  };

  const movieIndexItem = {
    id: imdb,
    title,
    year,
    rating,
    searchTitle: title.toLowerCase(),
  };

  moviesIndex.push(movieIndexItem);

  fs.writeFileSync(
    path.join(movieDataDir, `${imdb}.json`),
    JSON.stringify(movieDetails)
  );
});

moviesIndex.sort((a, b) => a.title.localeCompare(b.title));

fs.writeFileSync(
  path.join(distDir, "movies.index.json"),
  JSON.stringify(moviesIndex)
);

console.log("✅ Done. Indexed movies:", moviesIndex.length);
