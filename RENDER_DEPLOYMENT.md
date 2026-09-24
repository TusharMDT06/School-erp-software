# 🚀 Render Deployment Guide — School ERP System

Yeh guide aapko **School ERP System** ko **Render (`render.com`)** par step-by-step deploy karne me madad karegi.

---

## 📋 Architecture on Render

Hum application ko 2 services me deploy karenge:
1. **Backend Web Service (`school-erp-backend`)**: Node.js + Express API + Socket.io Server (Free Tier)
2. **Frontend Static Site (`school-erp-frontend`)**: React + Vite + Tailwind (Free Tier with Global CDN)

---

## 🛠️ Prerequisites (Deploy karne se pehle zaroori cheezein)

1. **GitHub Repository**: Latest code GitHub par pushed hona chahiye (`main` branch).
2. **Render Account**: [render.com](https://render.com) par free account banayein (GitHub se sign in karein).
3. **MongoDB Atlas Database URI**:
   - Render par local MongoDB (`localhost:27017`) nahi chalta.
   - [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) par ek **Free M0 Cluster** banayein.
   - **Network Access**: IP Access list me `0.0.0.0/0` (Allow access from anywhere) add karein taki Render connect kar sake.
   - **Database User**: Username & Password create karein.
   - Connection String copy karein:  
     `mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/school_erp?retryWrites=true&w=majority`

---

## ⚡ Method 1: Automatic Blueprint Deployment (Recommended & Fastest)

Repository me already **`render.yaml`** config file set hai.

1. **Render Dashboard** par login karein.
2. Left side menu me **Blueprints** par click karein.
3. **"New Blueprint Instance"** button dabayein.
4. Apna GitHub repo select karein (`TusharMDT06/School-erp-software`).
5. Render automatically `render.yaml` ko padh lega aur 2 services setup karega:
   - `school-erp-backend` (Web Service)
   - `school-erp-frontend` (Static Site)
6. Jo Environment Variables blank dikh rahe hain (`sync: false`), unhe fill karein:
   - **MONGO_URI**: Apna MongoDB Atlas connection string dalein.
   - **RESEND_API_KEY**: Resend API key (`re_...`).
   - **GEMINI_API_KEY**: Gemini API key.
   - **CLOUDINARY_***: Cloudinary keys (ya blank chhod sakte hain).
   - **RAZORPAY_***: Razorpay test keys (ya blank chhod sakte hain).
7. **"Apply"** par click karein.
8. Render dono services ko build aur deploy karna shuru kar dega.

---

## 🛠️ Method 2: Manual Deployment (Step-by-Step)

Agar aap manually dono services create karna chahte hain:

### Step 2.1: Backend Web Service Deploy Karein

1. Render Dashboard me **"New +"** -> **"Web Service"** par click karein.
2. Apna GitHub repository choose karein.
3. Niche di gayi details fill karein:
   - **Name**: `school-erp-backend`
   - **Region**: Oregon (US West) ya Singapore
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`
4. **Environment Variables** add karein:
   | Key | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Production mode |
   | `PORT` | `10000` | Render port |
   | `MONGO_URI` | `mongodb+srv://...` | MongoDB Atlas URI |
   | `JWT_SECRET` | *(Koi bhi secret string)* | JWT Token secret |
   | `JWT_REFRESH_SECRET` | *(Koi bhi secret string)* | Refresh Token secret |
   | `SIGNUP_TOKEN_SECRET` | *(Koi bhi secret string)* | Student Signup secret |
   | `JWT_ACCESS_EXPIRES` | `15m` | Token expiry |
   | `JWT_REFRESH_EXPIRES` | `7d` | Refresh token expiry |
   | `CLIENT_URL` | `https://school-erp-frontend.onrender.com` | Frontend URL *(Step 2.2 ke baad update karein)* |
   | `RESEND_API_KEY` | `re_...` | Resend API key |
   | `RESEND_FROM` | `School ERP <onboarding@resend.dev>` | Email sender |
   | `GEMINI_API_KEY` | `AQ.Ab...` | Google AI key |
   | `GEMINI_MODEL` | `gemini-3.5-flash-lite` | AI Model name |
   | `CLOUDINARY_CLOUD_NAME` | `yiuiauvg` | Cloudinary name |
   | `CLOUDINARY_API_KEY` | `429882716493815` | Cloudinary API Key |
   | `CLOUDINARY_API_SECRET` | `...` | Cloudinary Secret |
   | `RAZORPAY_KEY_ID` | `rzp_test_TJ9y9IYHcizhjK` | Razorpay Key ID |
   | `RAZORPAY_KEY_SECRET` | `...` | Razorpay Key Secret |

5. **"Deploy Web Service"** par click karein.
6. Deployment finish hone ke baad aapko Backend ka URL milega (e.g. `https://school-erp-backend-xxxx.onrender.com`).
7. Is URL ko copy karein.

---

### Step 2.2: Frontend Static Site Deploy Karein

1. Render Dashboard me **"New +"** -> **"Static Site"** par click karein.
2. Apna GitHub repository select karein.
3. Niche di gayi details fill karein:
   - **Name**: `school-erp-frontend`
   - **Branch**: `main`
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. **Environment Variables** add karein:
   | Key | Value | Example |
   |---|---|---|
   | `VITE_API_URL` | `https://<backend-url>/api` | `https://school-erp-backend-xxxx.onrender.com/api` |
   | `VITE_SOCKET_URL` | `https://<backend-url>` | `https://school-erp-backend-xxxx.onrender.com` |

5. **Redirects/Rewrites Rule (SPA Routing)**:
   - Repository ke `client/public/_redirects` me already rule configured hai:
     `/*    /index.html   200`
   - (Aap Render dashboard me Settings -> "Redirects / Rewrites" me bhi check kar sakte hain: Action: `Rewrite`, Source: `/*`, Destination: `/index.html`).
6. **"Create Static Site"** par click karein.
7. Deploy finish hone par aapko Frontend URL mil jayega (e.g. `https://school-erp-frontend-xxxx.onrender.com`).

---

### Step 2.3: Final Link (Frontend & Backend ko jodein)

1. Backend Web Service (`school-erp-backend`) ki **Environment** tab me jayein.
2. `CLIENT_URL` ko apne Frontend ke exact Render URL se update karein:
   - `CLIENT_URL` = `https://school-erp-frontend-xxxx.onrender.com`
3. **Save Changes** karein (Backend automatically re-deploy ho jayega).

---

## 🗄️ Initial Database Seed (Data load karna)

Naye MongoDB Atlas database me demo data load karne ke liye:

**Option A (Apne computer se)**:
1. `server/.env` me `MONGO_URI` ko apne MongoDB Atlas connection string se temporarily replace karein.
2. Terminal me run karein:
   ```bash
   cd server
   node seed-all.js
   ```
3. Data load ho jane ke baad default login credentials use karke verify karein:
   - **Super Admin**: `admin@school.edu` / `Admin@123`
   - **Principal**: `principal@school.edu` / `Admin@123`
   - **Teacher**: `vikram.maths@school.edu` / `Password@123`
   - **Parent**: `parent@school.edu` / `Password@123`
   - **Student**: `aarav.student@school.edu` / `Password@123`
   - **Personal Account**: `tusharrajput857@gmail.com`

---

## 💡 Important Tips for Render Free Tier

1. **Sleep / Spin Down**: Render Free Web Services 15 minute bina request ke inactive hone par sleep mode me chale jaate hain. Pehli request aane par server ko wake up hone me ~30–50 seconds lag sakte hain.
2. **Custom Domain**: Agar aapke paas apna custom domain hai (e.g. `schoolerp.com`), toh Render Settings -> Custom Domains me jakar easily connect kar sakte hain.
