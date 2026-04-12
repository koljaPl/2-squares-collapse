package models

type Simulation struct {
	Width  int
	Height int

	Time      *float64
	Last_time float64

	E float64
}

type BaseObject struct {
	X, Y   float64
	Vx, Vy float64

	Mass    float64
	Density float64
}

type SimulationInterface interface {
	GetLeftWall() float64
	GetRightWall() float64
	GetBottomWall() float64
	GetTopWall() float64
}

type Shape interface {
	SetupSize()
	GetSize() float64
	GetBase() *BaseObject
}

func (s Simulation) GetLeftWall() float64 {
	return float64(-(s.Width / 2))
}

func (s Simulation) GetRightWall() float64 {
	return float64(s.Width / 2)
}

func (s Simulation) GetBottomWall() float64 {
	return float64(-(s.Height / 2))
}

func (s Simulation) GetTopWall() float64 {
	return float64(s.Height / 2)
}

type Event struct {
	Time float64
	Type string
}
