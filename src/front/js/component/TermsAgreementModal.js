// ✅ TermsAgreementModal.js
import React from 'react';

const TermsAgreementModal = ({ show, onClose, onAgree }) => {
  if (!show) return null;

  return (
    <div className="modal show d-block" tabIndex="-1" role="dialog">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Confirm Distribution Rights</h5>
            <button type="button" className="close" onClick={onClose}>
              <span>&times;</span>
            </button>
          </div>
          <div className="modal-body">
            <p>
              By continuing, you confirm that you own or control all rights to this music
              and that you authorize StreampireX to distribute it to digital platforms.
            </p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={onAgree}>
              I Agree
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAgreementModal;
