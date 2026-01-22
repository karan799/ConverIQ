FROM python:3.10-slim

WORKDIR /app

# Install system dependencies required for audio processing
# libsndfile1 is for librosa
# ffmpeg is for proper audio format handling and whisper
RUN apt-get update && apt-get install -y \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
# Using --no-cache-dir to keep image size small
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Set environment variables
# Hugging Face Spaces exposes port 7860 by default
ENV PORT=7860
ENV PYTHONUNBUFFERED=1

# Expose the port
EXPOSE 7860

# Run the application
CMD ["python", "app.py"]
