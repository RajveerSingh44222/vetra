# Vetra — Own Your Credentials

Vetra is a secure, client-side encrypted password manager concept built around zero-knowledge cryptographic principles. It derivations encryption keys in-browser using standard Web Cryptography APIs, ensuring the host server never stores or views plain credentials.

## Features
- **Landing Page Sandbox**: Live browser-based cryptographic playground showcasing AES-GCM-256 encryption.
- **Micro-Animated Transitions**: Decryption loading sequences depicting key derivation (PBKDF2 stretching).
- **Interactive Dashboard**: Modern dark-themed workspace featuring password audit statistics, search filtering, and CRUD vault operations.
- **Embedded Password Generator**: Customizable length sliders and character group selectors.

## Running Locally
To launch Vetra locally, start a local HTTP server in this directory:

### Option A: Using Python (Built-in)
```bash
python -m http.server 8080
```
Then visit: `http://localhost:8080` in your web browser.

### Option B: Using Node (npx)
```bash
npx serve .
```
Then visit: `http://localhost:3000` in your web browser.

Alternatively, you can open `index.html` directly in modern web browsers that support standard JavaScript modules.
