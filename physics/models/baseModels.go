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
	Time    float64
	Type    string // "wall_x", "wall_y", "object"
	ObjA    int
	ObjB    int     // -1 if its a wall collision
	NormalX float64 // Will be useful for 2D bouncing
	NormalY float64
}

type RenderState struct {
	ID   int     `json:"id"`
	X    float64 `json:"x"`
	Y    float64 `json:"y"`
	Vx   float64 `json:"vx"`
	Vy   float64 `json:"vy"`
	Size float64 `json:"size"`
	Type string  `json:"type"` // "square" или "circle"
}
