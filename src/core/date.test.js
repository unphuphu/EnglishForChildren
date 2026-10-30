import { todayISO, addDays, daysBetween } from './date.js'

test('todayISO uses local date parts', () => {
  expect(todayISO(new Date(2026, 9, 30, 23, 59))).toBe('2026-10-30')
  expect(todayISO(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05')
})

test('addDays crosses month and year boundaries', () => {
  expect(addDays('2026-10-30', 3)).toBe('2026-11-02')
  expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
})

test('daysBetween counts days from a to b', () => {
  expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3)
  expect(daysBetween('2026-11-02', '2026-10-30')).toBe(-3)
  expect(daysBetween('2026-10-30', '2026-10-30')).toBe(0)
})

test('daysBetween is exact across a daylight-saving boundary', () => {
  expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2)
  expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2)
})
