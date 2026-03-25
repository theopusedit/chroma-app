// api/music.js  ← 이 파일은 프로젝트 루트의 api/ 폴더에 넣어야 해요
// Vercel 서버리스 함수 — RSS/iTunes를 서버에서 호출해서 CORS 우회

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const { type, country = "us", limit = 25, query, entity = "song" } = req.query;

  try {
    let url = "";

    if (type === "chart") {
      // Apple Music RSS 실시간 차트 (country: us=전체, kr=한국, gb=영국, jp=일본)
      url = `https://rss.applemarketingtools.com/api/v2/${country}/music/most-played/${limit}/songs.json`;
    } else if (type === "new-releases") {
      url = `https://rss.applemarketingtools.com/api/v2/${country}/music/new-releases/${limit}/albums.json`;
    } else if (type === "search") {
      url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&country=${country}&media=music&entity=${entity}&limit=${limit}`;
    } else if (type === "lookup") {
      url = `https://itunes.apple.com/lookup?id=${query}&entity=song&country=${country}`;
    } else {
      return res.status(400).json({ error: "Unknown type" });
    }

    const response = await fetch(url);
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
