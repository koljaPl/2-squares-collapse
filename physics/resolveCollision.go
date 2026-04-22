package physics

import (
	"github.com/koljaPl/2-squares-collapse/physics/models"
)

func resolveCollision(v1, v2, m1, m2, e float64) (float64, float64) {
	// This function resolves a collision between two objects, updating their velocities based on the collision.
	// Simplified elastic collision formula (assuming 1D collision)
	v1_new := (m1*v1 + m2*v2 + m2*e*(v2-v1)) / (m1 + m2)
	v2_new := (m1*v1 + m2*v2 + m1*e*(v1-v2)) / (m1 + m2)
	return v1_new, v2_new
}

func ResolveObjectCollision(obj1, obj2 *models.BaseObject, simulation models.Simulation) {
	// This function resolves a collision between two objects, updating their velocities based on the collision.
	normal := obj2.Pos.Sub(obj1.Pos).Normalize()

	tangent := models.Vector2{X: -normal.Y, Y: normal.X}

	v1n := obj1.Vel.Dot(normal)
	v1t := obj1.Vel.Dot(tangent)

	v2n := obj2.Vel.Dot(normal)
	v2t := obj2.Vel.Dot(tangent)

	v1nAfter, v2nAfter := resolveCollision(v1n, v2n, obj1.Mass, obj2.Mass, simulation.E)

	vecV1n := normal.Mul(v1nAfter)
	vecV1t := tangent.Mul(v1t)
	obj1.Vel = vecV1n.Add(vecV1t)

	vecV2n := normal.Mul(v2nAfter)
	vecV2t := tangent.Mul(v2t)
	obj2.Vel = vecV2n.Add(vecV2t)
}

func ResolveWallCollisionX(object *models.BaseObject) {
	object.Vel.X = -object.Vel.X
}

func ResolveWallCollisionY(object *models.BaseObject) {
	object.Vel.Y = -object.Vel.Y
}
