// api/spotify.js
let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(
        process.env.VITE_SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET
      ).toString("base64"),
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300"); // 5분 캐시

  const { type, q, id, market = "US", limit = 20, country = "US" } = req.query;

  try {
    const token = await getToken();
    const h = { Authorization: `Bearer ${token}` };
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
    } else if (type === "new-releases") {
      url = `https://api.spotify.com/v1/browse/new-releases?country=${country}&limit=${limit}`;
    } else {
      return res.status(400).json({ error: "Unknown type" });
    }

    const spotifyRes = await fetch(url, { headers: h });
    
    // Rate limit 처리
    if (spotifyRes.status === 429) {
      const retryAfter = spotifyRes.headers.get("Retry-After") || "2";
      return res.status(429).json({ error: "rate_limit", retryAfter });
    }
    
    const data = await spotifyRes.json();
    
    // Spotify 에러 응답 처리
    if (data.error) {
      console.error("Spotify error:", data.error);
      return res.status(data.error.status || 500).json({ error: data.error.message });
    }
    
    return res.status(200).json(data);
  } catch (error) {
    console.error("Handler error:", error);
    return res.status(500).json({ error: error.message });
  }
}
