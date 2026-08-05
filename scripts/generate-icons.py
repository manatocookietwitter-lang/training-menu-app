from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "icons"
CANVAS_SIZE = 1024


def make_icon() -> Image.Image:
    image = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), "#167a3d")
    draw = ImageDraw.Draw(image)

    # The plain white planning card deliberately echoes the original icon.
    draw.rounded_rectangle((190, 145, 834, 879), radius=118, fill="#ffffff")
    draw.rounded_rectangle((286, 242, 738, 310), radius=34, fill="#167a3d")

    rows = (
        (390, True, 676),
        (535, True, 716),
        (680, False, 626),
    )
    for y, checked, line_end in rows:
        box = (278, y, 370, y + 92)
        draw.rounded_rectangle(
            box,
            radius=24,
            fill="#167a3d" if checked else "#ffffff",
            outline="#167a3d",
            width=16,
        )
        if checked:
            draw.line(
                ((301, y + 48), (325, y + 70), (354, y + 25)),
                fill="#ffffff",
                width=15,
                joint="curve",
            )
        draw.rounded_rectangle((420, y + 8, line_end, y + 36), radius=14, fill="#167a3d")
        draw.rounded_rectangle((420, y + 57, min(line_end - 48, 635), y + 77), radius=10, fill="#b7d9c1")

    return image


def save_sizes(image: Image.Image) -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    outputs = {
        "favicon-32-v3.png": 32,
        "apple-touch-icon-v3.png": 180,
        "icon-192-v3.png": 192,
        "icon-512-v3.png": 512,
    }
    for filename, size in outputs.items():
        resized = image.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(ICON_DIR / filename, format="PNG", optimize=True)


if __name__ == "__main__":
    save_sizes(make_icon())
