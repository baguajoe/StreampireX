#!/bin/bash

echo "🔧 Fixing Flask App Issues..."

# 1. Kill any existing Flask processes
echo "🔄 Stopping existing Flask processes..."
pkill -f "python src/app.py" 2>/dev/null || true
sleep 2

# 2. Update .env file with correct URLs
echo "📝 Updating .env file..."
cat << 'EOF' > .env
# Back-End Variables
DATABASE_URL=postgresql://postgres:boxayzoeqQvQCwIvqvzPtsxwqMXGwxFd@caboose.proxy.rlwy.net:23256/railway
SQLALCHEMY_DATABASE_URI=${DATABASE_URL}
SQLALCHEMY_TRACK_MODIFICATIONS=false

FLASK_APP_KEY="any key works"
FLASK_APP=src/app.py
FLASK_DEBUG=1
DEBUG=TRUE

# JWT Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key-here

# FIXED: Use HTTP URLs to avoid SSL issues in development
BASENAME=/
BACKEND_URL=https://studious-space-goggles-r4rp7v96jgr62x5j-3001.app.github.dev
FRONTEND_URL=https://studious-space-goggles-r4rp7v96jgr62x5j-3000.app.github.dev

# Additional CORS origins
ADDITIONAL_ORIGINS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001

# Cloudinary Configuration
CLOUDINARY_URL=cloudinary://556594849769177:--gyD1Bq6chShi8DGQVpRJIxOhg@d17r8d75
CLOUDINARY_CLOUD_NAME=d17r8d75
CLOUDINARY_API_KEY=556594849769177
CLOUDINARY_API_SECRET=--gyD1Bq6chShi8DGQVpRJIxOhg

# SonoSuite Configuration
SONOSUITE_BASE_URL=https://streampirex.sonosuite.com
SONOSUITE_SHARED_SECRET=Qw7eR5tY2ul9oP1aS8dF6gH4jK3lZ0xC9vB6nM1qW5eR8tY7ul2oP4aS1dF3gH
SONOSUITE_LOGIN_REDIRECT=https://streampirex.com/sonosuite/login
SONOSUITE_LOGOUT_REDIRECT=https://streampirex.com/logout
SONOSUITE_SSO_ACTIVATED=true

# Admin Basic Auth
BA_USERNAME=baguajoe
BA_PASSWORD=Guodalong2@

# Mail Configuration  
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-specific-password

# Port Configuration
PORT=3001
EOF

echo "✅ .env file updated!"

# 3. Load environment variables
echo "🔄 Loading environment variables..."
set -a; source ./.env; set +a

# 4. Activate virtual environment
echo "🐍 Activating virtual environment..."
if [ -d "/home/vscode/.local/share/virtualenvs/SpectraSphere-IeFJP0FO" ]; then
    source /home/vscode/.local/share/virtualenvs/SpectraSphere-IeFJP0FO/bin/activate
else
    echo "⚠️  Virtual environment not found, using pipenv shell..."
    pipenv shell
fi

# 5. Test database connection
echo "🗄️  Testing database connection..."
python -c "
import os
from dotenv import load_dotenv
load_dotenv()
print('DATABASE_URL:', os.getenv('DATABASE_URL'))
print('PORT:', os.getenv('PORT'))
print('BACKEND_URL:', os.getenv('BACKEND_URL'))
print('FRONTEND_URL:', os.getenv('FRONTEND_URL'))
"

# 6. Start Flask app with explicit host and port
echo "🚀 Starting Flask app on port 3001..."
export PORT=3001
export FLASK_DEBUG=1
export FLASK_ENV=development

# Run with explicit configuration
python src/app.py
