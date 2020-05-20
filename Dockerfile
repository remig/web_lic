FROM node:14 as builder

WORKDIR /web_lic
COPY src /web_lic/src/
COPY static  /web_lic/static/
COPY languages /web_lic/languages/
COPY .htmlnanorc *.json *.html *.ico *.js /web_lic/

# get latest ldraw library (Caution: will be cached by Docker)
RUN curl -Lo /tmp/ldraw.zip https://www.ldraw.org/library/updates/complete.zip && \
  unzip /tmp/ldraw.zip -d /web_lic > /dev/null && \
  rm -f /tmp/ldraw.zip

# build lic_web
RUN npm install
RUN npm run build

# final image without all the build clutter
# ================================================
FROM nginx

# copy final app to image
COPY --from=builder /web_lic/dist /usr/share/nginx/html
