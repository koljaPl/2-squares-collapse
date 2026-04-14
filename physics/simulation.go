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
	targetTime := *simulation.Time

	for currTime < targetTime {
		remainingTime := targetTime - currTime
		eventTime, event := findNextEvent(simulation, objects)

		if event == nil || eventTime > remainingTime {
			advance(objects, remainingTime)
			currTime += remainingTime
			fmt.Printf("It's over guys, no more events to process in this timeframe.\n")
			break
		}

		advance(objects, eventTime)
		processEvent(simulation, objects, event)
		currTime += eventTime

		fmt.Printf("Event processed at time: %f, Type: %s, ObjA: %d\n", currTime, event.Type, event.ObjA)
	}
}

func findNextEvent(simulation models.Simulation, objects []models.Shape) (float64, *models.Event) {
	minTime := math.Inf(1)
	var nextEvent *models.Event

	wallsX := []float64{simulation.GetLeftWall(), simulation.GetRightWall()}
	for i, obj := range objects {
		for _, wallCoord := range wallsX {
			t := TimeToWall(obj, wallCoord)
			if t > EPS && t < minTime {
				minTime = t
				nextEvent = &models.Event{
					Type: "wall_x",
					ObjA: i,
					ObjB: -1,
					Time: t,
				}
			}
		}
	}

	for i := 0; i < len(objects); i++ {
		for j := i + 1; j < len(objects); j++ {
			t := TimeToObjectCollision(objects[i], objects[j])
			if t > EPS && t < minTime {
				minTime = t
				nextEvent = &models.Event{
					Type: "object",
					ObjA: i,
					ObjB: j,
					Time: t,
				}
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
	case "wall_x", "wall":
		base := objects[event.ObjA].GetBase()
		ResolveWallCollision(base, simulation)
	case "wall_y":
		// For future implementation when we will have walls in y direction, we will need to implement this case as well.
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

		if event == nil || eventTime > remainingTime {
			advance(objects, remainingTime)
			break
		}

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
				// ВАЖНО: Если Web-сервер читает эти данные медленнее, чем 60fps,
				// канал может заблокироваться. Можно использовать select с default.
				select {
				case stateChan <- objects:
				default:
					// Пропускаем кадр, если канал переполнен (помогает избежать лагов сервера)
				}
			}
		}
	}
}

func SimulationLoop(simulation models.Simulation, objects []models.Shape, stateChan chan<- []models.Shape) {
	// This function will run the simulation loop, updating the physics and rendering the results.

	if simulation.Time == nil {
		// Simulation forever until the user closes the window or an exit condition is met.
		simulateForever(context.Background(), simulation, objects, stateChan)
	} else {
		// Simulation for a specific amount of time, as defined by simulation.Time.
		simulateForTime(simulation, objects)
	}
}
