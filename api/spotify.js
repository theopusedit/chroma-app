// api/spotify.js — Vercel 서버리스 함수
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const { type, q, id, market = "KR", limit = 20, country = "KR" } = req.query;

  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(
          process.env.VITE_SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET
        ).toString("base64"),
      },
      body: "grant_type=client_credentials",
    });
    const { access_token } = await tokenRes.json();
    const h = { Authorization: `Bearer ${access_token}` };

    let url = "";
    if (type === "search") {
      url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track,album,artist&market=${market}&limit=${limit}`;
    } else if (type === "track") {
      url = `https://api.spotify.com/v1/tracks/${id}?market=${market}`;
    } else if (type === "audio-features") {
      url = `https://api.spotify.com/v1/audio-features/${id}`;
    } else if (type === "album") {
      url = `https://api.spotify.com/v1/albums/${id}?market=${market}`;
    } else if (type === "artist-tracks") {
      url = `https://api.spotify.com/v1/artists/${id}/top-tracks?market=${market}`;
    } else if (type === "recommendations") {
      url = `https://api.spotify.com/v1/recommendations?seed_tracks=${id}&market=${market}&limit=${limit}`;
    } else if (type === "new-releases") {
      url = `https://api.spotify.com/v1/browse/new-releases?country=${country}&limit=${limit}`;
    } else if (type === "category-playlists") {
      url = `https://api.spotify.com/v1/browse/categories/${id}/playlists?country=${country}&limit=${limit}`;
    } else if (type === "playlist-tracks") {
      url = `https://api.spotify.com/v1/playlists/${id}/tracks?market=${market}&limit=50`;
    } else if (type === "charts") {
      // Global Top 50: 37i9dQZEVXbMDoHDwVN2tF
      // Korea Top 50:  37i9dQZEVXbNxXF4SkHj9F
      // Pop:           37i9dQZF1DXarRysLJmuju
      // K-Pop:         37i9dQZF1DX9tPFwDMOaN1
      // Hip-Hop:       37i9dQZF1DX0XUsuxWHRQd
      // Indie:         37i9dQZF1DX2sUQwD7tbmL
      // R&B:           37i9dQZF1DX4SBhb3fqCJd
      // Jazz:          37i9dQZF1DXbITWG1ZJKYt
      const playlistId = id || "37i9dQZEVXbMDoHDwVN2tF";
      url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?market=${market}&limit=50`;
    } else {
      return res.status(400).json({ error: "Unknown type" });
    }

    const data = await fetch(url, { headers: h }).then(r => r.json());
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
