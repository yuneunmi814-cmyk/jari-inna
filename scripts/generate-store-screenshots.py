#!/usr/bin/env python3
"""
Play Store 스크린샷 생성기
- 입력: ~/jari-inna/docs/screenshots/final/  (1080x2340)
- 출력: ~/jari-inna/docs/screenshots/store/  (1080x1920)
- 상단 25%: 시티드 컬러(#00A4E4) 배경 + 헤드라인/서브 카피
- 하단 75%: 흰색 배경 + 원본 스크린샷 (부드러운 그림자)

사용법:
  python3 generate-store-screenshots.py

카피 수정은 아래 COPIES 변수만 바꾸면 됩니다.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ─────────────────────────────────────────────────────────────
# 설정
# ─────────────────────────────────────────────────────────────
HOME = Path.home()
SRC_DIR = HOME / "jari-inna/docs/screenshots/final"
OUT_DIR = HOME / "jari-inna/docs/screenshots/store"

OUT_W, OUT_H = 1080, 1920
TOP_H = int(OUT_H * 0.25)          # 480
BOTTOM_H = OUT_H - TOP_H            # 1440

BG_BLUE = (0, 164, 228)             # #00A4E4 시티드 색
BG_WHITE = (255, 255, 255)
TEXT_WHITE = (255, 255, 255)

H_PADDING = 60                      # 좌우 패딩

HEADLINE_MAX_SIZE = 88
HEADLINE_MIN_SIZE = 56
SUB_SIZE = 40
LINE_GAP = 24                       # 헤드라인-서브 사이 간격

# macOS Apple SD Gothic Neo .ttc 컬렉션 인덱스
FONT_PATH = "/System/Library/Fonts/AppleSDGothicNeo.ttc"
FONT_INDEX_BOLD = 6                 # Bold
FONT_INDEX_REGULAR = 3              # Regular

# ─────────────────────────────────────────────────────────────
# 카피 (5장)
# ─────────────────────────────────────────────────────────────
COPIES = [
    {
        "src": "01-home-gps-auto.jpeg",
        "out": "01-store.png",
        "headline": "아, 앉아서 가고 싶다.",
        "sub": "매일 그렇게 외쳤다면.",
    },
    {
        "src": "02-station-picker-line-filter.jpeg",
        "out": "02-store.png",
        "headline": "출발역 한 번 정하면 끝.",
        "sub": "전국 987개 역, 호선별 검색",
    },
    {
        "src": "03-car-congestion-recommendation.jpeg",
        "out": "03-store.png",
        "headline": "이 칸이 가장 한산해요.",
        "sub": "1~10호차 실시간 추천",
    },
    {
        "src": "04-transfer-guide.jpeg",
        "out": "04-store.png",
        "headline": "환승도 한 번에.",
        "sub": "어느 칸에서 갈아탈지 미리",
    },
    {
        "src": "05-gps-permission.jpeg",
        "out": "05-store.png",
        "headline": "위치로 자동 선택.",
        "sub": "출퇴근 시간엔 알아서",
    },
]


def load_font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    idx = FONT_INDEX_BOLD if bold else FONT_INDEX_REGULAR
    return ImageFont.truetype(FONT_PATH, size, index=idx)


def fit_headline_font(text: str, max_width: int) -> ImageFont.FreeTypeFont:
    """헤드라인이 좌우 패딩 안에 들어가도록 자동으로 사이즈 축소."""
    for size in range(HEADLINE_MAX_SIZE, HEADLINE_MIN_SIZE - 1, -2):
        font = load_font(size, bold=True)
        bbox = font.getbbox(text)
        if (bbox[2] - bbox[0]) <= max_width:
            return font
    return load_font(HEADLINE_MIN_SIZE, bold=True)


def draw_centered(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont,
                  cx: int, top: int, color) -> int:
    """가로 중앙 정렬로 그리고, 텍스트 높이를 리턴."""
    bbox = font.getbbox(text)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    x = cx - w // 2 - bbox[0]
    y = top - bbox[1]
    draw.text((x, y), text, font=font, fill=color)
    return h


def render_top(headline: str, sub: str) -> Image.Image:
    img = Image.new("RGB", (OUT_W, TOP_H), BG_BLUE)
    draw = ImageDraw.Draw(img)

    max_text_w = OUT_W - 2 * H_PADDING
    h_font = fit_headline_font(headline, max_text_w)
    s_font = load_font(SUB_SIZE, bold=False)

    # 전체 텍스트 블록 높이 계산해서 세로 가운데 정렬
    h_bbox = h_font.getbbox(headline)
    s_bbox = s_font.getbbox(sub)
    h_h = h_bbox[3] - h_bbox[1]
    s_h = s_bbox[3] - s_bbox[1]
    block_h = h_h + LINE_GAP + s_h

    block_top = (TOP_H - block_h) // 2
    cx = OUT_W // 2

    draw_centered(draw, headline, h_font, cx, block_top, TEXT_WHITE)
    draw_centered(draw, sub, s_font, cx, block_top + h_h + LINE_GAP, TEXT_WHITE)

    return img


def render_bottom(src_path: Path) -> Image.Image:
    canvas = Image.new("RGB", (OUT_W, BOTTOM_H), BG_WHITE)

    screenshot = Image.open(src_path).convert("RGB")
    sw, sh = screenshot.size

    # 상하 패딩 40, 좌우 패딩 60 안에 들어가도록 비율 유지 스케일
    avail_w = OUT_W - 2 * H_PADDING
    avail_h = BOTTOM_H - 80
    scale = min(avail_w / sw, avail_h / sh)
    new_w = int(sw * scale)
    new_h = int(sh * scale)
    screenshot = screenshot.resize((new_w, new_h), Image.LANCZOS)

    # 부드러운 그림자 (검정 사각형을 블러 처리해서 합성)
    shadow_offset = 12
    shadow_blur = 24
    shadow_pad = shadow_blur * 2
    shadow_canvas = Image.new(
        "RGBA",
        (new_w + shadow_pad * 2, new_h + shadow_pad * 2),
        (0, 0, 0, 0),
    )
    sd = ImageDraw.Draw(shadow_canvas)
    sd.rectangle(
        (shadow_pad, shadow_pad, shadow_pad + new_w, shadow_pad + new_h),
        fill=(0, 0, 0, 90),
    )
    shadow_canvas = shadow_canvas.filter(ImageFilter.GaussianBlur(shadow_blur))

    cx = OUT_W // 2
    cy = BOTTOM_H // 2

    canvas_rgba = canvas.convert("RGBA")
    sx = cx - shadow_canvas.size[0] // 2
    sy = cy - shadow_canvas.size[1] // 2 + shadow_offset
    canvas_rgba.alpha_composite(shadow_canvas, (sx, sy))

    img_x = cx - new_w // 2
    img_y = cy - new_h // 2
    canvas_rgba.paste(screenshot, (img_x, img_y))

    return canvas_rgba.convert("RGB")


def generate_one(spec: dict) -> Path:
    src = SRC_DIR / spec["src"]
    out = OUT_DIR / spec["out"]
    if not src.exists():
        raise FileNotFoundError(f"원본 없음: {src}")

    top = render_top(spec["headline"], spec["sub"])
    bottom = render_bottom(src)

    final = Image.new("RGB", (OUT_W, OUT_H), BG_WHITE)
    final.paste(top, (0, 0))
    final.paste(bottom, (0, TOP_H))
    final.save(out, "PNG", optimize=True)
    return out


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for spec in COPIES:
        path = generate_one(spec)
        print(f"  ✓ {path.name}  ({spec['headline']})")
    print(f"\n완료: {OUT_DIR}")


if __name__ == "__main__":
    main()
