// src/music.js
// iTunes Search API — 무료, API 키 없음, 가입 불필요
// App.jsx에서 import { searchMusic, getAlbumTracks, getRecommendations } from './music.js'

const ITUNES = "https://itunes.apple.com";
const CORS = "https://corsproxy.io/?";

async function itunesFetch(url) {
  const res = await fetch(CORS + encodeURIComponent(url));
  if (!res.ok) throw new Error("음악 데이터를 불러오지 못했어요");
  return res.json();
}

// ── 검색 (곡 + 앨범) ─────────────────────────────────────────
// 사용: const { tracks, albums } = await searchMusic("아이유")
export async function searchMusic(query) {
  const [trackData, albumData] = await Promise.all([
    itunesFetch(`${ITUNES}/search?term=${encodeURIComponent(query)}&country=KR&media=music&entity=song&limit=15`),
    itunesFetch(`${ITUNES}/search?term=${encodeURIComponent(query)}&country=KR&media=music&entity=album&limit=8`),
  ]);

  return {
    tracks: (trackData.results || []).map(formatTrack),
    albums: (albumData.results || []).map(formatAlbum),
  };
}

// ── 앨범 수록곡 가져오기 ──────────────────────────────────────
// 사용: const album = await getAlbumTracks(collectionId)
export async function getAlbumTracks(collectionId) {
  const data = await itunesFetch(
    `${ITUNES}/lookup?id=${collectionId}&entity=song&country=KR`
  );
  const items = data.results || [];
  const albumInfo = items.find((i) => i.wrapperType === "collection");
  const tracks = items
    .filter((i) => i.wrapperType === "track")
    .sort((a, b) => a.trackNumber - b.trackNumber)
    .map(formatTrack);

  if (albumInfo) {
    return { ...formatAlbum(albumInfo), trackList: tracks };
  }
  return { trackList: tracks };
}

// ── 비슷한 곡 (같은 아티스트 곡들) ──────────────────────────
// 사용: const recs = await getRecommendations("아이유")
export async function getRecommendations(artistName) {
  const data = await itunesFetch(
    `${ITUNES}/search?term=${encodeURIComponent(artistName)}&country=KR&media=music&entity=song&limit=10`
  );
  return (data.results || []).map(formatTrack);
}

// ── 최신 K-Pop 차트 ───────────────────────────────────────────
export async function getKpopChart() {
  const data = await itunesFetch(
    `${ITUNES}/search?term=kpop+2024&country=KR&media=music&entity=song&limit=20`
  );
  return (data.results || []).map(formatTrack);
}

// ── 장르별 탐색 ───────────────────────────────────────────────
export async function searchByGenre(genre) {
  const genreMap = {
    "K-Pop": "kpop",
    "인디": "korean indie",
    "재즈": "jazz",
    "팝": "pop 2024",
    "클래식": "classical",
    "OST": "korean ost drama",
    "힙합": "korean hiphop",
    "R&B": "korean rnb",
  };
  const query = genreMap[genre] || genre;
  const data = await itunesFetch(
    `${ITUNES}/search?term=${encodeURIComponent(query)}&country=KR&media=music&entity=song&limit=15`
  );
  return (data.results || []).map(formatTrack);
}

// ── 데이터 포맷 변환 ─────────────────────────────────────────
export function formatTrack(item) {
  if (!item) return null;
  return {
    id: String(item.trackId || item.collectionId),
    itunesId: item.trackId,
    collectionId: item.collectionId,
    t: item.trackName || item.collectionName || "",
    ar: item.artistName || "",
    al: item.collectionName || "",
    yr: item.releaseDate ? parseInt(item.releaseDate.slice(0, 4)) : null,
    coverUrl: item.artworkUrl100?.replace("100x100", "400x400") || "",
    coverSmUrl: item.artworkUrl100 || "",
    itunesUrl: item.trackViewUrl || item.collectionViewUrl || "",
    dur: msToTime((item.trackTimeMillis || 0)),
    genre: item.primaryGenreName || "",
    bpm: null,
    type: item.collectionType === "Single" ? "싱글" : "앨범 수록곡",
    altype: item.collectionType || "앨범",
    rec: 0,
    rt: 0,
    g: 0,
  };
}

export function formatAlbum(item) {
  if (!item) return null;
  return {
    id: String(item.collectionId),
    itunesId: item.collectionId,
    t: item.collectionName || "",
    ar: item.artistName || "",
    yr: item.releaseDate ? parseInt(item.releaseDate.slice(0, 4)) : null,
    coverUrl: item.artworkUrl100?.replace("100x100", "400x400") || "",
    coverSmUrl: item.artworkUrl100 || "",
    itunesUrl: item.collectionViewUrl || "",
    altype: item.collectionType || "앨범",
    label: item.copyright || "",
    genre: item.primaryGenreName || "",
    tracks: item.trackCount || 0,
    dur: "",
    trackList: [],
    rec: 0,
    rt: 0,
    g: 0,
  };
}

// ── 커버 이미지 스타일 ────────────────────────────────────────
const GR = [
  ["#3B1F6B","#5B2D8E"],["#1A1A4E","#2D2D8B"],["#1F3A1F","#2D6B2D"],
  ["#3A1A1A","#6B2D2D"],["#1A2A3A","#2D4A6B"],["#2A1A3A","#4A2D6B"],
  ["#1A3A2A","#2D6B4A"],["#3A2A1A","#6B4A2D"],
];

export function getCoverStyle(item) {
  if (item?.coverUrl) {
    return {
      backgroundImage: `url(${item.coverUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  const g = item?.g || 0;
  return {
    background: `linear-gradient(145deg,${GR[g%8][0]},${GR[g%8][1]})`,
  };
}

// ── 외부 링크 생성 ────────────────────────────────────────────
// 곡 상세 페이지 "듣기" 버튼용
export function getStreamingLinks(track) {
  const q = encodeURIComponent(`${track.t} ${track.ar}`);
  return [
    { name: "Apple Music", url: track.itunesUrl || `https://music.apple.com/kr/search?term=${q}` },
    { name: "YouTube Music", url: `https://music.youtube.com/search?q=${q}` },
    { name: "Melon", url: `https://www.melon.com/search/total/index.htm?q=${q}` },
    { name: "Spotify", url: `https://open.spotify.com/search/${q}` },
  ];
}

function msToTime(ms) {
  if (!ms) return "";
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000).toString().padStart(2, "0");
  return `${min}:${sec}`;
}
