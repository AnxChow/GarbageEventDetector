# Video Analysis Application

This application allows users to upload videos for analysis and view detected events with timestamps, locations, and driver information.

## Project Structure

```
.
├── frontend/           # React frontend application
├── backend/           # Express backend server
└── README.md
```

## Setup Instructions

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the frontend directory with:
   ```
   VITE_API_URL=http://localhost:3000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the backend directory with:
   ```
   PORT=3000
   OPENAI_API_KEY=your_openai_api_key_here
   UPLOAD_DIR=uploads
   ```

4. Create the uploads directory:
   ```bash
   mkdir uploads
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Features

- Video upload with drag-and-drop support
- Real-time processing status updates
- Event detection with thumbnails
- Detailed event information including:
  - Timestamp
  - Event Type
  - Location
  - Driver

## Technologies Used

- Frontend:
  - React
  - TypeScript
  - Tailwind CSS
  - React Router

- Backend:
  - Node.js
  - Express
  - TypeScript
  - OpenAI API
  - Multer (for file uploads)

## Deployment

The application is designed to be deployed on Render.com. Follow these steps:

1. Push your code to a Git repository
2. Create a new Web Service on Render
3. Connect your repository
4. Set the build command and start command according to the service (frontend/backend)
5. Add the necessary environment variables
6. Deploy! 