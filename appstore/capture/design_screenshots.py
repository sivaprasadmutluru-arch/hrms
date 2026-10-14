from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'screenshots' / 'iphone-6.3'
OUT.mkdir(parents=True, exist_ok=True)
FONT = Path('/System/Library/Fonts/Supplemental')

def font(size, bold=False):
    return ImageFont.truetype(str(FONT / ('Arial Bold.ttf' if bold else 'Arial.ttf')), size)

screens = [
    ('01-home', ['Your workday.', 'One workspace.'], 'Attendance and everyday essentials, together.'),
    ('02-attendance', ['Every workday,', 'clearly recorded.'], 'Check-in times, hours, and attendance history.'),
    ('03-leave', ['Time off,', 'without the guesswork.'], 'Track leave requests and approval status.'),
    ('04-payslips', ['Your payslips.', 'At your fingertips.'], 'Monthly salary details and PDF downloads.'),
]

for name, heading, subtitle in screens:
    source = Image.open(ROOT / 'capture' / (name + '.png')).convert('RGB')
    assert source.size == (1206, 2622), source.size
    canvas = Image.new('RGB', (1206, 2622), '#f3f4ff')
    draw = ImageDraw.Draw(canvas)
    draw.text((84, 74), 'GRECHA HRMS', font=font(33, True), fill='#6259ec')
    for i, line in enumerate(heading):
        assert draw.textlength(line, font=font(78, True)) < 1040
        draw.text((80, 150 + i * 92), line, font=font(78, True), fill='#171a2b')
    draw.text((84, 370), subtitle, font=font(36), fill='#62677b')
    width = 950
    height = round(width * source.height / source.width)
    x, y = (1206 - width) // 2, 495
    shadow = Image.new('RGBA', canvas.size)
    ImageDraw.Draw(shadow).rounded_rectangle((x - 10, y + 8, x + width + 10, y + height + 22), 85, fill=(28, 22, 68, 45))
    canvas = Image.alpha_composite(canvas.convert('RGBA'), shadow.filter(ImageFilter.GaussianBlur(24)))
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((x - 8, y - 8, x + width + 8, y + height + 8), 82, fill='#191a25')
    image = source.resize((width, height), Image.Resampling.LANCZOS)
    mask = Image.new('L', image.size)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, width, height), 74, fill=255)
    canvas.paste(image, (x, y), mask)
    canvas.convert('RGB').save(OUT / (name + '.png'), optimize=True)

sheet = Image.new('RGB', (1200, 700), '#ffffff')
for i, (name, _, _) in enumerate(screens):
    thumbnail = Image.open(OUT / (name + '.png'))
    thumbnail.thumbnail((290, 650), Image.Resampling.LANCZOS)
    sheet.paste(thumbnail, (i * 300 + (300 - thumbnail.width) // 2, 20))
sheet.save(ROOT / 'screenshots' / 'contact-sheet.jpg', quality=90)
print('Created 4 RGB PNG screenshots at 1206 x 2622.')
