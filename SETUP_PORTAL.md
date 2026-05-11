# 🚀 Setting Up Your Hermes Portal

This is a high-end, modern web interface for interacting with your Hermes Agent.

## 🛠️ How to Make it Live

Since this is a frontend-only SPA (Single Page Application), you have two main options for deployment:

### Option A: The Fast Route (Static Hosting)
If you just want to see the UI and test it locally:
1. Use a static site host like **Vercel**, **Netlify**, or **GitHub Pages**.
2. Upload the `hermes-portal/` folder.
3. Your site is live! (Note: It won't be able to "talk" to the agent until you connect it to a gateway).

### Option B: The Full Route (Connected to Hermes)
To make the site actually work as your AI Command Center:
1. **Deploy the Frontend:** Host the files in `hermes-portal/` on any web server (Nginx, Apache, or a simple Node.js app).
2. **Configure the Gateway:** 
   - Ensure your **Hermes Gateway** is running on your server.
   - Set your `API_URL` in `app.js` to point to your server's public IP or domain (e.g., `https://your-api.com/api/chat`).
3. **SSL/HTTPS:** Since you are uploading files and sending messages, you **MUST** use HTTPS. Use **Certbot (Let's Encrypt)** to get a free SSL certificate for your domain.
4. **Firewall:** Open ports `80` (HTTP) and `443` (HTTPS) on your server to allow the website to communicate.

## 🎨 Design Specs
- **Theme:** Cyber-Minimalism (Deep Charcoal & Neon Blue/Purple)
- **Experience:** Mobile-first, WhatsApp-style bubbles, Glassmorphism
- **Capabilities:** Text chat, File/Image uploads, Session history sidebar
