package physics

import (
	"math"

	"github.com/koljaPl/2-squares-collapse/physics/models"
)

func SideOfCube(mass, density float64) float64 {
	side := math.Pow(mass/density, 1.0/3.0)
	return side
}

func relativeVelocity(object1, object2 models.Object) float64 {
	relativeVx := object1.Vx - object2.Vx
	relativeVy := object1.Vy - object2.Vy
	return math.Sqrt(relativeVx*relativeVx + relativeVy*relativeVy)
}

func neededDistance(object1, object2 models.Object) float64 {
	return (SideOfCube(object1.Mass, object1.Density) + SideOfCube(object2.Mass, object2.Density)) / 2
}

func currentDistance(object1, object2 models.Object) float64 {
	return math.Sqrt(math.Pow(object1.X-object2.X, 2) + math.Pow(object1.Y-object2.Y, 2))
}

func TimeToObjectCollision(object1, object2 models.Object) float64 {
	// This function calculates the time until two objects collide and returns that time.
	// neededDistance := neededDistance(object1, object2)

	// currentDistance := currentDistance(object1, object2)

	// relativeVelocity := relativeVelocity(object1, object2)

	// if relativeVelocity == 0 {
	// 	return math.Inf(1) // No collision if relative velocity is zero
	// }

	// time := (neededDistance - currentDistance) / relativeVelocity

	// return time

	dx := object2.X - object1.X
	dvx := object1.Vx - object2.Vx

	if dvx == 0 {
		return math.Inf(1)
	}

	neededDist := neededDistance(object1, object2)
	// Знак dx определяет, с какой стороны объекты
	gap := math.Abs(dx) - neededDist
	if dx*dvx <= 0 {
		return math.Inf(1)
	}
	time := gap / math.Abs(dvx)
	if time < 0 {
		return math.Inf(1)
	}
	return time
}

func TimeToWall(object models.Object, wallCoordinates float64) float64 {
	// TODO: This code only works for 1D space; please fix it immediately
	// This function calculates the time until the object collides with a wall and returns the time and the wall it will collide with.
	if object.Vx > 0 && wallCoordinates < object.X {
		return math.Inf(1) // the wall behind
	}
	if object.Vx < 0 && wallCoordinates > object.X {
		return math.Inf(1) // стена позади
	}
	distanceToWall := math.Abs(wallCoordinates - object.X)

	if object.Vx == 0 {
		return math.Inf(1) // No collision if velocity is zero
	}

	side := SideOfCube(object.Mass, object.Density)

	time := (distanceToWall - side/2) / math.Abs(object.Vx)

	if time < 0 {
		return math.Inf(1)
	}

	return time
}
