package models

type Simulation struct {
	Width  int
	Height int

	Time      *int
	Last_time float64

	E float32
}

type Object struct {
	X float64
	Y float64

	Vx float64
	Vy float64

	Mass    float64
	Size    float64
	Density float64
}

type SimulationInterface interface {
	GetHorizontalWall() float64
	GetVerticalWall() float64
}

type ObjectInterface interface {
	// TODO: Define methods for the Object interface if needed.
}

func (s Simulation) GetHorizontalWall() float64 {
	return float64(s.Width) / 2
}

func (s Simulation) GetVerticalWall() float64 {
	return float64(s.Height) / 2
}
