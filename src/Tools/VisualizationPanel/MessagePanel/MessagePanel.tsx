import React from 'react';

import './MessagePanel.scss';

type Props = {
  icon?: string;
  variant?: 'boxed' | 'plain' | 'boxed-no-header';
  onClose?: () => void;
  children: React.ReactNode;
};

export default function MessagePanel({
  icon = 'exclamation-circle',
  variant = 'plain',
  onClose,
  children,
}: Props) {
  return (
    <div className={`message-panel message-panel--${variant}`}>
      {variant !== 'boxed-no-header' && (
        <div className="message-panel-header">
          <div className="message-panel-icon">
            <i className={`fa fa-${icon}`} />
          </div>
          {onClose && (
            <div onClick={onClose} className="close-message-panel">
              <i className="fas fa-times" />
            </div>
          )}
        </div>
      )}
      <div className="message-panel-messages">{children}</div>
    </div>
  );
}
