package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/koljaPl/2-squares-collapse/physics"
	"github.com/koljaPl/2-squares-collapse/physics/models"
)

func (s *Server) RegisterRoutes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/ws", wsHandler)

	fileServer := http.FileServer(http.Dir("./static"))
	mux.Handle("/", fileServer)

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

	Vx1 float64 `json:"vx1"`
	Vy1 float64 `json:"vy1"`
	Vx2 float64 `json:"vx2"`
	Vy2 float64 `json:"vy2"`

	Mass1 float64 `json:"mass1"`
	Mass2 float64 `json:"mass2"`
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	var renderState RenderState

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Ошибка при апгрейде соединения:", err)
		return
	}
	conn.SetReadLimit(1024)

	defer conn.Close()
	fmt.Println("Клиент подключился!")

	conn.SetReadDeadline(time.Now().Add(5 * time.Second))
	_, msg, err := conn.ReadMessage()
	if err != nil {
		log.Println("Ошибка чтения init данных:", err)
		return
	}
	conn.SetReadDeadline(time.Time{}) // сброс

	err = json.Unmarshal(msg, &renderState)
	if err != nil {
		log.Println("Ошибка парсинга JSON:", err)
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

	square1 := &models.Square{
		BaseObject: models.BaseObject{X: renderState.X1, Y: renderState.Y1, Vx: renderState.Vx1, Vy: renderState.Vy1, Mass: renderState.Mass1, Density: 7850.0},
	}
	square2 := &models.Square{
		BaseObject: models.BaseObject{X: renderState.X2, Y: renderState.Y2, Vx: renderState.Vx2, Vy: renderState.Vy2, Mass: renderState.Mass2, Density: 7850.0},
	}
	square1.SetupSize()
	square2.SetupSize()
	objects := []models.Shape{square1, square2}

	stateChan := make(chan []models.RenderState, 1)

	go func() {
		defer cancel()
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				log.Println("Клиент закрыл соединение:", err)
				break
			}
		}
	}()

	go physics.SimulationLoop(ctx, simulation, objects, stateChan)

	for {
		select {
		case <-ctx.Done():
			log.Println("Контекст завершён, закрываем соединение")
			return
		case snapshot := <-stateChan:
			err := conn.WriteJSON(snapshot)
			if err != nil {
				log.Println("Клиент отключился или ошибка записи:", err)
				return
			}
		}
	}
}
