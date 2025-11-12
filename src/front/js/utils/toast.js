import toast from 'react-hot-toast';

// Custom toast configurations matching StreamPireX branding
export const showToast = {
  success: (message) => {
    toast.success(message, {
      duration: 4000,
      position: 'top-right',
      style: {
        background: '#10b981',
        color: '#fff',
        fontWeight: '600',
        padding: '16px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
      },
      iconTheme: {
        primary: '#fff',
        secondary: '#10b981',
      },
    });
  },

  error: (message) => {
    toast.error(message, {
      duration: 5000,
      position: 'top-right',
      style: {
        background: '#ef4444',
        color: '#fff',
        fontWeight: '600',
        padding: '16px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
      },
      iconTheme: {
        primary: '#fff',
        secondary: '#ef4444',
      },
    });
  },

  loading: (message) => {
    return toast.loading(message, {
      position: 'top-right',
      style: {
        background: '#667eea',
        color: '#fff',
        fontWeight: '600',
        padding: '16px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
      },
    });
  },

  promise: (promise, messages) => {
    return toast.promise(
      promise,
      {
        loading: messages.loading || 'Loading...',
        success: messages.success || 'Success!',
        error: messages.error || 'Something went wrong',
      },
      {
        position: 'top-right',
        style: {
          fontWeight: '600',
          padding: '16px',
          borderRadius: '12px',
        },
      }
    );
  },

  info: (message) => {
    toast(message, {
      duration: 4000,
      position: 'top-right',
      icon: 'ℹ️',
      style: {
        background: '#3b82f6',
        color: '#fff',
        fontWeight: '600',
        padding: '16px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
      },
    });
  },

  custom: (message, options = {}) => {
    toast(message, {
      duration: 4000,
      position: 'top-right',
      style: {
        background: '#667eea',
        color: '#fff',
        fontWeight: '600',
        padding: '16px',
        borderRadius: '12px',
        ...options.style,
      },
      ...options,
    });
  },
};

export default showToast;