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
		// Новая позиция = Старая позиция + (Скорость * Время)
		base.Pos = base.Pos.Add(base.Vel.Mul(deltaTime))
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
	wallsY := []float64{simulation.GetBottomWall(), simulation.GetTopWall()}

	for i, obj := range objects {
		for _, wallCoord := range wallsX {
			t := TimeToWallX(obj, wallCoord)
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

	for i, obj := range objects {
		for _, wallCoord := range wallsY {
			t := TimeToWallY(obj, wallCoord)
			if t > EPS && t < minTime {
				minTime = t
				nextEvent = &models.Event{
					Type: "wall_y",
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
		ResolveWallCollisionX(base)
	case "wall_y":
		base := objects[event.ObjA].GetBase()
		ResolveWallCollisionY(base)
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

func simulateForever(ctx context.Context, simulation models.Simulation, objects []models.Shape, stateChan chan<- []models.RenderState) {
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

			// 2. Создаем глубокую копию данных (Snapshot)
			// Это критически важно: мы копируем значения в новую структуру,
			// которую WebSocket-горутина сможет безопасно читать.
			snapshot := make([]models.RenderState, len(objects))
			for i, obj := range objects {
				base := obj.GetBase()
				snapshot[i] = models.RenderState{
					ID:   i,
					X:    base.Pos.X,
					Y:    base.Pos.Y,
					Vx:   base.Vel.X,
					Vy:   base.Vel.Y,
					Size: obj.GetSize(),
					// Можно добавить логику определения типа, если нужно для отрисовки
					Type: "square",
				}
			}

			// 3. Отправляем копию в канал
			if stateChan != nil {
				select {
				case stateChan <- snapshot:
				default:
					// Если канал забит (клиент не успевает читать), просто пропускаем кадр.
					// Это лучше, чем тормозить всю физику.
				}
			}
		}
	}
}

func SimulationLoop(simulation models.Simulation, objects []models.Shape, stateChan chan<- []models.RenderState) {
	// This function will run the simulation loop, updating the physics and rendering the results.

	if simulation.Time == nil {
		// Simulation forever until the user closes the window or an exit condition is met.
		simulateForever(context.Background(), simulation, objects, stateChan)
	} else {
		// Simulation for a specific amount of time, as defined by simulation.Time.
		simulateForTime(simulation, objects)
	}
}
