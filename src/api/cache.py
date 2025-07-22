# api/cache.py
from flask_caching import Cache

# Initialize cache instance
cache = Cache(config={
    'CACHE_TYPE': 'SimpleCache',  # Use SimpleCache for development
    'CACHE_DEFAULT_TIMEOUT': 300  # 5 minutes default timeout
})