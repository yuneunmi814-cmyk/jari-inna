// 자리있나 앱 진입점
// HomeScreen만 렌더링 (Phase 1 단일 화면). Phase 2부터 네비게이션 추가 예정.

import React from "react";
import HomeScreen from "./screens/HomeScreen";

export default function App() {
  return <HomeScreen />;
}
