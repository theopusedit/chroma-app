// api/music.js — Apple Music RSS 프록시 (차트용)
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { country = "us", limit = 25, type = "songs" } = req.query;
  try {
    const url = type === "albums"
      ? `https://rss.applemarketingtools.com/api/v2/${country}/music/new-releases/${limit}/albums.json`
      : `https://rss.applemarketingtools.com/api/v2/${country}/music/most-played/${limit}/songs.json`;
    const data = await fetch(url).then(r => r.json());
    return res.status(200).json(data);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
