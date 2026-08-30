# One image, two roles: run it as the web tier (`npm start`) or the worker tier (`npm run worker`).
# docker-compose selects the command per service; both share the same code and dependencies.
FROM node:20-slim

WORKDIR /app

# Install dependencies from the lockfile (includes tsx, which the worker runs at runtime).
COPY package.json package-lock.json ./
RUN npm ci

# Build the Next.js web tier.
COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

# Default to the web tier; the worker service overrides this with `npm run worker`.
CMD ["npm", "start"]
