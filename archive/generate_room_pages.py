import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data.json"
TEMPLATE_PATH = ROOT / "room.html"
ROOMS_DIR = ROOT / "rooms"
PAGE_PATTERN = re.compile(r"<body([^>]*)>", re.IGNORECASE)
TITLE_PATTERN = re.compile(r"<title>.*?</title>", re.IGNORECASE | re.DOTALL)
BASE_PATTERN = re.compile(r"<base\s+href=\"[^\"]*\">", re.IGNORECASE)


def build_page(template_html: str, room: dict) -> str:
    title = f"<title>{room['name']} | Smart Campus</title>"
    html = TITLE_PATTERN.sub(title, template_html, count=1)
    html = BASE_PATTERN.sub("<base href=\"../../\">", html)

    if "<base href=\"../../\">" not in html:
        html = html.replace(title, f"{title}\n    <base href=\"../../\">", 1)

    def replace_body(match: re.Match) -> str:
        attrs = match.group(1) or ""
        attrs = re.sub(r'\sdata-room-id="[^"]*"', "", attrs, flags=re.IGNORECASE)
        return f'<body{attrs} data-room-id="{room["id"]}">'

    return PAGE_PATTERN.sub(replace_body, html, count=1)


def main() -> None:
    rooms = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    template_html = TEMPLATE_PATH.read_text(encoding="utf-8")

    ROOMS_DIR.mkdir(exist_ok=True)

    for room in rooms:
        room_dir = ROOMS_DIR / room["id"].lower()
        room_dir.mkdir(parents=True, exist_ok=True)
        page_path = room_dir / "index.html"
        page_path.write_text(build_page(template_html, room), encoding="utf-8")

    print(f"Generated {len(rooms)} room pages.")


if __name__ == "__main__":
    main()
