# Smart Movies MySQL Database

The project connects to the local MySQL/MariaDB server with:

- Host: `127.0.0.1`
- Port: `3307`
- Database: `movie`
- Username: `root`
- Password: empty
- Authentication protocol: `default`
- SSL: disabled

## Start the project

1. Start the local MySQL server.
2. Open the `Movie` or `Movie-main` folder in VS Code.
3. Run `npm start` inside `Movie-main`.
4. Open `http://localhost:3000`.

On first startup, the app creates the `movie` database and its tables, then
imports all records from `data/movies.json` when the `movies` table is empty.

## Tables

- `movies` - movie catalog
- `genres` - genre names
- `movie_genres` - many-to-many movie and genre relationships
- `users` - account and login data
- `user_preferences` - language and profile photo
- `wishlists` - movies saved by each user
- `feedback` - feedback submitted from Settings
- `recommendation_history` - AI prompts and replies
- `recommendation_items` - movies returned for each recommendation

## View MySQL in VS Code

Open SQLTools and connect to `Smart Movies MySQL`.

Useful queries:

```sql
USE movie;
SELECT COUNT(*) FROM movies;
SELECT id, title, year, rating FROM movies ORDER BY popularity DESC LIMIT 20;
SELECT id, first_name, last_name, email, role FROM users;
SELECT * FROM genres ORDER BY name;
SELECT * FROM wishlists ORDER BY added_at DESC;
SELECT * FROM feedback ORDER BY created_at DESC;
SELECT * FROM recommendation_history ORDER BY created_at DESC;
```

The default admin account is:

- Email: `admin@smartmovies.com`
- Password: `admin123`

Application passwords are stored as salted hashes.
