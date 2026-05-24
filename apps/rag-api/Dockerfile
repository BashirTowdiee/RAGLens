FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./package.json
RUN npm install
COPY tsconfig.json ./tsconfig.json
COPY src ./src
RUN npm run build
EXPOSE 8000
CMD ["npm", "run", "start"]
