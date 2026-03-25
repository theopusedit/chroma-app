// src/music.js
const BASE = "https://itunes.apple.com";

async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("데이터 로드 실패");
  return res.json();
}

export async function searchMusic(query) {
  const q = encodeURIComponent(query);
  const [trackData, albumData] = await Promise.all([
    apiFetch(`${BASE}/search?term=${q}&country=KR&media=music&entity=song&limit=15`),
    apiFetch(`${BASE}/search?term=${q}&country=KR&media=music&entity=album&limit=8`),
  ]);
  return {
    tracks: (trackData.results || []).map(formatTrack),
    albums: (albumData.results || []).map(formatAlbum),
  };
}

export async function getAlbumTracks(collectionId) {
  const data = await apiFetch(`${BASE}/lookup?id=${collectionId}&entity=song&country=KR`);
  const items = data.results || [];
  const albumInfo = items.find(i => i.wrapperType === "collection");
  const tracks = items
    .filter(i => i.wrapperType === "track")
    .sort((a, b) => a.trackNumber - b.trackNumber)
    .map(formatTrack);
  return { ...(albumInfo ? formatAlbum(albumInfo) : {}), trackList: tracks };
}

export function getStreamingLinks(track) {
  const q = encodeURIComponent(`${track.t} ${track.ar}`);
  return [
    { name: "Apple Music", url: track.itunesUrl || `https://music.apple.com/kr/search?term=${q}` },
    { name: "YouTube Music", url: `https://music.youtube.com/search?q=${q}` },
    { name: "Melon", url: `https://www.melon.com/search/total/index.htm?q=${q}` },
    { name: "Spotify", url: `https://open.spotify.com/search/${q}` },
  ];
}

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
    coverUrl: item.artworkUrl100?.replace("100x100bb", "400x400bb") || "",
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
    coverUrl: item.artworkUrl100?.replace("100x100bb", "400x400bb") || "",
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
