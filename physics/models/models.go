package models

import "math"

type Square struct {
	BaseObject
	Size float64
}

func (s *Square) SetupSize() {
	s.Size = math.Sqrt(s.Mass / s.Density)
}

func (s *Square) GetSize() float64 {
	return s.Size
}

func (s *Square) GetBase() *BaseObject {
	return &s.BaseObject
}

type Circle struct {
	BaseObject
	Radius float64
}

func (c *Circle) SetupSize() {
	c.Radius = math.Sqrt(c.Mass / (c.Density * math.Pi))
}

func (c *Circle) GetSize() float64 {
	return c.Radius
}

func (c *Circle) GetBase() *BaseObject {
	return &c.BaseObject
}
