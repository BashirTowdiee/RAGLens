FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./package.json
RUN npm install
COPY next.config.mjs ./next.config.mjs
COPY tsconfig.json ./tsconfig.json
COPY next-env.d.ts ./next-env.d.ts
COPY app ./app
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
