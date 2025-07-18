# Use official Node.js image
FROM node:18

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy everything else (including views, public, routes, etc.)
COPY . .

# Install dotenv just in case
RUN npm install dotenv

# Expose port (should match process.env.PORT)
EXPOSE 3000

CMD ["node", "index.js"]