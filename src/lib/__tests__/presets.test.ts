import { PRESETS, breakSecondsOf, clampMinutes, focusSecondsOf } from '../presets';

describe('presets', () => {
  it('maps each preset to its round and break length', () => {
    expect(focusSecondsOf(PRESETS.standard)).toBe(25 * 60);
    expect(breakSecondsOf(PRESETS.standard)).toBe(5 * 60);
    expect(focusSecondsOf(PRESETS.deep)).toBe(50 * 60);
    expect(breakSecondsOf(PRESETS.deep)).toBe(10 * 60);
  });

  it('treats the open preset as having no end', () => {
    expect(focusSecondsOf(PRESETS.open)).toBeNull();
    expect(breakSecondsOf(PRESETS.open)).toBeNull();
  });

  it('treats a custom round of zero minutes as open-ended', () => {
    expect(focusSecondsOf({ preset: 'custom', focusMinutes: 0, breakMinutes: 5 })).toBeNull();
  });
});

describe('clampMinutes', () => {
  it('keeps a typed length inside something a person can actually sit for', () => {
    expect(clampMinutes(45)).toBe(45);
    expect(clampMinutes(0)).toBe(1);
    expect(clampMinutes(-20)).toBe(1);
    expect(clampMinutes(9999)).toBe(240);
    expect(clampMinutes(24.6)).toBe(25);
  });

  it('falls back to a minute rather than NaN on junk input', () => {
    expect(clampMinutes(Number('abc'))).toBe(1);
  });

  it('takes a lower ceiling for breaks', () => {
    expect(clampMinutes(120, 60)).toBe(60);
  });
});
