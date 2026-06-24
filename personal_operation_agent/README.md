# Personal Operations AI Agent

An AI-powered personal assistant built with Node.js, Express, PostgreSQL, Ollama (Qwen), and n8n.

## Features

### Chat Interface

* Modern ChatGPT-style UI
* Conversation sidebar
* Multiple chat sessions
* Create new chats
* Load previous conversations
* Persistent chat history

### AI Message Classification

The AI automatically classifies user messages into:

* INFO
* REPLY
* TASK
* REMINDER
* N8N_TRIGGER

Example:

User:
"What is AWS?"

Response Type:
INFO

---

User:
"Remind me tomorrow at 8 PM to study Terraform"

Response Type:
REMINDER

---

User:
"Create a task to finish DevOps project"

Response Type:
TASK

## Architecture

Frontend:

* HTML
* CSS
* Vanilla JavaScript

Backend:

* Node.js
* Express.js

Database:

* PostgreSQL

AI Engine:

* Ollama
* Qwen 3.5 9B

Automation:

* n8n Webhooks

## Database Tables

### conversations

Stores chat sessions.

Columns:

* id
* title
* created_at

### messages

Stores conversation messages.

Columns:

* id
* conversation_id
* role
* content

### tasks

Stores AI-generated tasks.

Columns:

* id
* title
* description

## Current Workflow

1. User sends a message.
2. Backend saves the user message.
3. Ollama classifies the request.
4. AI response is generated.
5. Response is stored in PostgreSQL.
6. UI updates automatically.
7. Conversation history remains available in the sidebar.

## Conversation Management

* New Chat button creates a fresh conversation.
* Previous chats can be reopened from the sidebar.
* Messages are loaded from PostgreSQL.
* Conversation titles are generated from the first user message.

## API Endpoints

### Create Conversation

POST

/conversation/new

### Get Conversations

GET

/conversations

### Load Chat History

GET

/history/:id

### Process Message

POST

/process

## Environment Variables

Create a .env file:

PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=personal_operation_agent

OLLAMA_URL=http://127.0.0.1:11434

## Run Project

Install dependencies:

npm install

Start server:

node index.js

Open:

http://localhost:3000

## Future Enhancements

* AI-generated conversation titles
* Reminder scheduling
* Telegram notifications
* Email reminders
* Vector memory (RAG)
* Long-term memory
* User profiles
* Calendar integration
* Task dashboard
* Authentication
* Multi-user support

## Project Status

Current Version: MVP v1

Working Features:

* Chat UI
* PostgreSQL storage
* Conversation history
* Sidebar navigation
* Ollama integration
* Message classification
* Task creation
* n8n webhook integration

Planned:

* Smart titles
* Reminder execution
* Memory system
* Agent tools
* Production deployment
