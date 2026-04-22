package additional_physics

import "math"

func PolarToCartesian(angleDeg, relative_speed float64) (x, y float64) {
	angleRadian := angleDeg * math.Pi / 180

	vx := math.Cos(angleRadian) * relative_speed
	vy := math.Sin(angleRadian) * relative_speed

	return vx, vy
}
