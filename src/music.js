// src/music.js — Spotify API (Client Credentials 호환)
const SP = "/api/spotify";

async function sp(params) {
  const url = SP + "?" + new URLSearchParams(params).toString();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Spotify ${res.status}`);
  return res.json();
}

// ── 장르별 인기곡 (검색 기반) ─────────────────────────────────
const GENRE_QUERIES = {
  global:  { q: "year:2024-2025",           market: "US" },
  kr:      { q: "genre:k-pop year:2024-2025", market: "KR" },
  pop:     { q: "genre:pop year:2024-2025",   market: "US" },
  kpop:    { q: "genre:k-pop",               market: "KR" },
  indie:   { q: "genre:indie-pop",           market: "US" },
  hiphop:  { q: "genre:hip-hop",             market: "US" },
  rnb:     { q: "genre:r-n-b",               market: "US" },
  jazz:    { q: "genre:jazz",                market: "US" },
  dance:   { q: "genre:dance",               market: "US" },
  jpop:    { q: "genre:j-pop",               market: "JP" },
  ost:     { q: "genre:soundtrack",          market: "US" },
  classic: { q: "genre:classical",           market: "US" },
};

export async function getChart(chartKey = "global", limit = 25) {
  const cfg = GENRE_QUERIES[chartKey] || GENRE_QUERIES.global;
  const data = await sp({ type: "search", q: cfg.q, market: cfg.market, limit });
  return (data.tracks?.items || []).map(formatTrack);
}

// ── 최신 신보 ─────────────────────────────────────────────────
export async function getNewReleases(limit = 10, country = "KR") {
  const data = await sp({ type: "new-releases", country, limit });
  return (data.albums?.items || []).map(formatAlbum);
}

// ── 검색 ──────────────────────────────────────────────────────
export async function searchMusic(query, market = "KR") {
  const data = await sp({ type: "search", q: query, market, limit: 15 });
  return {
    tracks:  (data.tracks?.items  || []).map(formatTrack),
    albums:  (data.albums?.items  || []).map(formatAlbum),
    artists: (data.artists?.items || []).map(formatArtist),
  };
}

// ── 앨범 수록곡 ───────────────────────────────────────────────
export async function getAlbumTracks(albumId) {
  const data = await sp({ type: "album", id: albumId });
  const tracks = (data.tracks?.items || []).map(tr => ({
    id: tr.id, spotifyId: tr.id,
    t: tr.name, ar: tr.artists?.map(a=>a.name).join(", ")||"",
    al: data.name||"",
    yr: data.release_date ? parseInt(data.release_date.slice(0,4)) : null,
    coverUrl: data.images?.[0]?.url||"",
    coverSmUrl: data.images?.[2]?.url||"",
    dur: msToTime(tr.duration_ms),
    genre:"", bpm:null, type:"album_track",
    trackNumber: tr.track_number,
    spotifyUrl: tr.external_urls?.spotify||"",
    rec:0, rt:0, g:0,
  }));
  return { ...formatAlbum(data), trackList: tracks };
}

// ── 비슷한 곡 ─────────────────────────────────────────────────
export async function getRecommendations(trackId, limit = 10) {
  const data = await sp({ type: "recommendations", id: trackId, limit });
  return (data.tracks || []).map(formatTrack);
}

// ── BPM 포함 곡 정보 ──────────────────────────────────────────
export async function getTrackWithFeatures(trackId) {
  const [track, features] = await Promise.all([
    sp({ type: "track", id: trackId }),
    sp({ type: "audio-features", id: trackId }).catch(() => ({})),
  ]);
  return {
    ...formatTrack(track),
    bpm: features.tempo ? Math.round(features.tempo) : null,
    energy: features.energy ? Math.round(features.energy * 100) : null,
  };
}

// ── 스트리밍 링크 ─────────────────────────────────────────────
export function getStreamingLinks(track) {
  const q = encodeURIComponent(`${track.t} ${track.ar}`);
  return [
    { name: "Spotify",       url: track.spotifyUrl || `https://open.spotify.com/search/${q}` },
    { name: "Apple Music",   url: `https://music.apple.com/kr/search?term=${q}` },
    { name: "YouTube Music", url: `https://music.youtube.com/search?q=${q}` },
    { name: "Melon",         url: `https://www.melon.com/search/total/index.htm?q=${q}` },
  ];
}

// ── 포맷 ──────────────────────────────────────────────────────
export function formatTrack(item) {
  if (!item) return null;
  return {
    id: item.id || String(Math.random()),
    spotifyId: item.id,
    collectionId: item.album?.id,
    t: item.name || "",
    ar: item.artists?.map(a=>a.name).join(", ") || "",
    al: item.album?.name || "",
    yr: item.album?.release_date ? parseInt(item.album.release_date.slice(0,4)) : null,
    coverUrl: item.album?.images?.[0]?.url || "",
    coverSmUrl: item.album?.images?.[2]?.url || "",
    spotifyUrl: item.external_urls?.spotify || "",
    dur: msToTime(item.duration_ms || 0),
    genre: "", bpm: null,
    popularity: item.popularity || 0,
    type: item.album?.album_type === "single" ? "싱글" : "앨범 수록곡",
    altype: item.album?.album_type || "앨범",
    rec:0, rt:0, g:0,
  };
}

export function formatAlbum(item) {
  if (!item) return null;
  return {
    id: item.id || String(Math.random()),
    spotifyId: item.id,
    t: item.name || "",
    ar: item.artists?.map(a=>a.name).join(", ") || "",
    yr: item.release_date ? parseInt(item.release_date.slice(0,4)) : null,
    coverUrl: item.images?.[0]?.url || "",
    coverSmUrl: item.images?.[2]?.url || "",
    spotifyUrl: item.external_urls?.spotify || "",
    altype: item.album_type || "앨범",
    label: item.label || "",
    genre: item.genres?.join(", ") || "",
    tracks: item.total_tracks || 0,
    dur:"", trackList:[],
    rec:0, rt:0, g:0,
  };
}

export function formatArtist(item) {
  if (!item) return null;
  return {
    id: item.id,
    name: item.name || "",
    coverUrl: item.images?.[0]?.url || "",
    genres: item.genres || [],
    popularity: item.popularity || 0,
    spotifyUrl: item.external_urls?.spotify || "",
  };
}

function msToTime(ms) {
  if (!ms) return "";
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000).toString().padStart(2, "0");
  return `${min}:${sec}`;
}
