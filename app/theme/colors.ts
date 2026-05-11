// 자리있나 다크모드 컬러 시스템
// 모든 화면은 이 팔레트만 참조한다 — 하드코딩 #색상 금지

export const colors = {
  // === Brand ===
  primary: "#0052A4",   // 4호선 블루 (서울교통공사 공식)
  accent: "#00C8F0",    // 밝은 시안 (강조/CTA)

  // === Background Layers ===
  background: "#0F1419", // 앱 전체 배경 (거의 검정)
  surface: "#1A2332",    // 카드, 입력창 등 한 단계 위 표면
  surfaceElevated: "#202B40", // 한 단계 더 위 (모달/팝업 등)
  border: "#252B3F",     // 분할선/테두리

  // === Text ===
  textPrimary: "#FFFFFF",
  textSecondary: "#8E9AAF", // 보조 텍스트/라벨
  textTertiary: "#5C6478",  // 더 약한 텍스트 (placeholder 등)

  // === Semantic ===
  success: "#4ADE80",
  warning: "#FBBF24",
  danger: "#F87171",

  // === Special ===
  overlay: "rgba(0,0,0,0.5)", // 모달 뒤 어둠
  transparent: "transparent",
} as const;

export type ColorKey = keyof typeof colors;
