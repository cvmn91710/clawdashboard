#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "Running database migrations..."
  npx prisma db push --skip-generate
fi

exec node server.js
