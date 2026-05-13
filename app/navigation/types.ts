// React Navigation 타입 정의
// 새 스크린 추가 시 여기에 등록 → 자동완성 + 타입 안전성 확보

/**
 * StationPicker 모드:
 *   - "departure"   (기본): 출발역 선택 → setStation
 *   - "destination":      도착역 선택 → setDestination
 */
export type StationPickerMode = "departure" | "destination";

export type RootStackParamList = {
  Home: undefined;
  StationPicker: { mode?: StationPickerMode } | undefined;
  Favorites: undefined;
  Recommendation: undefined; // Phase 1: Context에서 출발/도착/방면 읽음. param 안 받음.
  Settings: undefined;
};

// 글로벌 declare로 useNavigation 등에서 자동 추론 가능
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
