# Deploy to Netlify

## Option 1: Netlify Drop (Easiest - 30 seconds)

1. Go to [https://app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag the `project.html` file into the browser window
3. Netlify will give you a live URL like `https://random-name.netlify.app`
4. Done.

## Option 2: Netlify CLI (For future updates)

### Install CLI
```bash
npm install -g netlify-cli
```

### Deploy
```bash
netlify deploy --prod --dir=.
```

This will:
- Upload the current directory as a static site
- Give you a production URL
- Enable automatic deploys if you later connect a Git repo

### Site settings
- **Publish directory:** `.` (root)
- **No build command needed** (it's a static HTML file)

## Option 3: Git-based deploy (Best for ongoing updates)

1. Push this repo to GitHub/GitLab
2. Go to [https://app.netlify.com/start](https://app.netlify.com/start)
3. Select your Git provider
4. Choose this repository
5. Settings:
   - **Build command:** leave empty
   - **Publish directory:** `.`
6. Click **Deploy site**

Every time you push to Git, Netlify will auto-deploy.
