FROM node:20-alpine
WORKDIR /app
RUN mkdir -p /app/data
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "src/index.js"]
