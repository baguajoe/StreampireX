import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/EmptyState.css';

const EmptyState = ({ 
  icon = "📦",
  title = "Nothing here yet",
  message = "Get started by creating your first item",
  actionText,
  actionLink,
  onAction,
  secondaryActionText,
  secondaryActionLink,
  onSecondaryAction
}) => {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-message">{message}</p>
      
      {(actionText || secondaryActionText) && (
        <div className="empty-state-actions">
          {actionText && (
            actionLink ? (
              <Link to={actionLink} className="empty-state-btn primary">
                {actionText}
              </Link>
            ) : (
              <button onClick={onAction} className="empty-state-btn primary">
                {actionText}
              </button>
            )
          )}
          
          {secondaryActionText && (
            secondaryActionLink ? (
              <Link to={secondaryActionLink} className="empty-state-btn secondary">
                {secondaryActionText}
              </Link>
            ) : (
              <button onClick={onSecondaryAction} className="empty-state-btn secondary">
                {secondaryActionText}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;