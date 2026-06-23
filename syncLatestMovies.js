const { initializeDatabase, upsertMovies } = require("./database");
const { fetchLatestMovies } = require("./tmdb");

async function syncLatestMovies() {
  await initializeDatabase();

  const movies = await fetchLatestMovies();
  const result = await upsertMovies(movies);

  console.log(
    `TMDB sync complete: ${result.added} added, ${result.updated} updated, ` +
    `${result.unchanged} unchanged (${result.fetched} fetched).`
  );
}

syncLatestMovies()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error.message);
    process.exit(1);
  });
