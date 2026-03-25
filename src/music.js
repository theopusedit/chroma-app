// src/music.js — Apple RSS(차트) + Spotify(나머지)

async function rss(country, limit, type = "songs") {
  const res = await fetch(`/api/music?country=${country}&limit=${limit}&type=${type}`);
  if (!res.ok) throw new Error("RSS 오류");
  return res.json();
}

async function sp(params) {
  const url = "/api/spotify?" + new URLSearchParams(params).toString();
  const res = await fetch(url);
  // 429 rate limit
  if (res.status === 429) {
    console.warn("Spotify rate limited");
    return {};
  }
  if (!res.ok) throw new Error(`Spotify ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// ── 차트 (Apple RSS 실시간) ───────────────────────────────────
export async function getChart(country = "us", limit = 25) {
  const data = await rss(country, limit, "songs");
  return (data.feed?.results || []).map(formatRssTrack);
}

// ── 최신 앨범 (Spotify) ───────────────────────────────────────
export async function getNewReleases(limit = 10, country = "US") {
  const data = await sp({ type: "new-releases", country, limit });
  return (data.albums?.items || []).map(formatAlbum);
}

// ── 개인 맞춤 추천 (Spotify) ──────────────────────────────────
export async function getPersonalRecommendations(trackIds, limit = 20) {
  if (!trackIds?.length) return [];
  const seeds = trackIds.slice(0, 5).join(",");
  const data = await sp({ type: "recommendations", id: seeds, limit });
  return (data.tracks || []).map(formatTrack);
}

// ── 검색 (Spotify) ────────────────────────────────────────────
export async function searchMusic(query, market = "US") {
  const data = await sp({ type: "search", q: query, market, limit: 15 });
  return {
    tracks:  (data.tracks?.items  || []).map(formatTrack).filter(Boolean),
    albums:  (data.albums?.items  || []).map(formatAlbum).filter(Boolean),
    artists: (data.artists?.items || []).map(formatArtist).filter(Boolean),
  };
}

// ── 앨범 수록곡 (Spotify) ─────────────────────────────────────
export async function getAlbumTracks(albumId) {
  const data = await sp({ type: "album", id: albumId });
  const tracks = (data.tracks?.items || []).map(tr => ({
    id: tr.id, spotifyId: tr.id,
    t: tr.name,
    ar: tr.artists?.map(a => a.name).join(", ") || "",
    al: data.name || "",
    yr: data.release_date ? parseInt(data.release_date.slice(0,4)) : null,
    coverUrl: data.images?.[0]?.url || "",
    dur: msToTime(tr.duration_ms),
    genre: "", bpm: null, type: "album_track",
    trackNumber: tr.track_number,
    spotifyId: tr.id,
    collectionId: data.id,
    spotifyUrl: tr.external_urls?.spotify || "",
    rec: 0, rt: 0, g: 0,
  }));
  return { ...formatAlbum(data), trackList: tracks };
}

// ── BPM 포함 곡 (Spotify) ─────────────────────────────────────
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

// ── 비슷한 곡 (Spotify) ───────────────────────────────────────
export async function getRecommendations(trackId, limit = 10) {
  const data = await sp({ type: "recommendations", id: trackId, limit });
  return (data.tracks || []).map(formatTrack);
}

// ── 아티스트 정보 (Spotify) ───────────────────────────────────
export async function getArtistInfo(artistId) {
  const [artist, tracks, albums] = await Promise.all([
    sp({ type: "artist", id: artistId }),
    sp({ type: "artist-tracks", id: artistId }),
    sp({ type: "artist-albums", id: artistId }),
  ]);
  return {
    ...formatArtist(artist),
    topTracks: (tracks.tracks || []).map(formatTrack),
    albums: (albums.items || []).map(formatAlbum),
    related: [],
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

// ── RSS 포맷 ──────────────────────────────────────────────────
function formatRssTrack(item) {
  return {
    id: String(item.id || Math.random()),
    spotifyId: null,
    t: item.name || "",
    ar: item.artistName || "",
    al: item.albumName || "",
    yr: item.releaseDate ? parseInt(item.releaseDate.slice(0,4)) : null,
    coverUrl: item.artworkUrl100?.replace("100x100bb","600x600bb") || "",
    itunesUrl: item.url || "",
    spotifyUrl: "",
    dur: "", genre: item.genreName || "",
    bpm: null, type: "album_track",
    rec: 0, rt: 0, g: 0,
  };
}

// ── Spotify 포맷 ──────────────────────────────────────────────
export function formatTrack(item) {
  if (!item || !item.id) return null;
  return {
    id: item.id,
    spotifyId: item.id,
    collectionId: item.album?.id,
    t: item.name || "",
    ar: item.artists?.map(a => a.name).join(", ") || "",
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
    rec: 0, rt: 0, g: 0,
  };
}

export function formatAlbum(item) {
  if (!item || !item.id) return null;
  return {
    id: item.id,
    spotifyId: item.id,
    t: item.name || "",
    ar: item.artists?.map(a => a.name).join(", ") || "",
    yr: item.release_date ? parseInt(item.release_date.slice(0,4)) : null,
    coverUrl: item.images?.[0]?.url || "",
    spotifyUrl: item.external_urls?.spotify || "",
    altype: item.album_type || "앨범",
    label: item.label || "",
    genre: item.genres?.join(", ") || "",
    tracks: item.total_tracks || 0,
    dur: "", trackList: [],
    rec: 0, rt: 0, g: 0,
  };
}

export function formatArtist(item) {
  if (!item || !item.id) return null;
  return {
    id: item.id,
    spotifyId: item.id,
    name: item.name || "",
    coverUrl: item.images?.[0]?.url || "",
    genres: item.genres || [],
    popularity: item.popularity || 0,
    followers: item.followers?.total || 0,
    spotifyUrl: item.external_urls?.spotify || "",
  };
}

function msToTime(ms) {
  if (!ms) return "";
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000).toString().padStart(2, "0");
  return `${min}:${sec}`;
}
