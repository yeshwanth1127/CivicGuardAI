# ml-service — serves the trained winning model over HTTP so the Node backend
# can classify uploaded issue photos. Runs Python 3.12 in a container, which
# sidesteps the host's Python-version/TensorFlow limitations entirely.
FROM python:3.12-slim

WORKDIR /app

# Runtime libs Pillow needs to decode JPEG/PNG (the slim base image omits them).
RUN apt-get update && apt-get install -y --no-install-recommends \
    libjpeg62-turbo zlib1g \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first (cached layer — only re-runs if requirements change).
COPY requirements-serve.txt .
RUN pip install --no-cache-dir -r requirements-serve.txt

# App code + the trained winning model + the comparison results the admin
# Model Comparison page reads. Training data/scripts are excluded via .dockerignore.
COPY app ./app
COPY artifacts/winning_model ./artifacts/winning_model
COPY artifacts/comparison_results.json ./artifacts/comparison_results.json

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
