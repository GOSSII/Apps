/* One test per bug the audit turned up. Each of these fails against the
   code as it was written, which is the only reason to keep them. */

import { dateInputValue, parseDateInput, prettyDate } from '../dates';

describe('date inputs round-trip', () => {
  it('pre-fills editable date fields in a format the parser accepts', () => {
    // The bug: fields were pre-filled with prettyDate ('1 Aug 2026'), which
    // parseDateInput rejects — so saving an unchanged exam or sitting failed.
    const day = '2026-08-01';
    expect(parseDateInput(prettyDate(day))).toBeNull();
    expect(parseDateInput(dateInputValue(day))).toBe(day);
  });

  it('round-trips every day of a month, including single digits', () => {
    for (let d = 1; d <= 28; d++) {
      const day = `2027-02-${String(d).padStart(2, '0')}`;
      expect(parseDateInput(dateInputValue(day))).toBe(day);
    }
  });

  it('round-trips a leap day and a year boundary', () => {
    expect(parseDateInput(dateInputValue('2028-02-29'))).toBe('2028-02-29');
    expect(parseDateInput(dateInputValue('2026-12-31'))).toBe('2026-12-31');
    expect(parseDateInput(dateInputValue('2027-01-01'))).toBe('2027-01-01');
  });
});
