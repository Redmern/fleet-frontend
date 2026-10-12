# Included by every location in nginx.conf. Traefik's security-headers@file
# also sets HSTS, nosniff, X-Frame-Options and Referrer-Policy.
# The CSP hash is the inline <script> in Components/App.razor: if that script
# changes, update the hash. 'wasm-unsafe-eval' is for the asciinema player.
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'sha256-WZRJfWvsnNCPcxzZwvyhovnZGqhZaC+8gPGPRbx6wTk=' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
