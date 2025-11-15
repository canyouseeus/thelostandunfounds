# Install Node.js on Mac

## You have Homebrew! Run these commands:

### Step 1: Install Node.js
```bash
brew install node
```

This will install both Node.js and npm.

### Step 2: Verify Installation
```bash
node --version
npm --version
```

You should see version numbers (e.g., v20.x.x and 10.x.x)

### Step 3: Navigate to Your Project
```bash
cd /path/to/thelostandunfounds
# Replace with your actual project path
```

### Step 4: Install Project Dependencies
```bash
npm install
```

### Step 5: Install Vercel CLI
```bash
npm i -g vercel
```

### Step 6: Set Up Environment Variables
```bash
# Copy example file
cp .env.example .env.local

# Add your Fourthwall token (edit the file)
nano .env.local
# Add: FOURTHWALL_STOREFRONT_TOKEN=your_token_here
```

### Step 7: Start Dev Server with API Support
```bash
vercel dev
```

### Step 8: Visit Shop
Open: http://localhost:3000/shop

---

## Quick One-Liner Sequence

```bash
brew install node && \
cd /path/to/thelostandunfounds && \
npm install && \
npm i -g vercel && \
cp .env.example .env.local && \
vercel dev
```

(You'll need to add your FOURTHWALL_STOREFRONT_TOKEN to .env.local before starting)
