package models

import "math"

const (
	SizeDisplayScale = 3800.0
	MinHalf          = 12.0
	MaxHalf          = 180.0
)

// clampHalf дублирует логику лимитов из фронтенда
func clampHalf(h float64) float64 {
	return math.Max(MinHalf, math.Min(MaxHalf, h))
}

type Square struct {
	BaseObject
	Size float64 // Здесь будем хранить уже отмасштабированную сторону (ширину)
}

func (s *Square) SetupSize() {
	rawHalf := math.Sqrt(s.Mass/s.Density) / 2.0
	s.Size = clampHalf(rawHalf*SizeDisplayScale) * 2.0 // Сохраняем полный размер
}

func (s *Square) GetSize() float64 {
	return s.Size / 2.0 // Возвращаем половину (радиус/half-size) для коллизий
}

func (s *Square) GetBase() *BaseObject {
	return &s.BaseObject
}

type Circle struct {
	BaseObject
	Radius float64 // Здесь отмасштабированный радиус
}

func (c *Circle) SetupSize() {
	rawRadius := math.Sqrt(c.Mass / (c.Density * math.Pi))
	c.Radius = clampHalf(rawRadius * SizeDisplayScale)
}

func (c *Circle) GetSize() float64 {
	return c.Radius
}

func (c *Circle) GetBase() *BaseObject {
	return &c.BaseObject
}
