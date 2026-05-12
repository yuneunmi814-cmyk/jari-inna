// DNS 서버 명시 — 시스템 기본(KT 168.126.63.x) 우회
//
// 문제: KT DNS의 1차 서버가 KRIC 같은 .go.kr 도메인에 일시적 SERVFAIL을 자주 반환.
//       Node의 dns 모듈은 1차 실패 시 2차로 자동 fallback이 안정적이지 않아 ENOTFOUND 발생.
//
// 해결: Node 프로세스 시작 시점에 DNS 서버 순서를 명시.
//       Google(8.8.8.8) + Cloudflare(1.1.1.1)를 우선시 → KT 도메인이라도 안정 lookup.
//       KT DNS는 fallback으로만 두면 안정성 + 한국 국내 도메인 호환 모두 보장.
//
// ⚠️ 반드시 index.ts의 가장 첫 import로 (config/env보다도 먼저).
//    그래야 axios/iconv 등 다른 모듈이 import될 때 이미 DNS 설정 적용됨.

import dns from "dns";

const DESIRED_SERVERS = [
  "8.8.8.8",        // Google primary
  "1.1.1.1",        // Cloudflare primary
  "8.8.4.4",        // Google secondary
  "1.0.0.1",        // Cloudflare secondary
  "168.126.63.1",   // KT 1차 (fallback)
  "168.126.63.2",   // KT 2차 (fallback)
];

try {
  const before = dns.getServers();
  dns.setServers(DESIRED_SERVERS);
  console.log("[dns] DNS 서버 변경:");
  console.log("  이전:", before.join(", "));
  console.log("  현재:", dns.getServers().join(", "));
} catch (err) {
  // 일부 OS/환경에서 setServers가 막힐 수 있음 — 무시
  console.warn("[dns] setServers 실패:", err instanceof Error ? err.message : err);
}
