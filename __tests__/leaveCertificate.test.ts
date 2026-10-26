import {showLeaveCertificate} from '../src/utils/leaveCertificate';

it('waits for both dates and hides the upload for one sick day', () => {
  expect(showLeaveCertificate('Sick Leave', '', '')).toBe(false);
  expect(showLeaveCertificate('Sick Leave', '2026-10-25', '')).toBe(false);
  expect(showLeaveCertificate('Sick Leave', '2026-10-25', '2026-10-25')).toBe(false);
});

it('shows the upload only for a valid multi-day sick leave range', () => {
  expect(showLeaveCertificate('Sick leave', '2026-10-25', '2026-10-26')).toBe(true);
  expect(showLeaveCertificate('Annual Leave', '2026-10-25', '2026-10-26')).toBe(false);
  expect(showLeaveCertificate('Sick Leave', '2026-10-26', '2026-10-25')).toBe(false);
  expect(showLeaveCertificate('Sick Leave', '2026-02-30', '2026-03-02')).toBe(false);
});
