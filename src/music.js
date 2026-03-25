// src/music.js — Spotify API 기반 (서버 프록시 경유)
const SP = "/api/spotify";

async function sp(params) {
  const url = SP + "?" + new URLSearchParams(params).toString();
  const res = await fetch(url);
  if (!res.ok) throw new Error("Spotify API 오류");
  return res.json();
}

// ── Spotify 차트 플레이리스트 ID ──────────────────────────────
const CHARTS = {
  global: "37i9dQZEVXbMDoHDwVN2tF",  // Global Top 50
  kr:     "37i9dQZEVXbNxXF4SkHj9F",  // Korea Top 50
  pop:    "37i9dQZF1DXarRysLJmuju",   // Pop Rising
  indie:  "37i9dQZF1DX2sUQwD7tbmL",  // Indie Pop
  kpop:   "37i9dQZF1DX9tPFwDMOaN1",  // K-Pop Hits
  hiphop: "37i9dQZF1DX0XUsuxWHRQd",  // Hip-Hop Central
  rnb:    "37i9dQZF1DX4SBhb3fqCJd",  // R&B Hits
  jazz:   "37i9dQZF1DXbITWG1ZJKYt",  // Jazz Classics
  dance:  "37i9dQZF1DXa2PvUpywmrr",  // Dance Hits
  jpop:   "37i9dQZF1DXafb0IuPwJyF",  // J-Pop Hits
  ost:    "37i9dQZF1DWZUAeYvs68zg",  // OST / Soundtracks
  classic:"37i9dQZF1DWWEJlAGA9gs0",  // Classical Essentials
};

// ── 실시간 차트 ────────────────────────────────────────────────
export async function getChart(chartKey = "global", limit = 25) {
  const playlistId = CHARTS[chartKey] || CHARTS.global;
  const data = await sp({ type: "charts", id: playlistId, limit });
  return (data.items || [])
    .filter(item => item?.track)
    .slice(0, limit)
    .map(item => formatTrack(item.track));
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
    tracks: (data.tracks?.items || []).map(formatTrack),
    albums: (data.albums?.items || []).map(formatAlbum),
    artists: (data.artists?.items || []).map(formatArtist),
  };
}

// ── 앨범 수록곡 ───────────────────────────────────────────────
export async function getAlbumTracks(albumId) {
  const data = await sp({ type: "album", id: albumId });
  const tracks = (data.tracks?.items || []).map((tr, i) => ({
    id: tr.id,
    spotifyId: tr.id,
    t: tr.name,
    ar: tr.artists?.map(a => a.name).join(", ") || "",
    al: data.name || "",
    yr: data.release_date ? parseInt(data.release_date.slice(0, 4)) : null,
    coverUrl: data.images?.[0]?.url || "",
    coverSmUrl: data.images?.[2]?.url || "",
    dur: msToTime(tr.duration_ms),
    genre: "",
    bpm: null,
    type: "album_track",
    trackNumber: tr.track_number,
    spotifyUrl: tr.external_urls?.spotify || "",
    rec: 0, rt: 0, g: 0,
  }));
  return {
    ...formatAlbum(data),
    trackList: tracks,
  };
}

// ── BPM 포함 곡 상세 ──────────────────────────────────────────
export async function getTrackWithFeatures(trackId) {
  const [track, features] = await Promise.all([
    sp({ type: "track", id: trackId }),
    sp({ type: "audio-features", id: trackId }).catch(() => ({})),
  ]);
  return {
    ...formatTrack(track),
    bpm: features.tempo ? Math.round(features.tempo) : null,
    energy: features.energy ? Math.round(features.energy * 100) : null,
    danceability: features.danceability ? Math.round(features.danceability * 100) : null,
  };
}

// ── 비슷한 곡 추천 ────────────────────────────────────────────
export async function getRecommendations(trackId, limit = 10) {
  const data = await sp({ type: "recommendations", id: trackId, limit });
  return (data.tracks || []).map(formatTrack);
}

// ── 아티스트 인기곡 ───────────────────────────────────────────
export async function getArtistTracks(artistId) {
  const data = await sp({ type: "artist-tracks", id: artistId });
  return (data.tracks || []).map(formatTrack);
}

// ── 스트리밍 링크 ─────────────────────────────────────────────
export function getStreamingLinks(track) {
  const q = encodeURIComponent(`${track.t} ${track.ar}`);
  return [
    { name: "Spotify", url: track.spotifyUrl || `https://open.spotify.com/search/${q}` },
    { name: "Apple Music", url: `https://music.apple.com/kr/search?term=${q}` },
    { name: "YouTube Music", url: `https://music.youtube.com/search?q=${q}` },
    { name: "Melon", url: `https://www.melon.com/search/total/index.htm?q=${q}` },
  ];
}

// ── 포맷 변환 ─────────────────────────────────────────────────
export function formatTrack(item) {
  if (!item) return null;
  return {
    id: item.id || String(Math.random()),
    spotifyId: item.id,
    collectionId: item.album?.id,
    t: item.name || "",
    ar: item.artists?.map(a => a.name).join(", ") || "",
    al: item.album?.name || "",
    yr: item.album?.release_date ? parseInt(item.album.release_date.slice(0, 4)) : null,
    coverUrl: item.album?.images?.[0]?.url || "",
    coverSmUrl: item.album?.images?.[2]?.url || "",
    spotifyUrl: item.external_urls?.spotify || "",
    itunesUrl: "",
    dur: msToTime(item.duration_ms || 0),
    genre: "",
    bpm: null,
    popularity: item.popularity || 0,
    type: item.album?.album_type === "single" ? "싱글" : "앨범 수록곡",
    altype: item.album?.album_type || "앨범",
    rec: 0, rt: 0, g: 0,
  };
}

export function formatAlbum(item) {
  if (!item) return null;
  return {
    id: item.id || String(Math.random()),
    spotifyId: item.id,
    t: item.name || "",
    ar: item.artists?.map(a => a.name).join(", ") || "",
    yr: item.release_date ? parseInt(item.release_date.slice(0, 4)) : null,
    coverUrl: item.images?.[0]?.url || "",
    coverSmUrl: item.images?.[2]?.url || "",
    spotifyUrl: item.external_urls?.spotify || "",
    itunesUrl: "",
    altype: item.album_type || "앨범",
    label: item.label || "",
    genre: item.genres?.join(", ") || "",
    tracks: item.total_tracks || 0,
    dur: "", trackList: [],
    rec: 0, rt: 0, g: 0,
  };
}

export function formatArtist(item) {
  if (!item) return null;
  return {
    id: item.id,
    spotifyId: item.id,
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
