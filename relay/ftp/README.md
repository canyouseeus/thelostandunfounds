# Camera FTP relay

Lets a camera upload straight to a live gallery, frame by frame, with no phone in between.
Cameras that send by FTP include the Canon R5, R6 Mark II, R3 and R1, a 5D Mark IV with Canon's
wireless file transmitter, and most Nikon and Sony pro bodies.

```
camera ──FTP──▶ relay (this folder, on a small server) ──HTTPS──▶ /api/gallery/ingest-* ──▶ Drive inbox
```

Vercel only answers web requests, and FTP needs a connection that stays open plus extra ports for
each file. So the relay runs on its own always-on server and hands every photo to the site's
existing ingest routes, the same ones the upload links use.

## How a photographer logs in

On `/admin/live`, pick the gallery and the shooter, then tap **CAMERA LOGIN**. The page shows what
to type into the camera's FTP settings:

| Camera setting | Value |
|---|---|
| Server | the relay's address (`VITE_FTP_RELAY_HOST`) |
| Port | 21 |
| Login name | anything (`camera`) |
| Password | the 24-character code shown once |
| Passive mode | **On** |
| Image type to send | **JPEG** (raw files are accepted and dropped) |

The password is an upload key (`tlu_live_` + the code). The relay stores no passwords and no
database. It checks every login against `/api/gallery/ingest-info`, so turning the login off on
`/admin/live` stops it working.

Every frame lands in the gallery's **review inbox**, not the gallery itself. A camera sends
everything, including misfires. Publish the keepers from `/admin/live`.

The camera hears "sent" only after the site has recorded the photo. If anything fails along the
way, the camera is told the send failed, and its own retry sends it again.

## Deploying

You need a small Linux server with a public IPv4 address that is its own: a DigitalOcean droplet,
Hetzner CX22, Lightsail or similar, about $4–6 a month. Pick a region near Austin. Container
platforms that put a proxy in front (Fly.io, Railway, Render) don't work, because FTP's second
connection has to reach the same machine directly.

```bash
# On the server, as root (Ubuntu/Debian):
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs
mkdir -p /opt/tlu-camera-relay
# copy server.mjs and tlu-camera-relay.service from this folder to the server, then:
cp server.mjs /opt/tlu-camera-relay/
cp tlu-camera-relay.service /etc/systemd/system/

cat > /etc/tlu-camera-relay.env <<'EOF'
PASV_HOST=203.0.113.10          # this server's public IPv4
SITE_URL=https://www.thelostandunfounds.com
PASV_PORT_MIN=30000
PASV_PORT_MAX=30009
EOF

# Open the firewall: 21 for control, 30000-30009 for the photos themselves.
ufw allow 21/tcp && ufw allow 30000:30009/tcp

systemctl daemon-reload && systemctl enable --now tlu-camera-relay
journalctl -u tlu-camera-relay -f      # one line per login and per photo
```

Then set `VITE_FTP_RELAY_HOST` in Vercel to the server's IP (or a DNS name such as
`ftp.thelostandunfounds.com` pointed at it) and redeploy, so CAMERA LOGIN shows the right server.

### Optional: encrypted FTP (FTPS)

Plain FTP sends the password unencrypted. On a phone hotspot that's a small risk, and the most a
stolen login can do is add photos to one gallery's review inbox. To encrypt anyway, give the relay
a certificate for its DNS name, then set *FTP (FTPS)* or *explicit TLS* in the camera:

```bash
apt-get install -y certbot && certbot certonly --standalone -d ftp.thelostandunfounds.com
# add to /etc/tlu-camera-relay.env:
TLS_CERT_FILE=/etc/letsencrypt/live/ftp.thelostandunfounds.com/fullchain.pem
TLS_KEY_FILE=/etc/letsencrypt/live/ftp.thelostandunfounds.com/privkey.pem
```

(The service runs as a throwaway user, so make those two files readable to it, or copy them into
`/etc/tlu-camera-relay/` on renewal.)

## Checking it

```bash
node relay/ftp/verify-relay.mjs     # drives the relay with curl against a stub site
```

Against the real server, from any computer:

```bash
curl --ftp-pasv -u camera:<code> -T test.jpg ftp://<relay>/test.jpg
```

Then confirm `test.jpg` is in the review inbox on `/admin/live`, and discard it.
