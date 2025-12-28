#!/bin/bash

# Manual Zoho Token Exchange
# Replace YOUR_CLIENT_SECRET with your actual secret from Vercel

CLIENT_ID="1000.VLOC41KD9GTRKUL9ZPDK3G2HX4G5YQ"
CLIENT_SECRET="YOUR_CLIENT_SECRET"  # ← Replace this!
AUTH_CODE="1000.cd5c97d5f2e39be2a7c264e8299d409f.a13285032da545b307f93073caeb450e"

curl -X POST "https://accounts.zoho.com/oauth/v2/token" \
  -d "grant_type=authorization_code" \
  -d "client_id=${CLIENT_ID}" \
  -d "client_secret=${CLIENT_SECRET}" \
  -d "redirect_uri=https://www.thelostandunfounds.com/zoho/callback" \
  -d "code=${AUTH_CODE}"

