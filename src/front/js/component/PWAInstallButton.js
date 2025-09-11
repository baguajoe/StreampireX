import React, { useState, useEffect } from 'react';

const PWAInstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      console.log('📱 PWA: Install prompt available');
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('✅ PWA: App installed successfully');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Show manual instructions for iOS or unsupported browsers
      setShowManualInstructions(true);
      return;
    }

    try {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for user choice
      const result = await deferredPrompt.userChoice;
      
      if (result.outcome === 'accepted') {
        console.log('✅ PWA: User accepted install');
        setIsInstalled(true);
      } else {
        console.log('❌ PWA: User dismissed install');
      }
      
      // Clear the deferred prompt
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error('❌ PWA: Install failed:', error);
      setShowManualInstructions(true);
    }
  };

  const getDeviceInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS) {
      return {
        title: '📱 Install StreamPireX on iPhone/iPad',
        steps: [
          '1. Tap the Share button (📤) in Safari',
          '2. Scroll down and tap "Add to Home Screen"',
          '3. Tap "Add" to install StreamPireX',
          '4. Find the StreamPireX app on your home screen!'
        ]
      };
    } else if (isAndroid) {
      return {
        title: '📱 Install StreamPireX on Android',
        steps: [
          '1. Tap the menu (⋮) in Chrome',
          '2. Tap "Add to Home screen" or "Install app"',
          '3. Tap "Install" to add StreamPireX',
          '4. Open StreamPireX from your app drawer!'
        ]
      };
    } else {
      return {
        title: '💻 Install StreamPireX on Desktop',
        steps: [
          '1. Look for the install icon (⬇️) in your browser address bar',
          '2. Click "Install StreamPireX" when prompted',
          '3. Or use browser menu > "Install StreamPireX"',
          '4. Launch StreamPireX from your apps!'
        ]
      };
    }
  };

  // Don't show button if already installed
  if (isInstalled) {
    return (
      <div style={styles.installedBadge}>
        <span>✅ StreamPireX Installed</span>
      </div>
    );
  }

  return (
    <>
      {/* Install Button */}
      <button
        onClick={handleInstallClick}
        style={{
          ...styles.installButton,
          ...(isInstallable ? styles.installButtonReady : styles.installButtonManual)
        }}
        title={isInstallable ? "Install StreamPireX App" : "Get StreamPireX App"}
      >
        <span style={styles.buttonIcon}>📱</span>
        <span>{isInstallable ? 'Install App' : 'Get App'}</span>
      </button>

      {/* Manual Instructions Modal */}
      {showManualInstructions && (
        <div style={styles.modalOverlay} onClick={() => setShowManualInstructions(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3>{getDeviceInstructions().title}</h3>
              <button
                style={styles.closeButton}
                onClick={() => setShowManualInstructions(false)}
              >
                ✕
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.instructionsList}>
                {getDeviceInstructions().steps.map((step, index) => (
                  <div key={index} style={styles.instructionStep}>
                    {step}
                  </div>
                ))}
              </div>
              
              <div style={styles.benefitsSection}>
                <h4>🚀 Why Install StreamPireX?</h4>
                <ul style={styles.benefitsList}>
                  <li>⚡ Instant access from home screen</li>
                  <li>📱 Native app experience</li>
                  <li>🔔 Push notifications for updates</li>
                  <li>💾 Offline functionality</li>
                  <li>🎵 Better music & video playback</li>
                  <li>⚡ Faster loading times</li>
                </ul>
              </div>
            </div>
            
            <div style={styles.modalFooter}>
              <button
                style={styles.gotItButton}
                onClick={() => setShowManualInstructions(false)}
              >
                Got It! 👍
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Styles
const styles = {
  installButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    border: 'none',
    borderRadius: '25px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  },
  
  installButtonReady: {
    background: 'linear-gradient(135deg, #FF6600, #FF8533)',
    color: 'white',
  },
  
  installButtonManual: {
    background: 'linear-gradient(135deg, #004080, #0056b3)',
    color: 'white',
  },
  
  buttonIcon: {
    fontSize: '16px',
  },
  
  installedBadge: {
    padding: '8px 16px',
    backgroundColor: '#28a745',
    color: 'white',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
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
    borderRadius: '15px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
  },
  
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 25px',
    borderBottom: '1px solid #eee',
    background: 'linear-gradient(135deg, #004080, #0056b3)',
    color: 'white',
    borderRadius: '15px 15px 0 0',
  },
  
  closeButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '5px',
    borderRadius: '50%',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  modalBody: {
    padding: '25px',
  },
  
  instructionsList: {
    marginBottom: '25px',
  },
  
  instructionStep: {
    padding: '12px 0',
    fontSize: '16px',
    borderBottom: '1px solid #f0f0f0',
    color: '#333',
  },
  
  benefitsSection: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '10px',
    marginTop: '20px',
  },
  
  benefitsList: {
    listStyle: 'none',
    padding: 0,
    margin: '10px 0 0 0',
  },
  
  modalFooter: {
    padding: '20px 25px',
    borderTop: '1px solid #eee',
    textAlign: 'center',
  },
  
  gotItButton: {
    background: 'linear-gradient(135deg, #28a745, #20c997)',
    color: 'white',
    border: 'none',
    padding: '12px 30px',
    borderRadius: '25px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
  }
};

export default PWAInstallButton;