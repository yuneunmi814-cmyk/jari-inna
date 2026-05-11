// 8pt 그리드 기반 간격 시스템
// 가능한 한 이 값들만 사용 — 임의의 숫자(예: 7, 13) 쓰지 말기

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

// 자주 쓰는 radius
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;
