// 백엔드 API 클라이언트
// EXPO_PUBLIC_API_URL 환경 변수에서 base URL을 읽어 axios 인스턴스 생성
// 친근한 한국어 에러 메시지로 변환해서 화면에 그대로 보여줄 수 있게 함

import axios, { AxiosError } from "axios";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!BASE_URL) {
  // 개발 환경 안내 — 빌드 시점에 미설정이면 콘솔에 경고
  console.warn(
    "[api/client] EXPO_PUBLIC_API_URL이 설정되지 않았습니다. " +
      "app/.env 파일에 EXPO_PUBLIC_API_URL=http://본인IP:3000 을 추가하세요."
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
