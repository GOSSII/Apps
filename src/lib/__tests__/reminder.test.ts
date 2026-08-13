import { formatTime, parseTimeInput } from '../notifications';
import { KEYS, translate } from '../../i18n';

describe('parseTimeInput', () => {
  it('accepts 24-hour times', () => {
    expect(parseTimeInput('21:00')).toEqual({ hour: 21, minute: 0 });
    expect(parseTimeInput('06:30')).toEqual({ hour: 6, minute: 30 });
    expect(parseTimeInput('9:05')).toEqual({ hour: 9, minute: 5 });
    expect(parseTimeInput('2145')).toEqual({ hour: 21, minute: 45 });
    expect(parseTimeInput(' 21.00 ')).toEqual({ hour: 21, minute: 0 });
  });

  it('rejects times that do not exist', () => {
    expect(parseTimeInput('24:00')).toBeNull();
    expect(parseTimeInput('21:60')).toBeNull();
    expect(parseTimeInput('subah')).toBeNull();
    expect(parseTimeInput('9')).toBeNull();
  });
});

describe('formatTime', () => {
  it('zero-pads both halves', () => {
    expect(formatTime(9, 5)).toBe('09:05');
    expect(formatTime(21, 0)).toBe('21:00');
  });
});

describe('translate', () => {
  it('fills placeholders', () => {
    expect(translate('en', 'toGo', { time: '1h 30m' })).toBe('1h 30m to go');
    expect(translate('hi', 'toGo', { time: '1h 30m' })).toBe('1h 30m बाकी');
  });

  it('leaves unknown placeholders alone rather than printing undefined', () => {
    expect(translate('en', 'examIn', { name: 'JEE' })).toBe('JEE · {n} days');
  });

  it('has a non-empty string for every key in both languages', () => {
    for (const key of KEYS) {
      expect(translate('en', key)).toBeTruthy();
      expect(translate('hi', key)).toBeTruthy();
    }
  });

  it('keeps the same placeholders in Hindi as in English', () => {
    // A translation that quietly drops {n} would print a sentence with a
    // hole in it, and only in Hindi — exactly the kind of bug nobody sees.
    const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const key of KEYS) {
      expect(holes(translate('hi', key))).toEqual(holes(translate('en', key)));
    }
  });
});
