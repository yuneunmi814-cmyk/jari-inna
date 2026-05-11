// 그림자 토큰
//
// 라이트 모드에서 카드를 배경과 분리하기 위해 사용.
// iOS/Android/Web 각각의 그림자 방식이 달라 Platform.select로 처리.
//
// 사용:
//   import { shadows } from "../theme/shadows";
//   styles.myCard = { ...shadows.card, backgroundColor: colors.surface, ... };
//
// ⚠️ shadowColor만 지정하고 elevation/shadowOpacity가 빠지면 그림자 없음.
// 안드로이드는 elevation, iOS는 shadow*, Web은 boxShadow.

import { Platform } from "react-native";

/**
 * card — 카드/리스트 아이템 기본 그림자
 * 0 2px 8px rgba(0,0,0,0.05)
 */
export const cardShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  android: {
    elevation: 2,
  },
  default: {
    // RN Web 및 그 외
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
}) as object;

/**
 * elevated — 떠 있는 버튼/모달/플로팅
 * 0 4px 12px rgba(0,0,0,0.08)
 */
export const elevatedShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  android: {
    elevation: 4,
  },
  default: {
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
}) as object;

export const shadows = {
  card: cardShadow,
  elevated: elevatedShadow,
};
