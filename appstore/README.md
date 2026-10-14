# App Store Screenshots

Four designed portrait screenshots with captions, captured from the real iOS app using fictional demo data.

Upload the PNG files in `screenshots/iphone-6.3/`. Each is RGB, opaque, and exactly 1206 x 2622 pixels.

1. Home: Your workday. One workspace.
2. Attendance: Every workday, clearly recorded.
3. Leave: Time off, without the guesswork.
4. Payslips: Your payslips. At your fingertips.

The contact sheet is for review only, not upload. Raw captures and the composition script are in `capture/`.

`preview-fixtures.ts` is not imported by the app. It was used temporarily for capture in a development build. It overrides API reads in memory, disables other API calls, and does not alter saved sessions or backend data. Do not import it in a production build.

Rebuild the designed PNGs with Pillow using `capture/design_screenshots.py` on macOS.
