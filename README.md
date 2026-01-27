# QCM Application

A simple and customizable multiple-choice questionnaire (QCM) application built with Go backend and JavaScript frontend.

## Features

- **Multiple Themes**: Organize quizzes by categories (DevOps, Culture G, etc.)
- **Difficulty Levels**: Filter questions by easy, intermediate, advanced, or progressive
- **Multiple Choice Support**: Single or multiple correct answers per question
- **Real-time Validation**: Immediate feedback with explanations
- **Responsive Design**: Works on desktop and mobile devices
- **Simple Setup**: No external dependencies required

## Quick Start

1. Clone or download the project files
2. Navigate to the project directory
3. Run the application:

```bash
go run main.go
```

4. Open your browser and go to `http://localhost:8080`

## Project Structure

```
.
├── main.go              # Go server
├── index.html           # Main HTML page
├── style.css            # Styling
├── script.js            # Frontend logic
├── themes-list.json     # List of available themes
├── themes/              # Quiz JSON files
│   ├── docker.json
│   ├── kubernetes.json
│   └── ...
└── README.md
```

## Adding a New Theme

1. Create a JSON file in the `themes/` folder:

```json
{
  "title": "My Quiz",
  "questions": [
    {
      "id": 1,
      "question": "Your question here?",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "answer": 0,
      "explanation": "Explanation of the correct answer",
      "difficulty": "easy"
    }
  ]
}
```

2. Add the theme to `themes-list.json`:

```json
{
  "id": "my-quiz",
  "title": "My Quiz",
  "description": "Description of the quiz",
  "icon": "📚",
  "category": "MyCategory",
  "difficulty": "Progressive",
  "questions_count": 10,
  "file": "my-quiz.json",
  "has_difficulty": true
}
```

## Question Format

| Field | Type | Description |
|-------|------|-------------|
| `id` | int | Unique question ID |
| `question` | string | The question text |
| `options` | array | Possible answers |
| `answer` | int or array | Correct answer index (0-based) or array for multiple correct answers |
| `explanation` | string | Explanation shown after answering |
| `difficulty` | string | easy, intermediate, or advanced |

### Multiple Correct Answers

For questions with multiple correct answers, use an array:

```json
{
  "id": 1,
  "question": "Which are container orchestration tools?",
  "options": ["Kubernetes", "Nginx", "Docker Swarm", "Apache"],
  "answer": [0, 2],
  "explanation": "Kubernetes and Docker Swarm are orchestration tools",
  "difficulty": "intermediate"
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | 0.0.0.0 | Server host |
| `PORT` | 8080 | Server port |
