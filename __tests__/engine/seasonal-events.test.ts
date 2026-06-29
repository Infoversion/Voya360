import { getActiveEvents } from '@/engine/seasonal-events';

describe('getActiveEvents', () => {
  it('returns empty array when destination has no events', () => {
    const events = getActiveEvents('LHR', new Date('2026-06-01'));
    expect(events).toHaveLength(0);
  });

  it('detects an upcoming event within 90 days', () => {
    // Eid al-Fitr 2026 window starts ~Mar 10 (month=3, day=10)
    // Departure 30 days before → ~Feb 8
    const departure = new Date('2026-02-08');
    const events = getActiveEvents('DEL', departure);
    const eid = events.find(e => e.name === 'Eid al-Fitr');
    expect(eid).toBeDefined();
    expect(eid!.daysUntil).toBeGreaterThan(0);
    expect(eid!.daysUntil).toBeLessThanOrEqual(90);
  });

  it('returns daysUntil=0 when departure is inside the event window', () => {
    // Diwali window: month=9, day=15 for 30 days → Oct 15 – Nov 14
    const departure = new Date('2026-10-20');
    const events = getActiveEvents('DEL', departure);
    const diwali = events.find(e => e.name === 'Diwali');
    expect(diwali).toBeDefined();
    expect(diwali!.daysUntil).toBe(0);
  });

  it('does not return events more than 90 days away', () => {
    // Aug 15 is >90 days before Christmas (Dec 10) and not in any other DEL window
    const departure = new Date('2026-08-15T12:00:00');
    const events = getActiveEvents('DEL', departure);
    const xmas = events.find(e => e.name === 'Christmas / New Year');
    expect(xmas).toBeUndefined();
  });

  it('sorts events by daysUntil ascending', () => {
    const departure = new Date('2026-02-01');
    const events = getActiveEvents('DEL', departure);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].daysUntil).toBeGreaterThanOrEqual(events[i - 1].daysUntil);
    }
  });

  it('includes demand level', () => {
    const departure = new Date('2026-10-20');
    const events = getActiveEvents('DEL', departure);
    const diwali = events.find(e => e.name === 'Diwali');
    expect(diwali!.demandLevel).toBe('very_high');
  });
});
