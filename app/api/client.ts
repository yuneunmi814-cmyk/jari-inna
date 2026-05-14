// 백엔드 API 클라이언트
// EXPO_PUBLIC_API_URL 환경 변수에서 base URL을 읽어 axios 인스턴스 생성
// 친근한 한국어 에러 메시지로 변환해서 화면에 그대로 보여줄 수 있게 함
//
// IP 변경 안전망 (Web 한정):
//   .env에 박힌 192.168.x.x IP가 DHCP 갱신으로 바뀌어도 web 빌드는 안 깨지게,
//   web 환경에선 IP를 자동으로 'localhost'로 치환.
//   (Expo Go 모바일은 다른 디바이스라 localhost로는 못 닿음 → IP 그대로 사용)

import axios, { AxiosError } from "axios";
import { Platform } from "react-native";

// EAS production 빌드 시 EXPO_PUBLIC_API_URL 인라인이 누락되는 케이스 안전망:
// 환경변수가 빈 상태로 빌드되면 axios baseURL 이 비어 ERR_NETWORK 발생.
// Fly.io production URL 을 하드코딩 fallback 으로 두어 dev/prod 모두 동작 보장.
const RAW = process.env.EXPO_PUBLIC_API_URL ?? "https://seated-yoon.fly.dev";

/**
 * 웹은 같은 머신에서 도니까 IP → localhost 자동 치환.
 * 모바일(iOS/Android)은 별도 디바이스라 IP 보존.
 */
function resolveBaseURL(raw: string): string {
  if (!raw) return raw;
  if (Platform.OS === "web") {
    return raw.replace(/\/\/(\d+\.\d+\.\d+\.\d+)/, "//localhost");
  }
  return raw;
}

const BASE_URL = resolveBaseURL(RAW);

if (!BASE_URL) {
  console.warn(
    "[api/client] EXPO_PUBLIC_API_URL이 설정되지 않았습니다. " +
      "app/.env 파일에 EXPO_PUBLIC_API_URL=http://본인IP:3000 을 추가하세요."
  );
} else if (Platform.OS === "web" && BASE_URL !== RAW) {
  console.log(
    `[api/client] Web 환경 감지 — IP를 localhost로 치환: ${RAW} → ${BASE_URL}`
  );
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, // 10초 — 4G/5G 환경 여유
});

/**
 * 사용자에게 그대로 보여줄 수 있는 친근한 에러
 * 화면에서 catch한 뒤 .message만 꺼내 쓰면 됨
 */
export class FriendlyApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "FriendlyApiError";
  }
}

/**
 * axios 에러를 친근한 한국어 메시지로 변환
 * 출퇴근길 사용자가 보고 당황하지 않도록 — 위트 살짝 가미
 */
export function toFriendlyError(err: unknown): FriendlyApiError {
  if (!(err instanceof Error)) {
    return new FriendlyApiError("어라, 잠깐만요. 알 수 없는 문제예요", "UNKNOWN", err);
  }

  const ae = err as AxiosError<any>;

  // 네트워크 단절 / 서버 응답 없음
  if (ae.code === "ECONNABORTED" || ae.message.includes("timeout")) {
    return new FriendlyApiError(
      "지하철보다 느린 통신이네요. 다시 한번 시도해볼까요?",
      "TIMEOUT",
      err
    );
  }
  if (ae.code === "ERR_NETWORK" || ae.message.includes("Network")) {
    return new FriendlyApiError(
      "인터넷 연결을 확인해주세요. Wi-Fi나 데이터가 잘 잡혔나요?",
      "NETWORK",
      err
    );
  }

  // 서버 응답이 왔는데 4xx/5xx
  if (ae.response) {
    const status = ae.response.status;
    const serverMsg = ae.response.data?.error?.message;

    if (status === 502 || status === 503) {
      return new FriendlyApiError(
        "잠깐, 서울시 지하철 정보 서버가 졸고 있나봐요. 곧 깨워볼게요",
        "UPSTREAM_DOWN",
        err
      );
    }
    if (status === 404) {
      return new FriendlyApiError(
        serverMsg ?? "그런 정보는 못 찾았어요",
        "NOT_FOUND",
        err
      );
    }
    if (status >= 500) {
      return new FriendlyApiError(
        "어라, 우리 쪽에서 문제가 났어요. 잠시 후 다시 시도해주세요",
        "SERVER_ERROR",
        err
      );
    }
    if (status >= 400) {
      return new FriendlyApiError(
        serverMsg ?? "요청에 문제가 있어요",
        "CLIENT_ERROR",
        err
      );
    }
  }

  return new FriendlyApiError(
    "이상한 일이 일어났어요. 한 번 더 시도해주세요",
    "UNKNOWN",
    err
  );
}
