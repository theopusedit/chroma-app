// api/spotify.js — Spotify API 프록시
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
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
    } else if (type === "artist") {
      url = `https://api.spotify.com/v1/artists/${id}`;
    } else if (type === "artist-tracks") {
      url = `https://api.spotify.com/v1/artists/${id}/top-tracks?market=${market}`;
    } else if (type === "artist-albums") {
      url = `https://api.spotify.com/v1/artists/${id}/albums?market=${market}&limit=10&include_groups=album,single`;
    } else if (type === "related-artists") {
      url = `https://api.spotify.com/v1/artists/${id}/related-artists`;
    } else if (type === "recommendations") {
      url = `https://api.spotify.com/v1/recommendations?seed_tracks=${id}&market=${market}&limit=${limit}`;
    } else if (type === "recommendations-by-artists") {
      url = `https://api.spotify.com/v1/recommendations?seed_artists=${id}&market=${market}&limit=${limit}`;
    } else if (type === "new-releases") {
      url = `https://api.spotify.com/v1/browse/new-releases?country=${country}&limit=${limit}`;
    } else {
      return res.status(400).json({ error: "Unknown type" });
    }

    const data = await fetch(url, { headers: h }).then(r => r.json());
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
