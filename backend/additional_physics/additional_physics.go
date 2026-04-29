package additional_physics

import "math"

// PolarToCartesian converts polar coordinates (angle in radians, speed) to Cartesian (vx, vy).
func PolarToCartesian(angleRad, speed float64) (x, y float64) {
	return math.Cos(angleRad) * speed, math.Sin(angleRad) * speed
}
