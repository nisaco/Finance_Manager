# Deploying Ledger to Render (render.com)

This repository is pre-configured for one-click or automated Git deployment to [Render](https://render.com).

---

## Method 1: Deploy with Git / GitHub (Recommended)

1. **Export to GitHub**:
   - In Google AI Studio, click the top-right settings/menu icon $\to$ **Export to GitHub** (or download the ZIP and push it to a new GitHub repository).
2. **Log into Render**:
   - Go to [dashboard.render.com](https://dashboard.render.com/) and click **New +** $\to$ **Web Service**.
   - Select your GitHub repository.
3. **Configure the Service**:
   - **Name**: `ledger` (or whatever you prefer)
   - **Language**: `Node`
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (or Starter)
4. **Environment Variables**:
   Under **Environment Variables** in Render, add your secrets (copied from your `.env` or settings):
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: Any random 32+ character string
   - `ADMIN_SECRET_KEY`: Any random secret for stealth admin
   - `GEMINI_API_KEY`: Your Google Gemini API Key
   - `PAYSTACK_SECRET_KEY`: (Optional) Paystack secret key
   - `PAYSTACK_PUBLIC_KEY`: (Optional) Paystack public key
   - `SMTP_USER` / `SMTP_PASS`: (Optional) Gmail App Password for email verification
5. **Click "Deploy Web Service"**:
   - Render will build the Vite frontend, bundle the backend server into `dist/server.cjs`, and launch the app.
   - You will receive an instant public URL like `https://ledger-xxxx.onrender.com`.

---

## Method 2: Deploy using Blueprint (`render.yaml`)

Because this repository already contains `render.yaml`:
1. In Render, click **New +** $\to$ **Blueprint**.
2. Connect your GitHub repository.
3. Render will automatically read `render.yaml`, pre-fill the build commands, auto-generate cryptographic secrets for `JWT_SECRET` and `ADMIN_SECRET_KEY`, and prompt you to input `MONGODB_URI` and `GEMINI_API_KEY`.
4. Click **Apply** to deploy.
