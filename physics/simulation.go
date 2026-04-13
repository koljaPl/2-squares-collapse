package physics

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/koljaPl/2-squares-collapse/physics/models"
)

const EPS = 1e-9

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
			fmt.Printf("Objects: %+v\n", objects)
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

func findNextEvent(simulation models.Simulation, objects []models.Shape) (float64, *models.Event) {
	minTime := math.Inf(1)
	var nextEvent *models.Event

	walls := []float64{0, float64(simulation.Width)}
	for i, obj := range objects {
		for _, wallCoord := range walls {
			t := TimeToWall(obj, wallCoord)
			if t < minTime && t > 0 {
				minTime = t
				nextEvent = &models.Event{Type: "wall", ObjA: i, ObjB: -1, Time: t}
			}
		}
	}

	for i := 0; i < len(objects); i++ {
		for j := i + 1; j < len(objects); j++ {
			t := TimeToObjectCollision(objects[i], objects[j])
			if t < minTime && t > 0 {
				minTime = t
				nextEvent = &models.Event{Type: "object", ObjA: i, ObjB: j, Time: t}
			}
		}
	}

	return minTime, nextEvent
}

func processEvent(simulation models.Simulation, objects []models.Shape, event *models.Event) {
	if event == nil {
		return
	}

	switch event.Type {
	case "wall":
		base := objects[event.ObjA].GetBase()
		ResolveWallCollision(base, simulation)
	case "object":
		baseA := objects[event.ObjA].GetBase()
		baseB := objects[event.ObjB].GetBase()
		ResolveObjectCollision(baseA, baseB, simulation)
	}
}

func simulateStep(simulation models.Simulation, objects []models.Shape, dt float64) {
	remainingTime := dt

	for remainingTime > EPS {
		eventTime, event := findNextEvent(simulation, objects)

		// Если в этом "кадре" событий больше нет
		if event == nil || eventTime > remainingTime {
			advance(objects, remainingTime)
			break
		}

		// Продвигаем до момента события и обрабатываем его
		advance(objects, eventTime)
		processEvent(simulation, objects, event)
		remainingTime -= eventTime
	}
}

func simulateForever(ctx context.Context, simulation models.Simulation, objects []models.Shape, stateChan chan<- []models.Shape) {
	const fps = 60
	ticker := time.NewTicker(time.Second / fps)
	defer ticker.Stop()

	dt := 1.0 / float64(fps)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			simulateStep(simulation, objects, dt)

			// Отправляем состояние для GUI/Web
			if stateChan != nil {
				stateChan <- objects
			}
		}
	}
}

func SimulationLoop(simulation models.Simulation, objects []models.Shape) {
	// This function will run the simulation loop, updating the physics and rendering the results.

	if simulation.Time == nil {
		// Simulation forever until the user closes the window or an exit condition is met.
		simulateForever(context.Background(), simulation, objects, nil)
	} else {
		// Simulation for a specific amount of time, as defined by simulation.Time.
		simulateForTime(simulation, objects)
	}
}
