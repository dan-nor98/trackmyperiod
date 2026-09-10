import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarMonth,localClock,prediction,validDate } from 'lib/dates';
test('Gregorian navigation anchors to month boundaries',()=>{
  const jan=calendarMonth('2026-01-31','gregorian');
  assert.equal(jan.next,'2026-02-01'); assert.equal(calendarMonth(jan.next,'gregorian').dates.length,28);
});
test('Persian calendar handles Nowruz and leap Esfand using Intl',()=>{
  const esfand=calendarMonth('2025-03-15','persian');
  assert.equal(esfand.dates.length,30); assert.equal(esfand.next,'2025-03-21');
  assert.equal(calendarMonth(esfand.next,'persian').dates.length,31);
});
test('local dates respect midnight and DST boundaries',()=>{
  assert.equal(localClock(new Date('2026-09-10T22:00:00Z'),'Asia/Tehran').date,'2026-09-11');
  assert.equal(localClock(new Date('2026-03-08T07:30:00Z'),'America/New_York').time,'03:30');
  assert.equal(validDate('2026-02-29'),false); assert.equal(validDate('2024-02-29'),true);
});
test('prediction uses the latest start even when its period is ongoing',()=>{
  const p=prediction([{start_date:'2026-07-01',end_date:'2026-07-05'},{start_date:'2026-07-29',end_date:'2026-08-02'},
    {start_date:'2026-08-26',end_date:null}]);
  assert.equal(p.date,'2026-09-23'); assert.equal(p.active,true); assert.equal(p.intervals,2);
});
