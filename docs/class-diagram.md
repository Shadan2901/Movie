# Smart Movie Recommendation - Class Diagram

This project is written mostly with JavaScript functions and browser modules, not formal JavaScript `class` declarations. The diagram below models the main conceptual classes, data objects, controllers, and services used by the application.

```mermaid
classDiagram
  direction LR

  class Movie {
    +string id
    +string title
    +string year
    +string rating
    +number[] genre_ids
    +string poster
    +string description
    +number popularity
  }

  class Recommendation {
    +string title
    +string year
    +string rating
    +string poster
    +string description
    +string why
  }

  class User {
    +string firstName
    +string lastName
    +string email
    +string contact
    +string address
    +string city
    +string state
    +string password
    +string photo
    +string language
  }

  class AdminUser {
    +string role
    +verifyCredentials(email, password)
  }

  class Feedback {
    +string type
    +string message
    +string user
    +string date
  }

  class Wishlist {
    +Movie[] items
    +loadWishlist()
    +saveWishlist()
    +isInWishlist(movie)
    +toggleWishlist(movie)
    +clearWishlist()
  }

  class MovieCatalog {
    +Movie[] movies
    +loadMovies()
    +saveMovies()
    +normalizeMovie(payload, existingMovie)
    +isTargetYear(movie)
    +getCandidateMovies(promptText)
    +searchMovies(search)
  }

  class MovieJsonStore {
    +string moviesPath
    +readMovies()
    +writeMovies(movies)
  }

  class MovieApiController {
    +getMovies(page, limit, search)
    +filterBySearch(search)
    +paginate(page, limit)
  }

  class AdminMovieApiController {
    +listMovies(search)
    +createMovie(payload)
    +updateMovie(id, payload)
    +deleteMovie(id)
  }

  class RecommendationApiController {
    +getHealth()
    +recommend(prompt, username)
    +detectMovieIntent(prompt)
    +buildChatPrompt(prompt, username)
    +buildRecommendPrompt(prompt, movies, username)
  }

  class OllamaClient {
    +string url
    +string model
    +getModels()
    +generate(prompt, format)
  }

  class AuthController {
    +getUsers()
    +saveUsers(users)
    +setCurrentUser(user)
    +login(email, password)
    +register(user)
    +showMessage(text, type)
  }

  class HomePageController {
    +currentUser
    +currentPage
    +currentSearch
    +loadMovies()
    +renderMovies(items)
    +renderPagination()
    +askAI(input)
    +updateAuthUI()
    +openProfileModal()
    +saveCurrentUser(previousEmail)
    +renderFeedbackList()
  }

  class WishlistPageController {
    +loadWishlist()
    +saveWishlist(items)
    +renderWishlistPage()
    +removeMovie(movieKey)
  }

  class AdminDashboardController {
    +Movie[] movies
    +boolean serverMode
    +fetchMovies()
    +renderMovies(totalOverride)
    +getFormRecord()
    +saveMovie(record)
    +deleteMovie(id)
    +renderAdminFeedback()
  }

  class LocalStorage {
    +smartMovieUsers
    +smartCurrentUser
    +smartAdminVerified
    +movieWishlist
    +smartFeedback
    +smartLanguage
    +adminMovies
  }

  AdminUser --|> User
  MovieCatalog "1" o-- "*" Movie
  MovieJsonStore ..> MovieCatalog : persists
  MovieApiController ..> MovieCatalog : reads
  AdminMovieApiController ..> MovieCatalog : creates/updates/deletes
  RecommendationApiController ..> MovieCatalog : selects candidates
  RecommendationApiController ..> OllamaClient : asks AI
  RecommendationApiController ..> Recommendation : returns
  Recommendation ..> Movie : based on

  AuthController ..> User : manages
  AuthController ..> AdminUser : verifies
  AuthController ..> LocalStorage : stores session/users

  HomePageController ..> MovieApiController : fetches movies
  HomePageController ..> RecommendationApiController : fetches AI reply
  HomePageController ..> Wishlist : updates
  HomePageController ..> User : edits profile
  HomePageController ..> Feedback : creates
  HomePageController ..> LocalStorage : reads/writes

  Wishlist "1" o-- "*" Movie
  Wishlist ..> LocalStorage : persists
  WishlistPageController ..> Wishlist : displays/removes

  AdminDashboardController ..> AdminMovieApiController : server mode CRUD
  AdminDashboardController ..> Movie : edits
  AdminDashboardController ..> Feedback : displays
  AdminDashboardController ..> LocalStorage : fallback/admin data
```

## Main implementation mapping

- `server.js`: `MovieCatalog`, `MovieApiController`, `AdminMovieApiController`, `RecommendationApiController`, `MovieJsonStore`, `OllamaClient`
- API endpoints: `/api/movies`, `/api/admin/movies`, `/api/admin/movies/:id`, `/api/health`, `/api/recommend`
- `public/script.js`: `HomePageController`, profile settings, wishlist panel, AI chat UI
- `public/auth.js`: `AuthController`, `User`, `AdminUser`
- `public/wishlist.js`: `WishlistPageController`, wishlist storage
- `public/admin-dashboard.js`: `AdminDashboardController`, admin movie CRUD UI, feedback display
- `data/movies.json`: stored `Movie` records
