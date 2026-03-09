import { useCallback, useRef } from 'react';

/**
 * useDAWHistory — Undo/Redo history stack for the DAW
 * Stub implementation — extend as needed
 */
const useDAWHistory = () => {
  const historyRef = useRef([]);
  const positionRef = useRef(-1);

  const pushHistory = useCallback((snapshot) => {
    // Trim forward history
    historyRef.current = historyRef.current.slice(0, positionRef.current + 1);
    historyRef.current.push(snapshot);
    positionRef.current = historyRef.current.length - 1;
  }, []);

  const undo = useCallback(() => {
    if (positionRef.current > 0) {
      positionRef.current -= 1;
      return historyRef.current[positionRef.current];
    }
    return null;
  }, []);

  const redo = useCallback(() => {
    if (positionRef.current < historyRef.current.length - 1) {
      positionRef.current += 1;
      return historyRef.current[positionRef.current];
    }
    return null;
  }, []);

  const canUndo = positionRef.current > 0;
  const canRedo = positionRef.current < historyRef.current.length - 1;

  return { pushHistory, undo, redo, canUndo, canRedo };
};

export default useDAWHistory;
