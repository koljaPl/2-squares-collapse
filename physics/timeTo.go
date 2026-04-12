package physics

import (
	"math"

	"github.com/koljaPl/2-squares-collapse/physics/models"
)

func relativeVelocity(object1, object2 models.Shape) float64 {
	base1 := object1.GetBase()
	base2 := object2.GetBase()

	relativeVx := base1.Vx - base2.Vx
	relativeVy := base1.Vy - base2.Vy

	return math.Sqrt(relativeVx*relativeVx + relativeVy*relativeVy)
}

func neededDistance(object1, object2 models.Shape) float64 {
	return (object1.GetSize() + object2.GetSize()) / 2
}

func currentDistance(object1, object2 models.Shape) float64 {
	base1 := object1.GetBase()
	base2 := object2.GetBase()

	return math.Sqrt(math.Pow(base1.X-base2.X, 2) + math.Pow(base1.Y-base2.Y, 2))
}

func TimeToObjectCollision(object1, object2 models.Shape) float64 {
	base1 := object1.GetBase()
	base2 := object2.GetBase()

	dx := base2.X - base1.X
	dvx := base1.Vx - base2.Vx

	if dvx == 0 {
		return math.Inf(1)
	}

	neededDist := neededDistance(object1, object2)

	gap := math.Abs(dx) - neededDist
	if dx*dvx <= 0 {
		return math.Inf(1)
	}

	time := gap / math.Abs(dvx)
	if time < 0 {
		return math.Inf(1)
	}

	return time

	// This function calculates the time until two objects collide and returns that time.
	// neededDistance := neededDistance(object1, object2)

	// currentDistance := currentDistance(object1, object2)

	// relativeVelocity := relativeVelocity(object1, object2)

	// if relativeVelocity == 0 {
	// 	return math.Inf(1) // No collision if relative velocity is zero
	// }

	// time := (neededDistance - currentDistance) / relativeVelocity

	// return time
}

func TimeToWall(object models.Shape, wallCoordinates float64) float64 {
	// TODO: This code only works for 1D space; please fix it immediately
	// This function calculates the time until the object collides with a wall and returns the time and the wall it will collide with.
	base := object.GetBase()

	if base.Vx > 0 && wallCoordinates < base.X {
		return math.Inf(1) // the wall behind
	}
	if base.Vx < 0 && wallCoordinates > base.X {
		return math.Inf(1) // стена позади
	}
	distanceToWall := math.Abs(wallCoordinates - base.X)

	if base.Vx == 0 {
		return math.Inf(1) // No collision if velocity is zero
	}

	side := object.GetSize()

	time := (distanceToWall - side/2) / math.Abs(base.Vx)

	if time < 0 {
		return math.Inf(1)
	}

	return time
}
