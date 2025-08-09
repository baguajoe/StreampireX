#!/bin/bash
# setup_environment.sh - Complete environment setup for SpectraSphere

echo "🚀 SpectraSphere Environment Setup"
echo "=================================="

# Check if virtual environment exists
if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
if [ -d "venv" ]; then
    echo "🔄 Activating virtual environment..."
    source venv/bin/activate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "📦 Installing requirements..."
pip install eventlet==0.33.3
pip install flask==2.3.3
pip install flask-sqlalchemy==3.0.5
pip install flask-migrate==4.0.5
pip install flask-cors==4.0.0
pip install flask-jwt-extended==4.5.2
pip install flask-socketio==5.3.4
pip install psycopg2-binary==2.9.7
pip install python-dotenv==1.0.0
pip install flask-mail==0.9.1
pip install flask-caching==2.0.2
pip install flask-apscheduler==1.13.0
pip install cloudinary==1.33.0

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost/spectrasphere

# JWT Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this
SECRET_KEY=your-super-secret-flask-key-change-this

# Flask Configuration
FLASK_APP=app.py
FLASK_ENV=development
FLASK_DEBUG=1

# Frontend Configuration
FRONTEND_URL=http://localhost:3000
ADDITIONAL_ORIGINS=

# Mail Configuration
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Admin Authentication
BA_USERNAME=admin
BA_PASSWORD=your-admin-password

# SonoSuite Configuration
SONOSUITE_SHARED_SECRET=your-sonosuite-secret
SONOSUITE_BASE_URL=https://streampirex.sonosuite.com

# Port Configuration
PORT=3001
EOF
    echo "⚠️  Please edit .env file with your actual configuration values!"
else
    echo "✅ .env file already exists"
fi

# Set environment variables for this session
export FLASK_APP=app.py
export FLASK_ENV=development

echo ""
echo "✅ Environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your database and service credentials"
echo "2. Make sure PostgreSQL is running"
echo "3. Run: chmod +x migration_fix.sh && ./migration_fix.sh"
echo "4. Run: python app.py"