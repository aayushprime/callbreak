export function generateRandomCode() {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `${digits}`;
}
