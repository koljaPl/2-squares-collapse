package physics

import (
	"github.com/koljaPl/2-squares-collapse/physics/models"
)

const EPS = 1e-9

func main() {
	simulation := models.Simulation{
		Width:  800,
		Height: 600,

		Time:      &[]int{20}[0],
		Last_time: 0,

		E: 1.0,
	}

	square1 := models.Object{
		X: 100,
		Y: 100,

		Vx: 0,
		Vy: 0,

		Mass:    1,
		Size:    50,
		Density: 7850.0,
	}

	square2 := models.Object{
		X: 300,
		Y: 300,

		Vx: 0,
		Vy: 0,

		Mass:    1,
		Size:    50,
		Density: 7850.0,
	}

	SimulationLoop(simulation, []models.Object{square1, square2})
}
