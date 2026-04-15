package server

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/koljaPl/2-squares-collapse/physics"
	"github.com/koljaPl/2-squares-collapse/physics/models"
)

func (s *Server) RegisterRoutes() http.Handler {
	mux := http.NewServeMux()

	// Роут для WebSocket
	mux.HandleFunc("/ws", wsHandler)

	// Роут для статики (отдаем index.html)
	// ВАЖНО: При запуске через "go run ./cmd/api" из корня проекта,
	// путь "./static" будет искаться относительно папки backend.
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

		// Handle preflight OPTIONS requests
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		// Proceed with the next handler
		next.ServeHTTP(w, r)
	})
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// Разрешаем подключения с любых доменов (для локальной разработки это ок)
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	// 1. Апгрейдим соединение до WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Ошибка при апгрейде соединения:", err)
		return
	}
	defer conn.Close()
	fmt.Println("Клиент подключился!")

	// 2. Создаем контекст для отмены симуляции при отключении клиента
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel() // ОЧЕНЬ ВАЖНО: остановит simulateForever, когда функция завершится

	// 3. Инициализируем начальное состояние симуляции (как у тебя было)
	simulation := models.Simulation{
		Width:  800,
		Height: 600,
		Time:   nil, // Бесконечная симуляция
		E:      1.0,
	}

	square1 := &models.Square{
		BaseObject: models.BaseObject{X: -300, Y: 0, Vx: 100, Vy: 0, Mass: 10, Density: 7850.0},
	}
	square2 := &models.Square{
		BaseObject: models.BaseObject{X: 0, Y: 0, Vx: 40, Vy: 0, Mass: 20, Density: 7850.0},
	}
	square1.SetupSize()
	square2.SetupSize()
	objects := []models.Shape{square1, square2}

	// 4. Создаем канал для получения снимков состояния (Snapshots)
	stateChan := make(chan []models.RenderState, 1) // Буфер 1, чтобы физика не ждала, если канал полон

	go func() {
		defer cancel() // Как только чтение прервется (клиент ушел), отменяем контекст физики
		for {
			// Читаем сообщения. Нам не важно содержимое, мы ждем ошибку (например, закрытие)
			if _, _, err := conn.ReadMessage(); err != nil {
				log.Println("Клиент закрыл соединение:", err)
				break
			}
		}
	}()

	// 5. Запускаем симуляцию в отдельной горутине
	go physics.SimulationLoop(ctx, simulation, objects, stateChan)

	// 6. Слушаем канал и отправляем данные клиенту
	for {
		select {
		case <-ctx.Done():
			// Если контекст отменен, выходим
			return
		case snapshot := <-stateChan:
			// Отправляем JSON-массив в WebSocket
			err := conn.WriteJSON(snapshot)
			if err != nil {
				log.Println("Клиент отключился или ошибка записи:", err)
				return // Выход из цикла (сработает defer cancel() и defer conn.Close())
			}
		}
	}
}
