# Zoho OAuth Configuration

When setting up your Zoho OAuth client, use these values:

## Production Redirect URIs

```
https://thelostandunfounds.com/oauth/callback
https://www.thelostandunfounds.com/oauth/callback
```

## Development Redirect URIs

```
http://localhost:3000/oauth/callback
http://localhost:5173/oauth/callback
```

## Quick Copy (for Zoho API Console)

**Production:**
```
https://thelostandunfounds.com/oauth/callback
```

**Development:**
```
http://localhost:3000/oauth/callback
```

## Notes

- Add all redirect URIs you might use (both with and without `www`)
- Add all JavaScript domains you'll use
- Zoho allows multiple redirect URIs and domains per OAuth client
- After adding URIs and domains, save the OAuth client before generating tokens
- The redirect URI must match exactly what you provide during token generation

## Authorized JavaScript Domains

**Production (COPY THESE):**
```
https://thelostandunfounds.com
https://www.thelostandunfounds.com
```

**Development:**
```
http://localhost:3000
http://localhost:5173
```
