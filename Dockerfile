FROM python:3.11-slim

# Set the working directory
WORKDIR /app

# Copy project files into the container
COPY . .

# Install dependencies
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Expose the port Render uses
EXPOSE 10000

# Start the Flask app using Gunicorn with the eventlet worker
CMD ["gunicorn", "-k", "eventlet", "-w", "1", "src.app:app", "--bind", "0.0.0.0:10000"]
