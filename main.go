package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

type Question struct {
	ID          int         `json:"id"`
	Question    string      `json:"question"`
	Options     []string    `json:"options"`
	Correct     interface{} `json:"answer"`
	Explanation string      `json:"explanation"`
	Difficulty  string      `json:"difficulty,omitempty"`
}

type QCM struct {
	Title     string     `json:"title"`
	Questions []Question `json:"questions"`
}

type Theme struct {
	ID             string `json:"id"`
	Title          string `json:"title"`
	Description    string `json:"description"`
	Icon           string `json:"icon"`
	Category       string `json:"category"`
	Difficulty     string `json:"difficulty"`
	QuestionsCount int    `json:"questions_count"`
	File           string `json:"file"`
	HasDifficulty  bool   `json:"has_difficulty"`
}

type ThemesList struct {
	Themes []Theme `json:"themes"`
}

type QCMResponse struct {
	Title     string     `json:"title"`
	Questions []Question `json:"questions"`
	Total     int        `json:"total"`
}

type Answer struct {
	QuestionID int         `json:"questionId"`
	Answer     interface{} `json:"answer"`
}

type AnswerResult struct {
	Correct       bool        `json:"correct"`
	CorrectAnswer interface{} `json:"correctAnswer"`
	Explanation   string      `json:"explanation"`
}

var qcmData QCM
var themesList ThemesList

func main() {
	loadThemes()

	host := getEnv("HOST", "0.0.0.0")
	port := getEnv("PORT", "8080")
	addr := fmt.Sprintf("%s:%s", host, port)

	// Static files
	http.Handle("/style.css", http.FileServer(http.Dir("./")))
	http.Handle("/script.js", http.FileServer(http.Dir("./")))

	// API routes with CORS middleware
	http.HandleFunc("/", serveHTML)
	http.HandleFunc("/api/themes", corsMiddleware(getThemes))
	http.HandleFunc("/api/qcm", corsMiddleware(getQCM))
	http.HandleFunc("/api/check", corsMiddleware(checkAnswer))

	// Server with timeouts
	server := &http.Server{
		Addr:         addr,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	fmt.Printf("QCM available at http://localhost:%s\n", port)
	log.Fatal(server.ListenAndServe())
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// CORS middleware
func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func loadThemes() {
	data, err := os.ReadFile("themes-list.json")
	if err != nil {
		log.Fatal("Error reading themes-list.json file:", err)
	}

	if err := json.Unmarshal(data, &themesList); err != nil {
		log.Fatal("Error parsing themes JSON:", err)
	}
}

func loadQCMData(themeID string) error {
	var themeFile string
	for _, theme := range themesList.Themes {
		if theme.ID == themeID {
			themeFile = theme.File
			break
		}
	}

	if themeFile == "" {
		return fmt.Errorf("theme not found: %s", themeID)
	}

	data, err := os.ReadFile(fmt.Sprintf("themes/%s", themeFile))
	if err != nil {
		return fmt.Errorf("error reading theme file: %v", err)
	}

	if err := json.Unmarshal(data, &qcmData); err != nil {
		return fmt.Errorf("error parsing JSON: %v", err)
	}

	// Filter out invalid questions
	validQuestions := make([]Question, 0, len(qcmData.Questions))
	for _, question := range qcmData.Questions {
		if strings.TrimSpace(question.Question) != "" && question.ID > 0 {
			validQuestions = append(validQuestions, question)
		}
	}
	qcmData.Questions = validQuestions
	return nil
}

func serveHTML(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "index.html")
}

func getThemes(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(themesList)
}

func getQCM(w http.ResponseWriter, r *http.Request) {
	themeID := r.URL.Query().Get("theme")
	if themeID == "" {
		http.Error(w, "Theme parameter is required", http.StatusBadRequest)
		return
	}

	if err := loadQCMData(themeID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	questions := make([]Question, len(qcmData.Questions))
	copy(questions, qcmData.Questions)

	// Filter by difficulty
	if difficulty := r.URL.Query().Get("difficulty"); difficulty != "" && difficulty != "all" {
		filtered := make([]Question, 0)
		for _, q := range questions {
			if strings.EqualFold(q.Difficulty, difficulty) {
				filtered = append(filtered, q)
			}
		}
		questions = filtered
	}

	// Shuffle if requested
	if r.URL.Query().Get("random") == "true" {
		rand.Shuffle(len(questions), func(i, j int) {
			questions[i], questions[j] = questions[j], questions[i]
		})
	}

	// Limit count
	if countParam := r.URL.Query().Get("count"); countParam != "" {
		if count, err := strconv.Atoi(countParam); err == nil && count > 0 && count < len(questions) {
			questions = questions[:count]
		}
	}

	response := QCMResponse{
		Title:     qcmData.Title,
		Questions: questions,
		Total:     len(questions),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func checkAnswer(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var answer Answer
	if err := json.NewDecoder(r.Body).Decode(&answer); err != nil {
		http.Error(w, "Invalid data", http.StatusBadRequest)
		return
	}

	// Find question
	var question Question
	found := false
	for _, q := range qcmData.Questions {
		if q.ID == answer.QuestionID {
			question = q
			found = true
			break
		}
	}

	if !found {
		http.Error(w, "Question not found", http.StatusNotFound)
		return
	}

	isCorrect := checkCorrectAnswer(question.Correct, answer.Answer)

	result := AnswerResult{
		Correct:       isCorrect,
		CorrectAnswer: question.Correct,
		Explanation:   question.Explanation,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// Helper to check if answer is correct
func checkCorrectAnswer(correct, userAnswer interface{}) bool {
	switch correctAnswer := correct.(type) {
	case float64:
		if userAns, ok := userAnswer.(float64); ok {
			return int(userAns) == int(correctAnswer)
		}

	case []interface{}:
		userAnswers, ok := userAnswer.([]interface{})
		if !ok {
			return false
		}

		// Convert to int arrays
		correctInts := toIntArray(correctAnswer)
		userInts := toIntArray(userAnswers)

		// Check length
		if len(userInts) != len(correctInts) {
			return false
		}

		// Check all user answers are in correct answers
		for _, userInt := range userInts {
			if !contains(correctInts, userInt) {
				return false
			}
		}
		return true
	}

	return false
}

// Helper to convert []interface{} to []int
func toIntArray(arr []interface{}) []int {
	result := make([]int, 0, len(arr))
	for _, v := range arr {
		if num, ok := v.(float64); ok {
			result = append(result, int(num))
		}
	}
	return result
}

// Helper to check if slice contains value
func contains(slice []int, val int) bool {
	for _, item := range slice {
		if item == val {
			return true
		}
	}
	return false
}
