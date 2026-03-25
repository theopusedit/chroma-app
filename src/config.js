// ================================================================
// CHROMA CONFIG — 여기서 모든 걸 수정하세요
// 코드 구조는 건드리지 않아도 됩니다
// ================================================================

export const CONFIG = {

  // ── 서비스 기본 정보 ──────────────────────────────────────────
  service: {
    name: "CHROMA",
    tagline: "당신이 들은 모든 음악의 기억",
    description: "스트리밍이 아닌, 기억.\n곡과 앨범을 기록하고\n음악으로 연결되는 공간",
    copyright: "© 2025 CHROMA",
    version: "1.0.0",
  },

  // ── 색상 ──────────────────────────────────────────────────────
  // 아래 색상 코드만 바꾸면 전체 색상이 바뀌어요
  colors: {
    primary: "#8B5CF6",      // 메인 보라색 — 버튼, 강조색
    primary2: "#7C3AED",     // 진한 보라
    primaryLight: "#EDE9FE", // 연한 보라 (라이트모드 배경)
    primaryDark: "#4C1D95",  // 아주 진한 보라
    red: "#FF3B30",          // 경고/삭제
    green: "#34C759",        // 성공/완료
    gold: "#FFD60A",         // 별점
  },

  // ── 폰트 ──────────────────────────────────────────────────────
  fonts: {
    // Google Fonts나 다른 폰트로 바꾸고 싶으면 여기를 수정하세요
    import: "@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css');",
    family: "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
  },

  // ── 이미지 / 배너 ─────────────────────────────────────────────
  // 이미지를 imgur.com이나 다른 곳에 올리고 URL을 여기에 붙여넣으세요
  images: {
    logo: "",               // 로고 이미지 URL (비워두면 텍스트 로고 사용)
    heroBanner: "",         // 홈 히어로 배너 이미지 URL
    ogImage: "",            // SNS 공유 시 보이는 이미지 URL
  },

  // ── 랜딩 페이지 텍스트 ────────────────────────────────────────
  landing: {
    badge: "♪ 음악 아카이브 서비스",
    heroTitle: ["당신이 들은", "모든 음악의"],
    heroHighlight: "기억",                    // 보라색 강조 단어
    ctaPrimary: "무료로 시작하기",
    ctaSecondary: "로그인",
    ctaNote: "신용카드 불필요 · 영구 무료 플랜",

    // 통계 수치
    stats: [
      { number: "24만+", label: "곡 기록됨" },
      { number: "3.2만", label: "활성 유저" },
      { number: "4.8★", label: "평균 평점" },
    ],

    // 기능 소개 카드
    features: [
      { icon: "♪", title: "기록하다", desc: "들은 곡·앨범을 날짜, 별점, 감상과 함께 아카이브" },
      { icon: "◈", title: "큐레이션하다", desc: "상황과 감정에 맞는 나만의 리스트 구성" },
      { icon: "◎", title: "연결하다", desc: "비슷한 취향의 사람들과 음악적 감성 공유" },
      { icon: "↑", title: "발견하다", desc: "랭킹, 차트, 시대별 명곡으로 새 음악 탐색" },
    ],
  },

  // ── 요금제 ────────────────────────────────────────────────────
  pricing: {
    monthly: "월 3,900원",
    yearly: "연 29,000원",
    yearlyMonthly: "월 2,417원",          // 연간 결제 시 월 환산
    yearlySaving: "38% 절약",
    freePlanLimit: "월 30개",             // 무료 플랜 기록 제한

    freePlanFeatures: [
      "월 30개 기록",
      "보관함 3개",
      "리스트 3개",
      "커뮤니티 기본",
    ],

    proPlanFeatures: [
      "무제한 기록",
      "무제한 보관함·리스트",
      "연간 리포트",
      "광고 없음",
      "맞춤 추천",
    ],
  },

  // ── 준비중 메시지 ─────────────────────────────────────────────
  // 아직 완성되지 않은 기능에 표시되는 문구
  comingSoon: {
    payment: "결제 기능은 곧 오픈돼요 🎵",
    paymentSub: "오픈 알림을 받으시려면 이메일을 남겨주세요",
    social: "소셜 기능을 준비 중이에요",
    search: "더 강력한 검색 기능을 준비 중이에요",
  },

  // ── 홈 화면 ───────────────────────────────────────────────────
  home: {
    greeting: "좋은 저녁이에요 👋",      // 나중에 시간대별로 자동화 가능
    todayPick: {
      label: "오늘의 추천",
      trackTitle: "밤편지",
      artist: "아이유",
      album: "Palette",
      year: 2017,
      gradientIndex: 1,                   // 0-7 사이 숫자 (커버 색상)
    },
  },

  // ── 링크 ──────────────────────────────────────────────────────
  links: {
    terms: "#",                           // 이용약관 페이지 URL
    privacy: "#",                         // 개인정보처리방침 URL
    instagram: "",                        // 인스타그램 URL
    twitter: "",                          // 트위터 URL
    email: "",                            // 문의 이메일
  },

  // ── 외부 음악 서비스 ──────────────────────────────────────────
  // 곡 상세 페이지에서 보여주는 외부 링크들
  streamingLinks: ["Spotify", "YouTube Music", "Melon", "Apple Music"],

};

// ── 다크/라이트 테마 색상 ─────────────────────────────────────
// 이 부분은 건드리지 않는 것을 추천해요
export const THEME = (dark) => ({
  bg:   dark ? "#000000" : "#FFFFFF",
  sf:   dark ? "#1C1C1E" : "#F5F5F5",
  sf2:  dark ? "#2C2C2E" : "#EBEBEB",
  sf3:  dark ? "#3A3A3C" : "#E0E0E0",
  bd:   dark ? "#38383A" : "#E0E0E0",
  tx:   dark ? "#FFFFFF" : "#000000",
  tx2:  dark ? "#98989D" : "#6E6E73",
  tx3:  dark ? "#545456" : "#AEAEB2",
  ac:   CONFIG.colors.primary,
  ac2:  dark ? CONFIG.colors.primaryDark : CONFIG.colors.primaryLight,
});
