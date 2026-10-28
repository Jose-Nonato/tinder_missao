export const swipeDirection = (x, velocity) => Math.abs(x) > 110 || (Math.abs(x) > 40 && Math.sign(x) * velocity > 0.6)
  ? (x > 0 ? 'like' : 'pass') : null

export function springStep({ x, v }, dt) {
  const velocity = v + (-240 * x - 26 * v) * dt
  return { x: x + velocity * dt, v: velocity }
}
