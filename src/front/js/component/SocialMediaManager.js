import React from 'react';

const SocialMediaManager = ({ 
    isOpen, 
    onClose, 
    socialAccounts, 
    onAccountsUpdate 
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="social-media-manager-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Social Media Manager</h3>
                    <button onClick={onClose} className="close-modal-btn">
                        ❌
                    </button>
                </div>
                <div className="modal-content">
                    <p>Social Media Manager functionality coming soon!</p>
                    <div className="connected-accounts">
                        <h4>Connected Accounts: {socialAccounts?.length || 0}</h4>
                        {socialAccounts?.map((account, index) => (
                            <div key={index} className="account-item">
                                {account.platform}: {account.username}
                            </div>
                        ))}
                    </div>
                    <button onClick={onClose} className="close-btn">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SocialMediaManager;