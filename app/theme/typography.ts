// 타이포그래피 스케일
// 시스템 폰트 사용 (RN 기본). weight는 string 리터럴로 — number 쓰면 안드로이드에서 무시되는 경우 있음

import { TextStyle } from "react-native";

export const typography = {
  // === 헤더 ===
  h1: { fontSize: 28, fontWeight: "700", lineHeight: 36 } as TextStyle, // 페이지 메인 타이틀
  h2: { fontSize: 24, fontWeight: "700", lineHeight: 32 } as TextStyle, // 섹션 헤더
  h3: { fontSize: 22, fontWeight: "600", lineHeight: 30 } as TextStyle, // 카드 메인 (예: 역 이름)

  // === 본문 ===
  bodyLg: { fontSize: 16, fontWeight: "400", lineHeight: 24 } as TextStyle,
  body: { fontSize: 15, fontWeight: "400", lineHeight: 22 } as TextStyle,

  // === 강조 본문 (시간 등 큰 숫자) ===
  display: { fontSize: 28, fontWeight: "700", lineHeight: 34 } as TextStyle,

  // === 보조 ===
  caption: { fontSize: 13, fontWeight: "400", lineHeight: 18 } as TextStyle,
  micro: { fontSize: 11, fontWeight: "500", lineHeight: 14, letterSpacing: 0.8 } as TextStyle,

  // === 버튼 텍스트 ===
  button: { fontSize: 15, fontWeight: "600", lineHeight: 20 } as TextStyle,
} as const;
