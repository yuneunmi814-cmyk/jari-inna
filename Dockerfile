# syntax=docker/dockerfile:1.7
#
# 시티드 백엔드 (Express + TypeScript) Fly.io 배포용
# 빌드 컨텍스트: 프로젝트 루트 (~/jari-inna)
# 이유: server/ 가 ../shared/ 타입을 import 하므로 두 디렉토리 모두 컨텍스트에 포함 필요

# ─────────────────────────────────────────────────────────────
# 1) Builder — TypeScript 컴파일
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /repo

# 워크스페이스 매니페스트 먼저 복사 (캐시 최적화)
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY shared/package.json shared/package.json
COPY app/package.json app/package.json

# server + shared 만 필요. app 워크스페이스는 빌드 안 함.
# 워크스페이스 hoisting 이슈 회피용으로 server 만 빌드용 의존성 설치.
RUN npm ci --workspace=server --include-workspace-root --ignore-scripts

# 소스 복사 (shared 도 함께 — server 가 import)
COPY shared ./shared
COPY server ./server

# 빌드 → dist/server/src/index.js 생성
RUN npm run build --workspace=server

# ─────────────────────────────────────────────────────────────
# 2) Runtime — production 의존성만 + 빌드 결과물
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /repo

ENV NODE_ENV=production

# 패키지 매니페스트 + production deps 만 설치
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY shared/package.json shared/package.json
COPY app/package.json app/package.json
RUN npm ci --workspace=server --omit=dev --include-workspace-root --ignore-scripts

# 빌드 산출물 + shared 복사
COPY --from=builder /repo/server/dist ./server/dist
COPY --from=builder /repo/shared ./shared

# 디스크 캐시 디렉토리 — Fly volume 이 이 경로에 마운트됨
RUN mkdir -p /repo/server/.cache

# 서버는 process.cwd() 기준으로 .cache 경로를 잡으므로 server/ 에서 기동
WORKDIR /repo/server
EXPOSE 8080
ENV PORT=8080

# 빌드 출력 실제 경로: dist/server/src/index.js  (tsconfig rootDir=".." 영향)
CMD ["node", "dist/server/src/index.js"]
