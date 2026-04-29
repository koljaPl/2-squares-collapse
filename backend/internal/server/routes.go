package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/koljaPl/2-squares-collapse/backend/additional_physics"
	"github.com/koljaPl/2-squares-collapse/physics"
	"github.com/koljaPl/2-squares-collapse/physics/models"
)

func (s *Server) RegisterRoutes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/ws", wsHandler)

	// fileServer := http.FileServer(http.Dir("./static"))
	// mux.Handle("/", fileServer)

	return s.corsMiddleware(mux)
}

func (s *Server) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*") // Replace "*" with specific origins if needed
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, X-CSRF-Token")
		w.Header().Set("Access-Control-Allow-Credentials", "false") // Set to "true" if credentials are required

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,

	CheckOrigin: func(r *http.Request) bool {
		return true
		// return r.Header.Get("Origin") == "http://localhost:3000"
	},
}

type RenderState struct {
	X1 float64 `json:"x1"`
	Y1 float64 `json:"y1"`
	X2 float64 `json:"x2"`
	Y2 float64 `json:"y2"`

	Angle1 float64 `json:"angle1"`
	Angle2 float64 `json:"angle2"`

	RelativeSpeed1 float64 `json:"relative_speed1"`
	RelativeSpeed2 float64 `json:"relative_speed2"`

	Mass1 float64 `json:"mass1"`
	Mass2 float64 `json:"mass2"`

	// "circle" (default) or "square"
	ObjectType string `json:"object_type"`
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	var renderState RenderState

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Error during connection upgrade:", err)
		return
	}
	conn.SetReadLimit(1024)

	defer conn.Close()
	fmt.Println("Client connected!")

	conn.SetReadDeadline(time.Now().Add(5 * time.Second))
	_, msg, err := conn.ReadMessage()
	if err != nil {
		log.Println("Error reading init data:", err)
		return
	}
	conn.SetReadDeadline(time.Time{}) // reset read deadline after initial message

	err = json.Unmarshal(msg, &renderState)
	if err != nil {
		log.Println("Error parsing JSON:", err)
		return
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	simulation := models.Simulation{
		Width:  800,
		Height: 600,
		Time:   nil,
		E:      1.0,
	}

	vx1, vy1 := additional_physics.PolarToCartesian(renderState.Angle1, renderState.RelativeSpeed1)
	vx2, vy2 := additional_physics.PolarToCartesian(renderState.Angle2, renderState.RelativeSpeed2)

	base1 := models.BaseObject{
		Pos:     models.Vector2{X: renderState.X1, Y: renderState.Y1},
		Vel:     models.Vector2{X: vx1, Y: vy1},
		Mass:    renderState.Mass1,
		Density: 7850.0,
	}
	base2 := models.BaseObject{
		Pos:     models.Vector2{X: renderState.X2, Y: renderState.Y2},
		Vel:     models.Vector2{X: vx2, Y: vy2},
		Mass:    renderState.Mass2,
		Density: 7850.0,
	}

	var obj1, obj2 models.Shape
	if renderState.ObjectType == "square" {
		s1 := &models.Square{BaseObject: base1}
		s1.SetupSize()
		s2 := &models.Square{BaseObject: base2}
		s2.SetupSize()
		obj1, obj2 = s1, s2
	} else {
		// Default: circle
		c1 := &models.Circle{BaseObject: base1}
		c1.SetupSize()
		c2 := &models.Circle{BaseObject: base2}
		c2.SetupSize()
		obj1, obj2 = c1, c2
	}
	objects := []models.Shape{obj1, obj2}

	stateChan := make(chan []models.RenderState, 1)

	go func() {
		defer cancel()
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				log.Println("Client closed connection:", err)
				break
			}
		}
	}()

	go physics.SimulationLoop(ctx, simulation, objects, stateChan)

	for {
		select {
		case <-ctx.Done():
			log.Println("Context completed, closing connection")
			return
		case snapshot := <-stateChan:
			err := conn.WriteJSON(snapshot)
			if err != nil {
				log.Println("Client disconnected or write error:", err)
				return
			}
		}
	}
}
