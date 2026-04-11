# Use Node.js base image
FROM node:20-slim

# Set working directory
WORKDIR /usr/src/app

# Copy package configuration
COPY package*.json ./

# Install production dependencies
# Note: Since this is a React app built during the image creation,
# we need devDependencies for the 'npm run build' step.
RUN npm install

# Copy application source
COPY . .

# Build the production assets
RUN npm run build

# Expose the port used by Cloud Run
EXPOSE 8080

# Start the Express server
CMD ["npm", "start"]
