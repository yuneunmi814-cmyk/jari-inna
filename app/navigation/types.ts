// React Navigation 타입 정의
// 새 스크린 추가 시 여기에 등록 → 자동완성 + 타입 안전성 확보

export type RootStackParamList = {
  Home: undefined;
  StationPicker: undefined;
  Favorites: undefined;
};

// 글로벌 declare로 useNavigation 등에서 자동 추론 가능
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
