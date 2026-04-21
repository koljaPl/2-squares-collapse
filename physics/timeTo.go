package physics

import (
	"math"

	"github.com/koljaPl/2-squares-collapse/physics/models"
)

func relativeVelocity(object1, object2 models.Shape) float64 {
	base1 := object1.GetBase()
	base2 := object2.GetBase()

	relativeVx := base1.Vel.X - base2.Vel.X
	relativeVy := base1.Vel.Y - base2.Vel.Y

	return math.Sqrt(relativeVx*relativeVx + relativeVy*relativeVy)
}

func neededDistance(object1, object2 models.Shape) float64 {
	return (object1.GetSize() + object2.GetSize()) / 2
}

func currentDistance(object1, object2 models.Shape) float64 {
	base1 := object1.GetBase()
	base2 := object2.GetBase()

	return base1.Pos.Sub(base2.Pos).Length()
}

func TimeToObjectCollision(object1, object2 models.Shape) float64 {
	base1 := object1.GetBase()
	base2 := object2.GetBase()

	dx := base2.Pos.X - base1.Pos.X
	dvx := base1.Vel.X - base2.Vel.X

	if dvx == 0 {
		return math.Inf(1)
	}

	neededDist := neededDistance(object1, object2)

	gap := math.Abs(dx) - neededDist
	if dx*dvx <= 0 {
		return math.Inf(1)
	}

	time := gap / math.Abs(dvx)
	if time < EPS {
		return math.Inf(1)
	}

	return time
}

func TimeToWallX(object models.Shape, wallCoordinates float64) float64 {
	base := object.GetBase()
	if base.Vel.X == 0 {
		return math.Inf(1)
	}

	// Расстояние от центра до стены
	dist := wallCoordinates - base.Pos.X

	// Учитываем размер объекта (край, а не центр ударяется о стену)
	if base.Vel.X > 0 {
		dist -= object.GetSize() / 2
	} else {
		dist += object.GetSize() / 2
	}

	time := dist / base.Vel.X
	if time < EPS {
		return math.Inf(1)
	}
	return time
}

func TimeToWallY(object models.Shape, wallCoordinates float64) float64 {
	base := object.GetBase()
	if base.Vel.Y == 0 {
		return math.Inf(1)
	}

	// Расстояние от центра до стены
	dist := wallCoordinates - base.Pos.Y

	// Учитываем размер объекта (край, а не центр ударяется о стену)
	if base.Vel.Y > 0 {
		dist -= object.GetSize() / 2
	} else {
		dist += object.GetSize() / 2
	}

	time := dist / base.Vel.Y
	if time < EPS {
		return math.Inf(1)
	}
	return time
}
