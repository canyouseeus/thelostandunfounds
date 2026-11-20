#!/bin/bash

# Zoho Refresh Token Generator
# Opens Zoho's consent page, catches the redirect on localhost, exchanges the
# code and copies the refresh token to your clipboard. Nothing secret is shown.
#
# One-time setup: the Zoho client must list this Authorized Redirect URI:
#   http://localhost:8765/zoho/callback

PORT=8765
REDIRECT_URI="http://localhost:${PORT}/zoho/callback"

echo "🔐 Zoho Mail Refresh Token Generator"
echo "===================================="
echo ""

read -p "Enter your ZOHO_CLIENT_ID (starts with 1000.): " CLIENT_ID
if [ -z "$CLIENT_ID" ]; then
  echo "❌ Client ID is required"
  exit 1
fi

read -s -p "Enter your ZOHO_CLIENT_SECRET (hidden): " CLIENT_SECRET
echo ""
if [ -z "$CLIENT_SECRET" ]; then
  echo "❌ Client Secret is required"
  exit 1
fi

# One consent covers sending (transactional mail) and reading (admin Platform
# Webmail). Without folders.READ and messages.READ the webmail can't list
# folders or open messages.
SCOPES="ZohoMail.messages.CREATE,ZohoMail.messages.READ,ZohoMail.folders.READ,ZohoMail.accounts.READ,ZohoMail.organization.READ"

AUTH_URL="https://accounts.zoho.com/oauth/v2/auth?scope=${SCOPES}&client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&access_type=offline&prompt=consent"

echo ""
echo "🌐 Opening Zoho in your browser. Click Accept, then come back here."
echo "   (If it doesn't open, open this link yourself:)"
echo "   $AUTH_URL"
echo ""

# Wait for Zoho to redirect back to localhost and grab the code.
CODE_FILE=$(mktemp)
python3 - "$PORT" "$CODE_FILE" <<'PY' &
import sys, http.server, urllib.parse
port, out = int(sys.argv[1]), sys.argv[2]
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        code = q.get("code", [""])[0]
        err = q.get("error", [""])[0]
        with open(out, "w") as f:
            f.write(code if code else "ERROR:" + (err or "no code"))
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        msg = "Done. You can close this tab and go back to the terminal." if code else "Zoho didn't return a code. Check the terminal."
        self.wfile.write(f"<html><body style='font-family:sans-serif;padding:40px'><h2>{msg}</h2></body></html>".encode())
    def log_message(self, *a):
        pass
srv = http.server.HTTPServer(("127.0.0.1", port), H)
srv.timeout = 300
srv.handle_request()
PY
SERVER_PID=$!
sleep 0.5

if command -v open >/dev/null 2>&1; then
  open "$AUTH_URL"
fi

echo "⏳ Waiting for you to approve in the browser (5 minutes max)..."
wait $SERVER_PID
AUTH_CODE=$(cat "$CODE_FILE" 2>/dev/null)
rm -f "$CODE_FILE"

if [ -z "$AUTH_CODE" ] || [[ "$AUTH_CODE" == ERROR:* ]]; then
  echo "❌ Didn't get a code from Zoho (${AUTH_CODE#ERROR:})."
  echo "   Check that http://localhost:${PORT}/zoho/callback is an Authorized Redirect URI on the client."
  exit 1
fi

echo "🔄 Exchanging code for refresh token..."

RESPONSE=$(curl -s -X POST "https://accounts.zoho.com/oauth/v2/token" \
  --data-urlencode "grant_type=authorization_code" \
  --data-urlencode "client_id=${CLIENT_ID}" \
  --data-urlencode "client_secret=${CLIENT_SECRET}" \
  --data-urlencode "redirect_uri=${REDIRECT_URI}" \
  --data-urlencode "code=${AUTH_CODE}")

if echo "$RESPONSE" | grep -q '"error"'; then
  ERR=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('error', 'unknown error'))" 2>/dev/null)
  echo "❌ Zoho returned an error: ${ERR:-unknown error}"
  exit 1
fi

REFRESH_TOKEN=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('refresh_token', ''))" 2>/dev/null)

if [ -z "$REFRESH_TOKEN" ]; then
  echo "❌ No refresh token in Zoho's response."
  exit 1
fi

if command -v pbcopy >/dev/null 2>&1; then
  printf '%s' "$REFRESH_TOKEN" | pbcopy
  echo "✅ Refresh token copied to your clipboard (not shown)."
else
  read -p "✅ Got a refresh token, but can't copy it here. Show it on screen? (y/N): " SHOW
  if [[ "$SHOW" == "y" || "$SHOW" == "Y" ]]; then
    echo "$REFRESH_TOKEN"
  fi
fi

unset CLIENT_SECRET REFRESH_TOKEN RESPONSE AUTH_CODE

echo ""
echo "📋 Next: paste it into ZOHO_REFRESH_TOKEN in Vercel (Sensitive), then redeploy."
