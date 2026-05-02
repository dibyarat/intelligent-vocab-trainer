# Intelligent Vocabulary Trainer 🧠

A full-stack web application designed to help users build and retain their vocabulary using active recall and the SuperMemo-2 (SM-2) spaced repetition algorithm.

![App Screenshot](https://raw.githubusercontent.com/framer/framer-motion/main/public/twitter-card.png) *(Add your own screenshot here!)*

## ✨ Features
- **Spaced Repetition System (SRS):** Smart flashcards that schedule review dates based on mastery levels.
- **AI Vision OCR:** Snap or upload a photo of a page; the app extracts the words and lets you instantly look them up.
- **Universal Dictionary:** Integrated with the Free Dictionary API for definitions, pronunciation audio, and synonyms.
- **Daily Reminders:** Automated Push Notifications to keep you on a daily learning streak.
- **Glassmorphism UI:** Modern, responsive design built with React, Vite, and Framer Motion.

## 🏗️ Architecture
- **Frontend:** React, Vite, Framer Motion, Recharts
- **Backend:** Node.js, Express.js
- **Database:** Google Cloud Firestore (NoSQL)
- **AI/ML:** Google Cloud Vision API
- **Cloud/Deploy:** Google Cloud Run, Firebase Cloud Messaging (FCM), Docker

## 🚀 Local Development (Demo Mode)

The app includes a built-in `DEMO_MODE` that mocks the database and Cloud Vision API. This means you can run the entire app locally without needing to set up any GCP credentials!

### 1. Start the Backend
```bash
cd backend
npm install
npm run dev
```
*(The backend runs on `http://localhost:8080`)*

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
*(The frontend runs on `http://localhost:3000`)*

## ☁️ Production Deployment (Google Cloud Run)

To deploy to production, you must set up your Google Cloud Project:
1. Create a Firebase project and generate a Service Account Key.
2. Enable the **Cloud Vision API** in GCP.
3. Update `backend/.env` with your GCP/Firebase credentials (see `backend/.env.example`).
4. Deploy using Google Cloud Run:
```bash
# Deploy Backend
gcloud run deploy vocab-backend --source ./backend --allow-unauthenticated

# Deploy Frontend (Ensure VITE_API_URL is set in .env.production first)
gcloud run deploy vocab-frontend --source ./frontend --allow-unauthenticated
```

## 📄 License
MIT License
