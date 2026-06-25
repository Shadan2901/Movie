# Smart Movie Deployment

This project is ready to deploy as a Node.js web service.

## GitHub Pages

GitHub Pages can host the static website from the `public` folder.

1. Push the latest code to GitHub.
2. Open the repository on GitHub.
3. Go to **Settings > Pages**.
4. Under **Build and deployment**, choose **GitHub Actions**.
5. The workflow `.github/workflows/pages.yml` will publish the site automatically.

The default GitHub Pages URL will look like:

```text
https://shadan2901.github.io/Movie/
```

If GitHub Pages serves the repository root, the root `index.html` redirects visitors to the static website inside `public/index.html`.

The GitHub Pages version supports browsing, searching, poster display, trailer links, wishlist, and browser-local register/login. It cannot run `server.js`, MySQL, or Ollama because GitHub Pages only hosts static files.

## Recommended Full Hosting

Use Render when you need the full Node server for API routes such as login, register, movies, trailers, and recommendations.

## Deploy To Render

1. Push the latest code to GitHub.
2. Open Render and choose **New > Blueprint**.
3. Connect the GitHub repository `Shadan2901/Movie`.
4. Render will read `render.yaml` and create a web service named `smartmovie`.
5. Add the secret environment variables when Render asks:
   - `TMDB_ACCESS_TOKEN`
   - `TMDB_API_KEY`
6. Deploy.

The free Render URL will usually look like:

```text
https://smartmovie.onrender.com
```

If `smartmovie` is already taken, Render may ask for another service name, such as `smartmovie-csc577`.

## Custom Domain

For a real domain such as `smartmovie.com` or `smartmovie.my`, buy the domain first from a domain provider. Then add it in Render under:

```text
Service > Settings > Custom Domains
```

After that, update the DNS records at the domain provider and verify the domain in Render.

## Notes

- The website can run without MySQL by using the local movie catalog fallback.
- Register and login can still work in fallback mode.
- AI recommendations using Ollama need an Ollama server. On normal cloud hosting, Ollama is not available unless you deploy it separately or connect another hosted AI API.
