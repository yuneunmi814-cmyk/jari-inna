# 시티드 Android 로컬 빌드 가이드

> EAS Free plan 한도 소진 시 또는 빠른 검증용으로 로컬에서 production AAB 를 빌드하는 절차.

## 사전 셋업 (한 번만)

### 1. JDK 17 설치
```bash
brew install openjdk@17
```

### 2. Android SDK command-line tools 다운로드
```bash
mkdir -p ~/Library/Android/sdk/cmdline-tools
cd ~/Library/Android/sdk/cmdline-tools
curl -sSL -o cmdline-tools.zip \
  "https://dl.google.com/android/repository/commandlinetools-mac-11076708_latest.zip"
unzip -q cmdline-tools.zip && mv cmdline-tools latest && rm cmdline-tools.zip
```

### 3. `~/.zshrc` 환경변수 설정
```bash
cat >> ~/.zshrc << 'EOF'

# 시티드 Android 로컬 빌드 환경
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
EOF
source ~/.zshrc
```

### 4. 필수 SDK 패키지 설치
```bash
yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"
```

### 5. EAS Keystore 다운로드 (한 번만, ~/jari-inna/app/credentials.json 에 보관)
```bash
cd ~/jari-inna/app
eas credentials
# Android → production → credentials.json → Download credentials.json
```
→ `credentials.json` + `credentials/android/keystore.jks` 생성됨 (gitignore 보호됨)

---

## 매 빌드마다 (Production AAB 생성)

### 1. expo prebuild (`android/` 네이티브 디렉토리 생성)
```bash
cd ~/jari-inna/app
npx expo prebuild --platform android --clean
```

### 2. `android/app/build.gradle` 의 signing config 패치
prebuild 가 만든 `android/app/build.gradle` 의 `signingConfigs` 와 `buildTypes.release` 를 다음과 같이 수정:

```groovy
signingConfigs {
    debug {
        storeFile file('debug.keystore')
        storePassword 'android'
        keyAlias 'androiddebugkey'
        keyPassword 'android'
    }
    release {
        // EAS keystore — Play Console 등록 서명 키 oT9KxOqspJ 와 동일
        // 비밀번호는 환경변수에서 읽음 (셸 히스토리 노출 방지)
        storeFile file(System.getenv("KEYSTORE_FILE") ?: "../../@eunmiyoon__jari-inna.jks")
        storePassword System.getenv("KEYSTORE_PASSWORD") ?: ""
        keyAlias System.getenv("KEY_ALIAS") ?: ""
        keyPassword System.getenv("KEY_PASSWORD") ?: ""
    }
}
buildTypes {
    debug {
        signingConfig signingConfigs.debug
    }
    release {
        signingConfig signingConfigs.release   // ← debug → release 로 변경
        // ... 나머지 그대로
    }
}
```

또한 `defaultConfig.versionCode` 가 Play Console 에 이미 업로드된 값보다 **높은지** 확인.
- EAS 가 카운터 9 까지 사용 + 로컬 v10 출시 완료 (2026-05)
- 다음 빌드부터는 11 이상

### 3. credentials.json 에서 비밀번호 자동 추출 + 환경변수 export
```bash
cd ~/jari-inna/app
eval $(node -e "
const c = require('./credentials.json').android.keystore;
const path = require('path').resolve('./credentials/android/keystore.jks');
const q = s => \"'\" + String(s).replace(/'/g, \"'\\\\''\") + \"'\";
console.log('export KEYSTORE_FILE=' + q(path));
console.log('export KEYSTORE_PASSWORD=' + q(c.keystorePassword));
console.log('export KEY_ALIAS=' + q(c.keyAlias));
console.log('export KEY_PASSWORD=' + q(c.keyPassword));
")
export EXPO_PUBLIC_API_URL=https://seated-yoon.fly.dev
```

### 4. AAB 빌드
```bash
cd ~/jari-inna/app/android
./gradlew bundleRelease --no-daemon
```

빌드 시간: 첫 빌드 ~10분, incremental ~2분.

### 5. 산출물 위치
```
~/jari-inna/app/android/app/build/outputs/bundle/release/app-release.aab
```

### 6. 검증 (선택)
```bash
# 서명 검증 (Play Console 등록 SHA1: 58:12:BD:BE:...)
keytool -list -v \
  -keystore ~/jari-inna/app/credentials/android/keystore.jks \
  -storepass "$KEYSTORE_PASSWORD" | grep "SHA1:"

# API URL 박힘 확인
unzip -p app/build/outputs/bundle/release/app-release.aab base/assets/index.android.bundle \
  | strings | grep -oE "https?://seated-yoon[^\"]*" | head -3
```

---

## 보안

- `credentials.json` 과 `credentials/` 디렉토리, `*.jks` 파일은 git ignore 됨 — **절대 커밋 금지**
- 비밀번호는 환경변수로만 전달 — 빌드 명령에 평문 노출 X
- AAB 자체는 공개 배포 OK (Play Store 업로드)

---

## EAS 클라우드 빌드와 비교

| 항목 | EAS Cloud | 로컬 |
|---|---|---|
| 빌드 시간 | 15~20분 | 첫 ~10분, 이후 ~2분 |
| 빌드 한도 | Free plan 월 30회 | 무제한 |
| 환경 셋업 | 0 (브라우저만) | JDK + SDK ~45분 |
| versionCode | EAS 카운터 자동 | app.json + build.gradle 수동 |
| 신뢰성 | EAS 인프라 의존 | 로컬 의존 |

v1.x 안정화 후엔 EAS 가 더 편하지만, 한도 막혔을 때 로컬이 backup.
