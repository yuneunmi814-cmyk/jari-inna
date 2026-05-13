# 시티드 앱 아이콘 - A 시안 최종 패키지

## 디자인
- 색상: `#00A4E4` (서울 4호선 공식 하늘색)
- 컨셉: 옆에서 본 앉아있는 사람 (단순 픽토그램)
- 컨셉 카피: "나는 앉아서 가고 싶다"

## 파일 구조 (Expo 표준)

| 파일 | 용도 | 위치 |
|---|---|---|
| `icon.png` (1024x1024) | iOS App Store 제출용 + Expo 메인 | `app/assets/icon.png` |
| `adaptive-icon.png` (1024x1024) | Android adaptive foreground | `app/assets/adaptive-icon.png` |
| `splash.png` (1284x2778) | 스플래시 스크린 | `app/assets/splash.png` |
| `favicon.png` (48x48) | 웹 | `app/assets/favicon.png` |
| `icon.svg` | 벡터 원본 (수정용) | 별도 보관 |

## app.json 설정

```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "backgroundColor": "#00A4E4"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#00A4E4"
      }
    },
    "ios": {
      "icon": "./assets/icon.png"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
```

## 적용 명령 (Claude Code 위임용)

```
시티드 앱 아이콘 적용 부탁합니다.

작업:
1. 다운로드 받은 4개 파일을 app/assets/로 복사
   - icon.png → app/assets/icon.png (기존 파일 덮어쓰기)
   - adaptive-icon.png → app/assets/adaptive-icon.png
   - splash.png → app/assets/splash.png
   - favicon.png → app/assets/favicon.png

2. app.json 또는 app.config.js 확인하고 위 경로 정확한지 검증
   특히 splash backgroundColor와 adaptiveIcon backgroundColor가 
   "#00A4E4"인지 확인

3. 다음 EAS 빌드 시 새 아이콘으로 빌드되도록 설정 확인

4. 커밋: "feat: 앱 아이콘 적용 (시티드 옆모습 픽토그램, 4호선 하늘색)"
```
