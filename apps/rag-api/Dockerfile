FROM node:22-alpine
WORKDIR /app
COPY package.json ./package.json
RUN npm install --include=dev
COPY tsconfig.json ./tsconfig.json
COPY src ./src
RUN npm run build
ENV NODE_ENV=production
EXPOSE 8000
CMD ["npm", "run", "start"]
