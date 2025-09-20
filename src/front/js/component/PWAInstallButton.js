import React, { useState, useEffect } from 'react';

const AlwaysVisibleInstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.navigator.standalone || 
                         window.matchMedia('(display-mode: standalone)').matches ||
                         window.matchMedia('(display-mode: minimal-ui)').matches;
    
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Collect debug info
    setDebugInfo({
      hasServiceWorker: 'serviceWorker' in navigator,
      isHTTPS: location.protocol === 'https:',
      userAgent: navigator.userAgent,
      standalone: window.navigator.standalone,
      displayMode: window.matchMedia('(display-mode: standalone)').matches
    });

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      console.log('✅ PWA: Install prompt captured');
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('✅ PWA: App installed successfully');
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowOptions(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Debug: Check for manual installation methods
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        console.log('Service Worker registrations:', registrations);
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Native browser install
      try {
        console.log('Triggering native install prompt');
        deferredPrompt.prompt();
        
        const result = await deferredPrompt.userChoice;
        console.log('User choice:', result);
        
        if (result.outcome === 'accepted') {
          setIsInstalled(true);
        }
        
        setDeferredPrompt(null);
      } catch (error) {
        console.error('Install failed:', error);
        setShowOptions(true);
      }
    } else {
      // Show manual instructions
      setShowOptions(true);
    }
  };

  const tryEdgeInstall = () => {
    // For Edge users - guide them to the menu
    alert('In Edge: Click the menu (⋮) → Apps → "Install StreamPireX"');
  };

  const getInstallInstructions = () => {
    const isEdge = /Edg/.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent) && !isEdge;
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    if (isEdge) {
      return {
        title: '🖥️ Install on Edge/Desktop',
        icon: '🖥️',
        steps: [
          '1. Look for install icon (⬇️) in your address bar',
          '2. OR click menu (⋮) → Apps → "Install StreamPireX"',
          '3. Click "Install" in the popup',
          '4. StreamPireX will open as a desktop app'
        ],
        hasDirectMethod: true
      };
    } else if (isChrome) {
      return {
        title: '💻 Install on Chrome',
        icon: '💻', 
        steps: [
          '1. Look for install icon (⬇️) in your address bar',
          '2. OR click menu (⋮) → "Install StreamPireX"',
          '3. Click "Install" to add to desktop',
          '4. Access from your desktop or Start menu'
        ],
        hasDirectMethod: true
      };
    } else if (isSafari) {
      return {
        title: '🍎 Add to iPhone/Mac Home Screen',
        icon: '🍎',
        steps: [
          '1. Tap Share button (📤) in Safari',
          '2. Scroll and tap "Add to Home Screen"',
          '3. Tap "Add" to install',
          '4. Find StreamPireX on your home screen'
        ],
        hasDirectMethod: false
      };
    } else {
      return {
        title: '🌐 Add to Home Screen',
        icon: '🌐',
        steps: [
          '1. Look for install options in browser menu',
          '2. Or bookmark for quick access',
          '3. Installation varies by browser',
          '4. Try Chrome or Edge for best experience'
        ],
        hasDirectMethod: false
      };
    }
  };

  // Always show button unless already installed
  if (isInstalled) {
    return (
      <div style={styles.installedBadge}>
        <span>✅ StreamPireX Installed</span>
      </div>
    );
  }

  const instructions = getInstallInstructions();
  const hasNativePrompt = !!deferredPrompt;

  return (
    <div style={styles.container}>
      {/* Main Install Button - ALWAYS VISIBLE */}
      <button
        onClick={handleInstallClick}
        style={{
          ...styles.mainButton,
          ...(hasNativePrompt ? styles.nativeInstall : styles.manualInstall)
        }}
      >
        <span style={styles.buttonIcon}>
          {hasNativePrompt ? '⚡' : instructions.icon}
        </span>
        <div style={styles.buttonText}>
          <div style={styles.primaryText}>
            {hasNativePrompt ? 'Install Now' : 'Add to Device'}
          </div>
          <div style={styles.secondaryText}>
            {hasNativePrompt ? 'One-click install' : 'For quick access'}
          </div>
        </div>
      </button>

      {/* Edge-specific quick action */}
      {/Edg/.test(navigator.userAgent) && !hasNativePrompt && (
        <button onClick={tryEdgeInstall} style={styles.quickTip}>
          💡 Quick: Menu → Apps → Install
        </button>
      )}

      {/* Debug info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={styles.debugInfo}>
          <small>
            PWA: {debugInfo.hasServiceWorker ? '✅' : '❌'} | 
            HTTPS: {debugInfo.isHTTPS ? '✅' : '❌'} | 
            Prompt: {hasNativePrompt ? '✅' : '❌'}
          </small>
        </div>
      )}

      {/* Installation Modal */}
      {showOptions && (
        <div style={styles.modalOverlay} onClick={() => setShowOptions(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3>{instructions.title}</h3>
              <button
                style={styles.closeButton}
                onClick={() => setShowOptions(false)}
              >
                ✕
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.instructionCard}>
                <div style={styles.instructionSteps}>
                  {instructions.steps.map((step, index) => (
                    <div key={index} style={styles.stepItem}>
                      <span style={styles.stepNumber}>{index + 1}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
                
                {instructions.hasDirectMethod && (
                  <div style={styles.tip}>
                    <strong>💡 Tip:</strong> Look for the install icon (⬇️) in your browser's address bar first!
                  </div>
                )}
              </div>

              <div style={styles.alternativeSection}>
                <h4>🌐 Or Continue in Browser</h4>
                <p>StreamPireX works great in your browser too!</p>
                <button 
                  style={styles.continueButton}
                  onClick={() => setShowOptions(false)}
                >
                  Continue in Browser
                </button>
              </div>

              {/* Debug section for development */}
              {process.env.NODE_ENV === 'development' && (
                <div style={styles.debugSection}>
                  <h4>🔍 Debug Info:</h4>
                  <pre style={styles.debugText}>
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },

  mainButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    minWidth: '200px',
  },

  nativeInstall: {
    background: 'linear-gradient(135deg, #28a745, #20c997)',
    color: 'white',
  },

  manualInstall: {
    background: 'linear-gradient(135deg, #007bff, #0056b3)',
    color: 'white',
  },

  buttonIcon: {
    fontSize: '20px',
    lineHeight: '1',
  },

  buttonText: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '2px',
  },

  primaryText: {
    fontSize: '15px',
    fontWeight: '600',
    lineHeight: '1.2',
  },

  secondaryText: {
    fontSize: '11px',
    opacity: 0.9,
    lineHeight: '1.2',
  },

  quickTip: {
    background: 'none',
    border: '1px solid #007bff',
    color: '#007bff',
    fontSize: '11px',
    padding: '4px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  installedBadge: {
    padding: '10px 16px',
    backgroundColor: '#28a745',
    color: 'white',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
  },

  debugInfo: {
    fontSize: '10px',
    color: '#666',
    textAlign: 'center',
    maxWidth: '200px',
  },

  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px',
  },

  modalContent: {
    backgroundColor: 'white',
    borderRadius: '16px',
    maxWidth: '480px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
  },

  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #eee',
    background: 'linear-gradient(135deg, #007bff, #0056b3)',
    color: 'white',
    borderRadius: '16px 16px 0 0',
  },

  closeButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBody: {
    padding: '24px',
  },

  instructionCard: {
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    backgroundColor: '#f8f9fa',
  },

  instructionSteps: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '16px',
  },

  stepItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    fontSize: '14px',
    lineHeight: '1.4',
  },

  stepNumber: {
    backgroundColor: '#007bff',
    color: 'white',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '600',
    flexShrink: 0,
  },

  tip: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '6px',
    padding: '12px',
    fontSize: '13px',
  },

  alternativeSection: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    marginBottom: '20px',
  },

  continueButton: {
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '600',
  },

  debugSection: {
    backgroundColor: '#f8f9fa',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '12px',
  },

  debugText: {
    fontSize: '10px',
    color: '#666',
    margin: '8px 0 0 0',
    whiteSpace: 'pre-wrap',
  },
};

export default AlwaysVisibleInstallButton;