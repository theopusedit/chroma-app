// src/music.js
// 모든 API 호출은 /api/music 프록시를 통해 서버에서 실행 → CORS 없음

const PROXY = "/api/music";

async function call(params) {
  const url = PROXY + "?" + new URLSearchParams(params).toString();
  const res = await fetch(url);
  if (!res.ok) throw new Error("API 오류");
  return res.json();
}

// ── 글로벌 실시간 차트 (Apple Music RSS) ─────────────────────
// country: us=글로벌, kr=한국, gb=영국, jp=일본, au=호주
export async function getTopChart(limit = 25, country = "us") {
  const data = await call({ type: "chart", country, limit });
  return (data.feed?.results || []).map(formatRssTrack);
}

// ── 한국 차트 ─────────────────────────────────────────────────
export async function getKrChart(limit = 25) {
  const data = await call({ type: "chart", country: "kr", limit });
  return (data.feed?.results || []).map(formatRssTrack);
}

// ── 최신 앨범 (발매일 기준 최신) ─────────────────────────────
export async function getNewReleases(limit = 10, country = "us") {
  const data = await call({ type: "new-releases", country, limit });
  return (data.feed?.results || []).map(formatRssAlbum);
}

// ── 검색 ──────────────────────────────────────────────────────
export async function searchMusic(query, country = "KR") {
  const [trackData, albumData] = await Promise.all([
    call({ type: "search", query, country, entity: "song", limit: 15 }),
    call({ type: "search", query, country, entity: "album", limit: 8 }),
  ]);
  return {
    tracks: (trackData.results || []).map(formatTrack),
    albums: (albumData.results || []).map(formatAlbum),
  };
}

// ── 앨범 수록곡 ───────────────────────────────────────────────
export async function getAlbumTracks(collectionId) {
  const data = await call({ type: "lookup", query: collectionId });
  const items = data.results || [];
  const albumInfo = items.find(i => i.wrapperType === "collection");
  const tracks = items
    .filter(i => i.wrapperType === "track")
    .sort((a, b) => a.trackNumber - b.trackNumber)
    .map(formatTrack);
  return { ...(albumInfo ? formatAlbum(albumInfo) : {}), trackList: tracks };
}

// ── 스트리밍 링크 ─────────────────────────────────────────────
export function getStreamingLinks(track) {
  const q = encodeURIComponent(`${track.t} ${track.ar}`);
  return [
    { name: "Apple Music", url: track.itunesUrl || `https://music.apple.com/kr/search?term=${q}` },
    { name: "YouTube Music", url: `https://music.youtube.com/search?q=${q}` },
    { name: "Melon", url: `https://www.melon.com/search/total/index.htm?q=${q}` },
    { name: "Spotify", url: `https://open.spotify.com/search/${q}` },
  ];
}

// ── RSS 포맷 ──────────────────────────────────────────────────
function formatRssTrack(item) {
  return {
    id: String(item.id || Math.random()),
    itunesId: item.id,
    t: item.name || "",
    ar: item.artistName || "",
    al: item.albumName || "",
    yr: item.releaseDate ? parseInt(item.releaseDate.slice(0, 4)) : null,
    coverUrl: item.artworkUrl100?.replace("100x100bb", "600x600bb") || "",
    coverSmUrl: item.artworkUrl100 || "",
    itunesUrl: item.url || "",
    dur: "", genre: item.genreName || "",
    bpm: null, type: "album_track",
    rec: 0, rt: 0, g: 0,
  };
}

function formatRssAlbum(item) {
  return {
    id: String(item.id || Math.random()),
    itunesId: item.id,
    t: item.name || "",
    ar: item.artistName || "",
    yr: item.releaseDate ? parseInt(item.releaseDate.slice(0, 4)) : null,
    coverUrl: item.artworkUrl100?.replace("100x100bb", "600x600bb") || "",
    coverSmUrl: item.artworkUrl100 || "",
    itunesUrl: item.url || "",
    altype: "앨범", label: "",
    genre: item.genreName || "",
    tracks: 0, dur: "", trackList: [],
    rec: 0, rt: 0, g: 0,
  };
}

// ── iTunes 포맷 ───────────────────────────────────────────────
export function formatTrack(item) {
  if (!item) return null;
  return {
    id: String(item.trackId || item.collectionId || Math.random()),
    itunesId: item.trackId,
    collectionId: item.collectionId,
    t: item.trackName || item.collectionName || "",
    ar: item.artistName || "",
    al: item.collectionName || "",
    yr: item.releaseDate ? parseInt(item.releaseDate.slice(0, 4)) : null,
    coverUrl: item.artworkUrl100?.replace("100x100bb", "600x600bb") || "",
    coverSmUrl: item.artworkUrl100 || "",
    itunesUrl: item.trackViewUrl || item.collectionViewUrl || "",
    dur: msToTime(item.trackTimeMillis || 0),
    genre: item.primaryGenreName || "",
    bpm: null,
    type: item.collectionType === "Single" ? "싱글" : "앨범 수록곡",
    altype: item.collectionType || "앨범",
    rec: 0, rt: 0, g: 0,
  };
}

export function formatAlbum(item) {
  if (!item) return null;
  return {
    id: String(item.collectionId || Math.random()),
    itunesId: item.collectionId,
    t: item.collectionName || "",
    ar: item.artistName || "",
    yr: item.releaseDate ? parseInt(item.releaseDate.slice(0, 4)) : null,
    coverUrl: item.artworkUrl100?.replace("100x100bb", "600x600bb") || "",
    coverSmUrl: item.artworkUrl100 || "",
    itunesUrl: item.collectionViewUrl || "",
    altype: item.collectionType || "앨범",
    label: item.copyright || "",
    genre: item.primaryGenreName || "",
    tracks: item.trackCount || 0,
    dur: "", trackList: [],
    rec: 0, rt: 0, g: 0,
  };
}

function msToTime(ms) {
  if (!ms) return "";
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000).toString().padStart(2, "0");
  return `${min}:${sec}`;
}
