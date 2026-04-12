package physics

import (
	"fmt"
	"math"

	"github.com/koljaPl/2-squares-collapse/physics/models"
)

func advance(objects []models.Shape, deltaTime float64) {
	for i := range objects {
		base := objects[i].GetBase()

		base.X += base.Vx * deltaTime
		base.Y += base.Vy * deltaTime
	}
}

func simulateForTime(simulation models.Simulation, objects []models.Shape) {
	currTime := 0.0

	// This function will run the simulation for a specific amount of time, as defined by simulation.Time.
	for currTime < *simulation.Time {
		bestTime := *simulation.Time - currTime
		event := interface{}(nil)

		for key, value := range objects {
			timeToLeftWall := TimeToWall(value, 0)
			timeToRightWall := TimeToWall(value, float64(simulation.Width))

			for _, timeToWall := range []float64{timeToLeftWall, timeToRightWall} {
				if timeToWall != math.Inf(1) && timeToWall < bestTime {
					bestTime = timeToWall
					event = struct {
						Type   string
						Object int
					}{
						Type:   "wall",
						Object: key,
					}
				}
			}
		}

		if len(objects) > 1 {
			for i := 0; i < len(objects); i++ {
				for j := i + 1; j < len(objects); j++ {
					timeToCollision := TimeToObjectCollision(objects[i], objects[j])
					if timeToCollision != math.Inf(1) && timeToCollision < bestTime {
						bestTime = timeToCollision
						event = struct {
							Type    string
							Object1 int
							Object2 int
						}{
							Type:    "object",
							Object1: i,
							Object2: j,
						}
					}
				}
			}
		}

		if event == nil {
			fmt.Printf("It's over guys, no more events to process.\n")
			fmt.Printf("Current time: %f\n", currTime)
			fmt.Printf("Objects: %+v\n", &objects)
			break // No more events to process, exit the loop.
		}

		advance(objects, bestTime)

		// TODO: This switch statement is a bit hacky; please refactor it to be more elegant and maintainable.
		switch e := event.(type) {
		case struct {
			Type   string
			Object int
		}:
			base := objects[e.Object].GetBase()
			ResolveWallCollision(base, simulation)
		case struct {
			Type    string
			Object1 int
			Object2 int
		}:
			base1 := objects[e.Object1].GetBase()
			base2 := objects[e.Object2].GetBase()

			ResolveObjectCollision(base1, base2, simulation)
		}

		fmt.Printf("Current time: %f\n", currTime)
		fmt.Printf("Objects: %+v\n", objects)
		currTime += bestTime

	}
}

func simulateForever(simulation models.Simulation, objects []models.Shape) {
	// TODO: Its not finished, I'll do this later; the idea is to run the simulation forever until the user closes the window or an exit condition is met.

	// This function will run the simulation forever until the user closes the window or an exit condition is met.
	// for {
	// Update physics and render results here.
	// }
}

func SimulationLoop(simulation models.Simulation, objects []models.Shape) {
	// This function will run the simulation loop, updating the physics and rendering the results.

	if simulation.Time == nil {
		// Simulation forever until the user closes the window or an exit condition is met.
		simulateForever(simulation, objects)
	} else {
		// Simulation for a specific amount of time, as defined by simulation.Time.
		simulateForTime(simulation, objects)
	}
}
