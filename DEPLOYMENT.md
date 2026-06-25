# Smart Movie Deployment

This project is ready to deploy as a Node.js web service.

## Recommended Hosting

Use Render because the project needs `server.js` for API routes such as login, register, movies, trailers, and recommendations.

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
