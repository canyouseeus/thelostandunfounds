# Zoho OAuth Redirect URIs

When setting up your Zoho OAuth client, use these redirect URIs:

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
- Zoho allows multiple redirect URIs per OAuth client
- After adding URIs, save the OAuth client before generating tokens
- The redirect URI must match exactly what you provide during token generation
