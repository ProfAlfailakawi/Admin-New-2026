import fs from 'fs';

const readmeContent = `# Alturath Admin System

This is the operational and admin panel for Alturath, built using React, Vite, TailwindCSS, Express, and Firebase.

## Setup and Installation

1.  **Clone the repository:**
    git clone <repository_url>

2.  **Install dependencies:**
    Use 'npm ci' for deterministic installs.

3.  **Environment Variables:**
    Create a .env file in the root directory. Required variables include:
    -   VITE_FIREBASE_API_KEY: Firebase API Key
    -   UPAYMENTS_API_KEY: UPayments Gateway Key
    -   ADMIN_TEST_SECRET: Secret used for internal/cron endpoint verification
    -   GEMINI_API_KEY: Gemini API Key (if AI features are enabled)
    -   NODE_ENV: Set to development or production
    -   PORT: The port the server will run on (e.g., 3000 or 8080)

4.  **Firebase Configuration:**
    Ensure firebase-applet-config.json is present and points to the correct Firebase project and Firestore database. For production, service account credentials must be provisioned securely.

## Running the Application

-   **Development (Local):**
    Run 'npm run dev' to start the development server.

-   **Production Build:**
    Run 'npm run build' to compile the Vite application into the dist folder.

-   **Production Server:**
    Run 'npm start' to serve the API endpoints and the static files.

## Testing

The project uses vitest for unit and regression testing.

-   **Run tests:**
    Run 'npm test'
-   **Run typechecks:**
    Run 'npm run lint'

A GitHub Actions CI workflow is configured to run tests and typechecks automatically on pull requests to the main branch.

## Deployment

1.  **Docker:**
    A Dockerfile is provided for containerized deployment. It uses a non-root user and npm ci for security and reproducibility.

2.  **Never deploy automatically.** Ensure manual approval and a solid rollback plan before deploying to production.

## Recovery Plan & Rollback

-   **Rollback Procedure:** Always ensure a fallback image or previous stable branch is available. In case of deployment failure, revert to the last known good commit and redeploy immediately.
-   **Database:** Firestore operations should be backed up regularly. Ensure Firebase rules restrict unauthorized modifications.
-   **Service Availability:** If push notifications or payments fail, review the logs from the webhook routes to identify API gateway changes or missing environment variables.
`;

fs.writeFileSync('README.md', readmeContent);
