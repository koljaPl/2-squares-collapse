package physics

import (
	"github.com/koljaPl/2-squares-collapse/physics/models"
)

func resolveCollision(v1, v2, m1, m2, e float64) (float64, float64) {
	// This function resolves a collision between two objects, updating their velocities based on the collision.
	// Simplified elastic collision formula (assuming 1D collision)
	v1_new := (m1*v1 + m2*v2 + m2*e*(v2-v1)) / (m1 + m2)
	v2_new := (m1*v1 + m2*v2 + m1*e*(v2-v1)) / (m1 + m2)
	return v1_new, v2_new
}

func ResolveObjectCollision(object1, object2 models.Object, simulation models.Simulation) {
	// This function resolves a collision between two objects, updating their velocities based on the collision.
	v1, v2 := resolveCollision(object1.Vx, object2.Vx, object1.Mass, object2.Mass, simulation.E)
	object1.Vx = v1
	object2.Vx = v2
}

func ResolveWallCollision(object models.Object, simulation models.Simulation) {
	// This function resolves a collision between an object and a wall, updating the object's velocity based on the collision.
	object.Vx = -object.Vx
}
