// src/music.js
const ITUNES = "https://itunes.apple.com";
const RSS = "https://rss.applemarketingtools.com/api/v2/kr/music";

async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("데이터 로드 실패");
  return res.json();
}

// ── 실시간 차트 (Apple Music 한국 인기순) ─────────────────────
export async function getTopChart(limit = 25) {
  try {
    const data = await apiFetch(`${RSS}/most-played/${limit}/songs.json`);
    const results = (data.feed?.results || []).map(formatRssTrack);
    if (results.length > 0) return results;
  } catch(e) {}
  // fallback: iTunes 검색 (연도 없이 — 최신순으로 나옴)
  const data = await apiFetch(`${ITUNES}/search?term=kpop&country=KR&media=music&entity=song&limit=${limit}&sort=recent`);
  return (data.results || []).map(formatTrack);
}

// ── 최신 발매 앨범 (한국 신보) ────────────────────────────────
export async function getNewReleases(limit = 10) {
  try {
    const data = await apiFetch(`${RSS}/new-releases/${limit}/albums.json`);
    const results = (data.feed?.results || []).map(formatRssAlbum);
    if (results.length > 0) return results;
  } catch(e) {}
  // fallback
  const data = await apiFetch(`${ITUNES}/search?term=kpop&country=KR&media=music&entity=album&limit=${limit}&sort=recent`);
  return (data.results || []).map(formatAlbum);
}

// ── 검색 ──────────────────────────────────────────────────────
export async function searchMusic(query) {
  const q = encodeURIComponent(query);
  const [trackData, albumData] = await Promise.all([
    apiFetch(`${ITUNES}/search?term=${q}&country=KR&media=music&entity=song&limit=15`),
    apiFetch(`${ITUNES}/search?term=${q}&country=KR&media=music&entity=album&limit=8`),
  ]);
  return {
    tracks: (trackData.results || []).map(formatTrack),
    albums: (albumData.results || []).map(formatAlbum),
  };
}

// ── 앨범 수록곡 ───────────────────────────────────────────────
export async function getAlbumTracks(collectionId) {
  const data = await apiFetch(`${ITUNES}/lookup?id=${collectionId}&entity=song&country=KR`);
  const items = data.results || [];
  const albumInfo = items.find(i => i.wrapperType === "collection");
  const tracks = items
    .filter(i => i.wrapperType === "track")
    .sort((a, b) => a.trackNumber - b.trackNumber)
    .map(formatTrack);
  return { ...(albumInfo ? formatAlbum(albumInfo) : {}), trackList: tracks };
}

// ── 스트리밍 외부 링크 ────────────────────────────────────────
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
    yr: item.releaseDate ? parseInt(item.releaseDate.slice(0,4)) : null,
    coverUrl: item.artworkUrl100?.replace("100x100bb","400x400bb") || "",
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
    yr: item.releaseDate ? parseInt(item.releaseDate.slice(0,4)) : null,
    coverUrl: item.artworkUrl100?.replace("100x100bb","400x400bb") || "",
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
    yr: item.releaseDate ? parseInt(item.releaseDate.slice(0,4)) : null,
    coverUrl: item.artworkUrl100?.replace("100x100bb","400x400bb") || "",
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
    yr: item.releaseDate ? parseInt(item.releaseDate.slice(0,4)) : null,
    coverUrl: item.artworkUrl100?.replace("100x100bb","400x400bb") || "",
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
  const sec = Math.floor((ms % 60000) / 1000).toString().padStart(2,"0");
  return `${min}:${sec}`;
}
