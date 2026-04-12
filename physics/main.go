package physics

import (
	"github.com/koljaPl/2-squares-collapse/physics/models"
)

const EPS = 1e-9

func Main() {
	simulationTime := 20.0

	simulation := models.Simulation{
		Width:  800,
		Height: 600,

		Time:      &simulationTime,
		Last_time: 0,

		E: 1.0,
	}

	square1 := models.Object{
		X: 100,
		Y: 100,

		Vx: 100,
		Vy: 0,

		Mass:    10,
		Density: 7850.0,
	}

	square2 := models.Object{
		X: 400,
		Y: 100,

		Vx: 40,
		Vy: 0,

		Mass:    20,
		Density: 7850.0,
	}

	SimulationLoop(simulation, []models.Object{square1, square2})
}
