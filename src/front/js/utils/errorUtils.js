// src/front/js/utils/errorUtils.js
export class ErrorHandler {
  static async withRetry(operation, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i))); // Exponential backoff
      }
    }
  }

  static validateEnvironment() {
    const requiredVars = ['REACT_APP_BACKEND_URL'];
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }
    
    return {
      backendUrl: process.env.REACT_APP_BACKEND_URL,
      isProduction: process.env.NODE_ENV === 'production'
    };
  }

  static async fetchWithErrorHandling(url, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      // Check content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Invalid response type: ${contentType}`);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network connection failed. Please check your internet connection.');
      }
      throw error;
    }
  }

  static getAudioErrorMessage(error) {
    if (!error) return "Unknown audio error";
    
    switch (error.code) {
      case MediaError.MEDIA_ERR_ABORTED:
        return "Audio playback was aborted";
      case MediaError.MEDIA_ERR_NETWORK:
        return "Network error while loading audio";
      case MediaError.MEDIA_ERR_DECODE:
        return "Audio format not supported or corrupted";
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        return "Audio source not available or supported";
      default:
        return "Audio playback error occurred";
    }
  }

  static createErrorBoundary(fallback) {
    return class ErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
      }

      static getDerivedStateFromError(error) {
        return { hasError: true };
      }

      componentDidCatch(error, errorInfo) {
        this.setState({
          error: error,
          errorInfo: errorInfo
        });
        
        // Log to external service in production
        if (process.env.NODE_ENV === 'production') {
          console.error('Error caught by boundary:', error, errorInfo);
        }
      }

      render() {
        if (this.state.hasError) {
          return fallback(this.state.error, this.state.errorInfo);
        }
        return this.props.children;
      }
    };
  }
}

// Authentication error handler
export class AuthErrorHandler {
  static handleAuthError(error, navigate) {
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      localStorage.removeItem('token');
      navigate('/login');
      return true;
    }
    return false;
  }

  static getAuthHeaders() {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return {
      'Authorization': `Bearer ${token}`
    };
  }
}

// WebSocket error handler
export class WebSocketErrorHandler {
  static handleSocketError(socket, setConnectionStatus, reconnectCallback) {
    socket.on('connect_error', (error) => {
      console.error('Socket connection failed:', error);
      setConnectionStatus('failed');
    });

    socket.on('disconnect', (reason) => {
      console.warn('Socket disconnected:', reason);
      setConnectionStatus('disconnected');
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        setTimeout(reconnectCallback, 5000);
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      setConnectionStatus('error');
    });
  }
}