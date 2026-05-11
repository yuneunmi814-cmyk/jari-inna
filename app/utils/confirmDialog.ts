// 크로스 플랫폼 확인 다이얼로그
//
// React Native의 Alert.alert는 web에서 동작하지 않음 (RNWeb은 Alert API polyfill 제공 안 함).
// 이 헬퍼는 web에서는 window.confirm, native에서는 Alert.alert를 사용.
//
// 사용 예:
//   confirmAlert({
//     title: "즐겨찾기 삭제",
//     message: "정말 삭제하시겠어요?",
//     confirmText: "삭제",
//     destructive: true,
//     onConfirm: () => removeRoute(id),
//   });

import { Alert, Platform } from "react-native";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /** true면 native에서 빨간 destructive 스타일 적용 */
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  /** 취소 시 호출 (선택) */
  onCancel?: () => void;
}

export function confirmAlert({
  title,
  message,
  confirmText = "확인",
  cancelText = "취소",
  destructive,
  onConfirm,
  onCancel,
}: ConfirmOptions): void {
  // Web: window.confirm — 단순 OK/Cancel 다이얼로그
  if (Platform.OS === "web") {
    const text = message ? `${title}\n\n${message}` : title;
    if (typeof window !== "undefined" && window.confirm(text)) {
      onConfirm();
    } else {
      onCancel?.();
    }
    return;
  }

  // iOS/Android: Alert.alert — 네이티브 다이얼로그
  Alert.alert(title, message, [
    { text: cancelText, style: "cancel", onPress: onCancel },
    {
      text: confirmText,
      style: destructive ? "destructive" : "default",
      onPress: onConfirm,
    },
  ]);
}
