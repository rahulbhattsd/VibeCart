# 🛒 VibeCart – Sneaker E-Commerce Platform

VibeCart is a modern e-commerce web application for sneaker lovers.  
It provides a fast, responsive, and clean shopping experience using the MERN stack.

---

## 🚀 Tech Stack

**Frontend**
- ⚛️ React.js (Vite for fast builds)
- 🎨 CSS (custom responsive design)
- 📜 JavaScript (ES6+)

**Backend**
- 🟢 Node.js + Express.js
- 🍃 MongoDB (Atlas for production)
- 🔑 Google OAuth (Login with Google)

---

## ✨ Features

- 🔍 Sneaker Listings – Browse sneakers with price, description, and images
- 🛍️ Add to Cart – Manage your shopping cart in real-time
- 🔐 Google Login – Secure authentication via Google
- 📱 Responsive UI – Works seamlessly on desktop and mobile
- ⚡ Fast Loading – Built with Vite for blazing-fast performance
- 🌐 Production Ready – Works on both development and production environments

---

## 📂 Project Structure

```
VibeCart/
├── backend/         # Express.js backend
├── public/          # Static assets
├── src/             # React frontend source
│   ├── components/  # Reusable UI components
│   ├── pages/       # Page-level components
│   ├── styles/      # CSS files
│   └── App.jsx
├── package.json
└── README.md
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository

```bash
git clone https://github.com/rahulbhattsd/vibecart.git
cd vibecart
```

### 2️⃣ Install frontend dependencies

```bash
cd frontend
npm install
```

### 3️⃣ Setup environment variables

Create a `.env` file in the backend folder and add the following:

```ini
MONGO_URI=your_mongodb_connection_string
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
JWT_SECRET=your_jwt_secret
```

---

<p>© 2025 VibeCart. All rights reserved.</p>
