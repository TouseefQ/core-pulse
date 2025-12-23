# ❤️ CorePulse

**CorePulse** is a distributed web monitoring system that tracks Core Web Vitals (LCP, CLS, FID) over time. It uses a **Chrome Extension** to trigger audits and view data, while a **Cloud Worker** runs headless Lighthouse audits in the background 24/7.

![Project Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 🚀 Features

- **🌐 Distributed Architecture:** Hybrid setup with a local Chrome Extension and a Cloud-based Worker.
- **📊 Real-time Visualization:** View historical performance trends directly in your browser toolbar using Chart.js.
- **🤖 Automated Audits:** A Dockerized worker runs Puppeteer & Lighthouse every hour to track performance changes.
- **☁️ Cloud Ready:** Fully configured for deployment on Railway (Node.js + PostgreSQL + Docker).
- **🔒 Secure:** Uses environment variables and SSL connections for production databases.

---

## 🛠️ Tech Stack

- **Frontend:** React (Vite), Chart.js, Chrome Extension API (Manifest V3)
- **Backend:** Node.js, Express, PostgreSQL (pg)
- **Worker:** Puppeteer, Google Lighthouse, Docker
- **DevOps:** Docker Compose, Railway

---

## 📂 Project Structure

```text
core-pulse/
├── extension/       # Chrome Extension (React + Vite)
├── server/          # REST API (Express + PostgreSQL)
└── worker/          # Background Job (Puppeteer + Lighthouse)
```

## ⚡ Getting Started (Local Development)

Follow these steps to run the entire system on your local machine.

### Prerequisites
* Node.js (v16+)
* Docker & Docker Compose
* Git

### 1. Clone the Repository
```
git clone https://github.com/TouseefQ/core-pulse.git
cd core-pulse
```

### 2. Start the Database

We use Docker to spin up a local PostgreSQL instance.

```
docker-compose up -d
```

### 3. Run the API Server
The server handles requests from the extension and saves data to the DB.

```
cd server
npm install
node index.js
```
Server runs on: ```http://localhost:5000```

### 4. Run the Worker
The worker runs Lighthouse audits.

```
# Open a new terminal
cd worker
npm install
node index.js
```

The worker will run an immediate audit and then sleep for 60 minutes.

### 5. Load the Chrome Extension
1. Navigate to extension/ and build the project:

```
cd extension
npm install
npm run build
```
2. Open Chrome and go to ```chrome://extensions```.

3. Enable Developer Mode (top right).

4. Click Load Unpacked and select the ``extension/dist`` folder.

## 🌍 Deployment (Railway)
This project is optimized for deployment on [Railway](https://railway.com/).

### 1. Database & Server
1. Create a new Project on Railway from your GitHub repo.

2. Add a PostgreSQL database service.

3. Link the Database to the Server using the DATABASE_URL variable.

4. Set the Server Root Directory to /server.

5. Set the Start Command to npm install && node index.js.

### 2. The Worker (Docker)
1. Add a second service from the same GitHub repo.

2. Set the Root Directory to /worker.

3. Add the DATABASE_URL variable (use the Public URL of your Railway DB).

4. Railway will automatically detect the Dockerfile and build the worker with Chrome installed.

## 📸 Screenshots
![Core Pulse Extension](core-pulse-screenshot.png)

## 🤝 Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License
[MIT](https://choosealicense.com/licenses/mit/)