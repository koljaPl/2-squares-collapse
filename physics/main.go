package physics

import (
	"github.com/koljaPl/2-squares-collapse/physics/models"
)

func Main() {
	simulationTime := 20.0

	simulation := models.Simulation{
		Width:  800,
		Height: 600,

		Time:      &simulationTime, // or nil for infinite simulation
		Last_time: 0,

		E: 1.0,
	}

	square1 := &models.Square{
		BaseObject: models.BaseObject{
			X: -300,
			Y: 0,

			Vx: 100,
			Vy: 0,

			Mass:    10,
			Density: 7850.0,
		},
		Size: 0,
	}

	square2 := &models.Square{
		BaseObject: models.BaseObject{
			X: 0,
			Y: 0,

			Vx:      40,
			Vy:      0,
			Mass:    20,
			Density: 7850.0,
		},
		Size: 0,
	}

	square1.SetupSize()
	square2.SetupSize()

	// ------------------------------------------------------------------------------------------------------
	// For now, we will just run the simulation for a fixed amount of time and print the results to the console.
	SimulationLoop(simulation, []models.Shape{square1, square2}, nil)

	// -----------------------------------------------------------------------------------------------------
	// It's important to use a channel for state updates if we want to visualize the simulation in real-time.

	// stateChan := make(chan []models.Shape)

	// // 2. Запускаем симуляцию в горутине
	// go SimulationLoop(simulation, []models.Shape{square1, square2}, stateChan)

	// // 3. Читаем из канала и печатаем
	// fmt.Println("Starting simulation... (Press Ctrl+C to stop)")
	// for objects := range stateChan {
	// 	// Очистка экрана (ANSI escape code), чтобы вывод не бежал вниз, а обновлялся на месте
	// 	fmt.Print("\033[H\033[2J")

	// 	fmt.Printf("--- Current State ---\n")
	// 	for i, obj := range objects {
	// 		base := obj.GetBase()
	// 		fmt.Printf("Object %d: X=%.2f, Y=%.2f | Vx=%.2f, Vy=%.2f\n",
	// 			i, base.X, base.Y, base.Vx, base.Vy)
	// 	}
	// }
}
