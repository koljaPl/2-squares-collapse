package models

type Simulation struct {
	Width  int
	Height int

	Time      *float64
	Last_time float64

	E float64
}

type Object struct {
	X float64
	Y float64

	Vx float64
	Vy float64

	Mass    float64
	Size    *float64
	Density float64
}

type SimulationInterface interface {
	GetHorizontalWall() float64
	GetVerticalWall() float64
}

type ObjectInterface interface {
	SetupSize()
}

func (s Simulation) GetHorizontalWall() float64 {
	return float64(s.Width) / 2
}

func (s Simulation) GetVerticalWall() float64 {
	return float64(s.Height) / 2
}

// TODO: Get it done
// func (o *Object) SetupSize() {
// 	if o.Size == nil {
// 		side := SideOfCube(o.Mass, o.Density)
// 		o.Size = &side
// 	}
// }
