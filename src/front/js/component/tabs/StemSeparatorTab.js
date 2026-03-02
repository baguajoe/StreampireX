import React from 'react';
import AIStemSeparation from '../../pages/AIStemSeparation';

const StemSeparatorTab = ({ onClose }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <AIStemSeparation isEmbedded={true} onClose={onClose} />
    </div>
  );
};

export default StemSeparatorTab;