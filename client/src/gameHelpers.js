export function calcWolfQuota(n) {
  if (n <= 6) return 1;
  if (n <= 8) return 2;
  if (n <= 11) return 3;
  if (n <= 14) return 4;
  if (n <= 17) return 5;
  return Math.max(1, Math.round(n / 3.2));
}
