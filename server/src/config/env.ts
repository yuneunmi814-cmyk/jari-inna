// 환경 변수 로더 — 반드시 다른 import보다 먼저 실행되어야 한다.
// 별도 모듈로 분리한 이유:
//   index.ts에서 `dotenv.config()`를 본문에서 호출하면 import 호이스팅 때문에
//   다른 모듈이 먼저 로드되어 process.env가 비어있는 상태로 캡처될 수 있다.
//   이 파일을 index.ts의 *첫 번째 import*로 두면, 다른 모듈 로드 전에 .env가 적용된다.

import dotenv from "dotenv";
import path from "path";

const envPath = path.resolve(__dirname, "../../../.env");
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn(`[env] .env 로드 실패: ${envPath}`);
  console.warn(`[env] 원인: ${result.error.message}`);
} else {
  const loadedKeys = Object.keys(result.parsed ?? {});
  console.log(`[env] .env 로드 완료: ${envPath} (키 ${loadedKeys.length}개)`);
}
