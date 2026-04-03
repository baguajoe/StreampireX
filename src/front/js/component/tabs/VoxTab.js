import React from 'react';
import SPXVoxEngine from '../SPXVoxEngine';

/**
 * VoxTab — mounts SPXVoxEngine inside SamplerBeatMaker Beat Lab.
 * Props forwarded from SamplerBeatMaker if available.
 */
const VoxTab = ({ audioContext, outputNode, onPadOutput }) => {
  return (
    <div style={{
      padding: 16,
      background: '#06060f',
      minHeight: 400,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <SPXVoxEngine
        audioContext={audioContext}
        outputNode={outputNode}
        onPadOutput={onPadOutput}
        compact={false}
      />
    </div>
  );
};

export default VoxTab;
