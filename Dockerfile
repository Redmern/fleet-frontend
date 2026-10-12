# Self-hosted build of the marketing site (served behind Traefik on the VPS).
# GitHub Pages keeps using .github/workflows/deploy.yml; this file does not affect it.
#
#   docker build --build-arg SITE_URL=https://fleet-tui.dev/ -t fleet-frontend:local .
#
# Stage 1 exports the static site; stage 2 only serves the files.

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY FleetMarketing.sln ./
COPY src/FleetMarketing/FleetMarketing.csproj src/FleetMarketing/
COPY src/FleetMarketing.Ssg/FleetMarketing.Ssg.csproj src/FleetMarketing.Ssg/
RUN dotnet restore FleetMarketing.sln
COPY src/ src/
# Absolute URL for og:url / og:image (see Components/App.razor).
ARG SITE_URL=https://fleet-tui.dev/
RUN SiteUrl="$SITE_URL" dotnet run --project src/FleetMarketing.Ssg -c Release -- /dist \
 # Pre-compressed copies for nginx's gzip_static.
 && find /dist -type f -regex '.*\.\(html\|css\|js\|svg\|cast\|webmanifest\|ico\)' -exec gzip -9 -k {} +

FROM nginxinc/nginx-unprivileged:1.28-alpine-slim@sha256:47288214e27cc88b5b3c5277f4fcdb58bc29059f86121b59b9c1e1171938216e
LABEL org.opencontainers.image.source=https://github.com/Redmern/fleet-frontend
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/security-headers.inc /etc/nginx/security-headers.inc
COPY --from=build /dist /usr/share/nginx/html
USER 101
EXPOSE 8080
