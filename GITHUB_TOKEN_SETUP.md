# GitHub Token Setup for Developer Activity Page

This guide explains how to add a GitHub Personal Access Token to increase your API rate limit from 60 to 5,000 requests per hour.

## Why Add a GitHub Token?

Without a token:
- ⚠️ 60 requests/hour limit
- May hit rate limits with multiple repositories
- Slower data fetching

With a token:
- ✅ 5,000 requests/hour limit
- Faster and more reliable data fetching
- Access to more repository data

## Step-by-Step Instructions

### 1. Create a GitHub Personal Access Token

1. Go to [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens)
   - Or navigate: GitHub Profile → Settings → Developer settings → Personal access tokens → Tokens (classic)

2. Click **"Generate new token"** → **"Generate new token (classic)"**

3. Configure your token:
   - **Note**: Enter a descriptive name like "Verana Visualizer - Dev Activity"
   - **Expiration**: Choose your preferred expiration (90 days recommended)
   - **Scopes**: Select **`public_repo`** (under "repo" section)
     - This allows read-only access to public repositories
     - ✅ Safe: Does not grant write access

4. Click **"Generate token"** at the bottom

5. **IMPORTANT**: Copy the token immediately - you won't be able to see it again!
   - The token will look like: `ghp_1234567890abcdefghijklmnopqrstuvwxyz`

### 2. Add Token to Your Project

1. **Create a `.env.local` file** in your project root (if it doesn't exist):
   ```bash
   touch .env.local
   ```

2. **Add your token** to `.env.local`:
   ```bash
   NEXT_PUBLIC_GITHUB_TOKEN=ghp_your_token_here
   ```
   
   Replace `ghp_your_token_here` with your actual token.

3. **Security Note**: `.env.local` should already be in `.gitignore` and won't be committed to version control.

### 3. Restart Your Development Server

Stop your current dev server (Ctrl+C) and restart it:

```bash
npm run dev
```

### 4. Verify It's Working

1. Open the Developer Activity page: http://localhost:3000/developer-activity
2. Check the browser console (F12) - you should see:
   ```
   ✅ GitHub API: Using authenticated requests (5,000 requests/hour limit)
   ```
3. The info box at the bottom should show green with "GitHub Token Configured ✓"

## File Structure

```
verana-visualizer/
├── .env.local           # ← Add your token here (DO NOT COMMIT)
├── env.example          # ← Template with instructions
└── src/
    └── app/
        └── developer-activity/
            └── page.tsx # ← Configure ORGANIZATION name here
```

## Troubleshooting

### Token Not Working?

1. **Check the token format**: Should start with `ghp_`
2. **Verify the environment variable name**: Must be exactly `NEXT_PUBLIC_GITHUB_TOKEN`
3. **Restart the dev server**: Changes to `.env.local` require a restart
4. **Check token permissions**: Must have `public_repo` scope enabled
5. **Token expired?**: Check expiration date on GitHub

### Still Getting Rate Limited?

1. Clear browser cache and reload
2. Check if the token is actually being used (console should show authenticated message)
3. Verify the token hasn't been revoked on GitHub

### Organization Not Found?

Update the organization name in `src/app/developer-activity/page.tsx`:

```typescript
const ORGANIZATION = 'verana-labs' // ← Change to your actual organization
```

## Security Best Practices

✅ **DO**:
- Store tokens in `.env.local` (not committed to git)
- Use tokens with minimal required permissions (`public_repo`)
- Set expiration dates on tokens
- Revoke tokens if compromised

❌ **DON'T**:
- Commit `.env.local` to version control
- Share your token publicly
- Use tokens with admin permissions
- Hard-code tokens in source files

## Production Deployment

For production deployments, add the token as an environment variable in your hosting platform:

- **Vercel**: Project Settings → Environment Variables
- **Netlify**: Site Settings → Environment Variables  
- **AWS/Azure/GCP**: Configure in deployment settings
- **Docker**: Pass as environment variable in docker-compose or Kubernetes

Variable name: `NEXT_PUBLIC_GITHUB_TOKEN`

## Token Management

### Revoking a Token

If you need to revoke a token:
1. Go to [GitHub Tokens](https://github.com/settings/tokens)
2. Find your token in the list
3. Click "Delete"
4. Generate a new token if needed

### Token Expiration

When your token expires:
1. You'll see rate limit warnings again
2. Generate a new token following the same steps
3. Update `.env.local` with the new token
4. Restart your dev server

## Additional Resources

- [GitHub Docs: Creating a Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [GitHub API Rate Limiting](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

