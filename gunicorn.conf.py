import os
import multiprocessing

# Server socket
bind = f"0.0.0.0:{os.environ.get('PORT', 10000)}"
backlog = 2048

# Worker processes
workers = 1  # Single worker for Socket.IO compatibility
worker_class = "eventlet"
worker_connections = 1000
timeout = 120
keepalive = 2

# Restart workers after this many requests, with up to half that number of jitter
max_requests = 1000
max_requests_jitter = 500

# Restart workers after this many seconds
max_worker_memory = 256  # MB

# Application
module = "src.app:app"
callable = "app"

# Socket
sendfile = False  # Fix for non-blocking socket error

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "streampirex-backend"

# Application preloading
preload_app = True

# SSL (if needed)
# keyfile = None
# certfile = None

# Server mechanics
daemon = False
pidfile = None
user = None
group = None
tmp_upload_dir = None

# Security
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190

# Performance
worker_tmp_dir = "/dev/shm"  # Use memory for temp files (if available)