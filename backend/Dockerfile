FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Create non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Install Python dependencies first so code changes reuse this layer
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy only what the API needs at runtime (tests and local env files are excluded)
COPY --chown=appuser:appgroup alembic.ini ./
COPY --chown=appuser:appgroup alembic ./alembic
COPY --chown=appuser:appgroup app ./app
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER appuser

EXPOSE 8000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
