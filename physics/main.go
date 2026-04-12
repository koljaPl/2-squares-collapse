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

	square1 := &models.Square{
		BaseObject: models.BaseObject{
			X: 100,
			Y: 100,

			Vx: 100,
			Vy: 0,

			Mass:    10,
			Density: 7850.0,
		},
		Size: 0,
	}

	square2 := &models.Square{
		BaseObject: models.BaseObject{
			X: 400,
			Y: 100,

			Vx:      40,
			Vy:      0,
			Mass:    20,
			Density: 7850.0,
		},
		Size: 0,
	}

	square1.SetupSize()
	square2.SetupSize()

	SimulationLoop(simulation, []models.Shape{square1, square2})
}
