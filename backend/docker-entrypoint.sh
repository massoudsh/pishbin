#!/bin/sh
# Container entrypoint: optionally apply Alembic migrations, then start the API.
set -eu

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "Applying database migrations (alembic upgrade head)..."
  alembic upgrade head
fi

exec "$@"
