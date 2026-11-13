// Pengaturan bersama (tanpa React) supaya bisa dipakai logika berbagi dan diuji dengan Node
export const VIEW_DEFAULTS = {
  grid: true, axes: true, nums: true,
  points: true, labels: true, coords: false,
  sym: true, shadow: true,
  pt: 6, line: 3.5,
}
export const VIEW_LIMITS = { pt: [3, 10], line: [1, 8] }
export const MAX_SHADOWS = 4
export const SHADOW_COLORS = ['#7c8798', '#a0638f', '#b08a2e', '#3b9a9f']
