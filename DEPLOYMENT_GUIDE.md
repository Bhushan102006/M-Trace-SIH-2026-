# M-TRACE / MPLADS IntelliTrack — Deployment Guide

This guide covers deploying the **M-TRACE** full-stack system:
- **Frontend (React + Vite + TailwindCSS)** → Deployed on **Vercel**
- **Backend (FastAPI + ML Intelligence Engine)** → Deployed on **Render** (or Railway / Docker)

---

## Architecture Overview

```
┌─────────────────────────────────┐
│     Client / Web Browser        │
└───────────────┬─────────────────┘
                │
        HTTPS Requests
                │
        ┌───────┴────────────────────────┐
        │                                │
        ▼                                ▼
┌──────────────────────┐      ┌─────────────────────────────┐
│   Vercel (Frontend)  │      │   Render (Backend API)      │
│  React 18 + Vite SPA │      │  FastAPI + Scikit-Learn     │
│  Global Edge CDN     │      │  M-Trace AI Anomaly Engine  │
│  *.vercel.app        │      │  *.onrender.com             │
└──────────────────────┘      └─────────────────────────────┘
```

> **Why split across Vercel & Render?**  
> Vercel is great for React/Vite frontends, but its serverless functions have a strict **250MB uncompressed limit**. Because M-TRACE uses heavy scientific packages (`scikit-learn`, `scipy`, `pandas`, `numpy`), hosting the backend on a dedicated container service like **Render** or **Railway** ensures zero timeouts, no cold starts, and full ML model execution.

---

## Part 1: Deploy Backend on Render (Free)

### Option A: Using Render Dashboard (Recommended)

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Configure production deployment settings"
   git push origin main
   ```

2. **Create Web Service on Render**:
   - Go to [dashboard.render.com](https://dashboard.render.com/) and sign in with GitHub.
   - Click **"New +"** → **"Web Service"**.
   - Select your repository (`M-Trace-SIH-2026-` or your repo name).

3. **Configure the Service**:
   - **Name**: `m-trace-backend`
   - **Region**: Choose closest to your users (e.g., *Singapore* or *Frankfurt*)
   - **Root Directory**: `mplads-sentinel/backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`

4. **Add Environment Variables** (under "Advanced"):
   - `PYTHON_VERSION` = `3.11.9`
   - `ALLOWED_ORIGINS` = `*` *(or your Vercel URL once deployed)*

5. **Deploy**:
   - Click **"Create Web Service"**.
   - Wait 2–3 minutes for the build to finish.
   - Copy your live backend URL (e.g. `https://m-trace-backend.onrender.com`).
   - Test it by opening `https://m-trace-backend.onrender.com/health` in your browser. You should see `{"status":"ok", ...}`.

---

## Part 2: Deploy Frontend on Vercel (Free)

1. **Go to Vercel**:
   - Visit [vercel.com](https://vercel.com/) and log in with your GitHub account.
   - Click **"Add New..."** → **"Project"**.
   - Import your GitHub repository.

2. **Configure Project Settings**:
   - **Project Name**: `mplads-sentinel` (or `m-trace`)
   - **Framework Preset**: `Vite` (Vercel automatically detects Vite)
   - **Root Directory**: Click "Edit" and choose:
     ```
     mplads-sentinel/frontend
     ```
     *(Note: If you leave it at root `./`, our root `vercel.json` will also handle it, but setting Root Directory to `mplads-sentinel/frontend` is the cleanest approach).*

3. **Configure Environment Variables**:
   - Expand the **"Environment Variables"** section.
   - Add the following variable:
     - **Key**: `VITE_API_BASE_URL`
     - **Value**: Your Render backend URL (e.g. `https://m-trace-backend.onrender.com`)
       *(Do NOT include a trailing slash)*

4. **Deploy**:
   - Click **"Deploy"**.
   - Vercel will build the frontend in ~30–45 seconds.
   - You will receive your live URL: `https://your-project.vercel.app`!

---

## Part 3: Verify the Live Deployment

1. Open your Vercel URL in your browser.
2. Check the browser console (F12) to verify:
   - API calls (`/api/stats`, `/api/projects`, etc.) return `200 OK`.
3. Try navigating between pages:
   - **Executive Dashboard**
   - **Work Progress Tracker**
   - **Cost & Delay Analytics**
   - **Verification Cases**
4. Test human-in-the-loop actions:
   - Switch role (e.g., MoSPI Admin, State Nodal, District Authority).
   - Review a verification case or inspect project health cards.

---

## Local Development vs. Production Summary

| Setting | Local Development | Production (Vercel + Render) |
|---|---|---|
| **Frontend Base URL** | Automatically falls back to `http://localhost:8000` | Configured via `VITE_API_BASE_URL` in Vercel |
| **Backend CORS** | Accepts `localhost:5173`, `127.0.0.1:5173` | Automatically permits `https://*.vercel.app` & custom origins |
| **Routing** | Handled by Vite dev server | Handled by `vercel.json` SPA rewrites |
| **Port Binding** | Fixed port 8000 | Dynamic `$PORT` managed by cloud host |
