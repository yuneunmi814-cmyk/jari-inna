// 시티드 컬러 시스템 (라이트 모드 — 에르메스 오렌지 브랜드 + 4호선 블루 호선 컬러)
//
// 컬러 사용 가이드:
//   - primary / primary*    : 시티드 브랜드(오렌지) — 메인 CTA, 강조, 활성 상태
//   - accent                : 시각 강조(오렌지와 같은 값) — 포커스/활성 텍스트 등
//   - line4                 : 4호선 블루(#0052A4) — 호선 라벨/박스/노선 표시 전용
//   - line1~line9 (TBD)     : Phase 2 호선 확장 시 추가
//   - textPrimary/Secondary : 본문 텍스트
//   - success/warning/danger: 혼잡도 등 의미 컬러
//
// 두 팔레트가 정의돼 있고 아래 `export const colors` 한 줄로 활성 결정.
// 다크 롤백: `colors = darkPalette`로 한 줄만 교체. 다른 곳 손볼 필요 없음.

const lightPalette = {
  // === Brand (시티드 브랜드 오렌지 — 에르메스 톤) ===
  primary: "#FF6600",          // 메인 CTA 배경, 강조
  primaryHover: "#E55C00",     // hover/pressed (조금 진한 오렌지)
  primaryLight: "#FFF0E5",     // 옅은 오렌지 배경 (선택/활성 영역)
  primaryBorder: "#FFB380",    // 옅은 오렌지 보더
  accent: "#FF6600",           // 강조 텍스트/포커스 — primary와 같은 값(의미적 구분만)

  // === Subway Lines (호선 전용) ===
  line4: "#0052A4",            // 4호선 블루
  // line1: "#0D3692",         // 1호선 — Phase 2 추가 예정
  // line2: "#00A84D",         // 2호선
  // line3: "#EF7C1C",         // 3호선
  // line5: "#996CAC",         // 5호선
  // line6: "#CD7C2F",         // 6호선
  // line7: "#747F00",         // 7호선
  // line8: "#E6186C",         // 8호선
  // line9: "#BDB092",         // 9호선

  // === Background Layers ===
  background: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceElevated: "#F8F9FB",
  border: "#D0D5DD",
  divider: "#E0E4EA",

  // === Text ===
  textPrimary: "#1A1A1A",
  textSecondary: "#666666",
  textTertiary: "#999999",

  // === Semantic ===
  success: "#2ECC71",
  warning: "#F39C12",
  danger: "#E74C3C",

  // === Special ===
  overlay: "rgba(0,0,0,0.5)",
  ripplePrimary: "rgba(255,255,255,0.18)",
  rippleOnSurface: "rgba(0,0,0,0.06)",
  transparent: "transparent",
} as const;

/**
 * 다크 팔레트 — 보존만, 현재 비활성.
 * 롤백 시 아래 `colors` export를 darkPalette로 교체.
 */
const darkPalette = {
  primary: "#FF6600",
  primaryHover: "#E55C00",
  primaryLight: "#3A2010",
  primaryBorder: "#7A3F1F",
  accent: "#FF6600",

  line4: "#0052A4",

  background: "#0F1419",
  surface: "#1A2332",
  surfaceElevated: "#202B40",
  border: "#252B3F",
  divider: "#252B3F",

  textPrimary: "#FFFFFF",
  textSecondary: "#8E9AAF",
  textTertiary: "#5C6478",

  success: "#4ADE80",
  warning: "#FBBF24",
  danger: "#F87171",

  overlay: "rgba(0,0,0,0.5)",
  ripplePrimary: "rgba(255,255,255,0.12)",
  rippleOnSurface: "rgba(255,255,255,0.08)",
  transparent: "transparent",
} as const;

/** 활성 팔레트 — 현재: 라이트 */
export const colors = lightPalette;

export type ColorKey = keyof typeof lightPalette;
