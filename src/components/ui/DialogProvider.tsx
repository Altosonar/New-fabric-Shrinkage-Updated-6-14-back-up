import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import './DialogProvider.css';

// ── Types ─────────────────────────────────────────────────────────────────────
interface DialogConfig {
  type: 'alert' | 'confirm';
  message: string;
  title?: string;
  resolve: (value: boolean) => void;
}

interface DialogContextType {
  showAlert: (message: string, title?: string) => Promise<void>;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
}

// ── Context ───────────────────────────────────────────────────────────────────
const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function useDialog(): DialogContextType {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within DialogProvider');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogConfig | null>(null);

  const showAlert = useCallback((message: string, title?: string): Promise<void> => {
    return new Promise(resolve => {
      setDialog({ type: 'alert', message, title, resolve: () => resolve() });
    });
  }, []);

  const showConfirm = useCallback((message: string, title?: string): Promise<boolean> => {
    return new Promise(resolve => {
      setDialog({ type: 'confirm', message, title, resolve });
    });
  }, []);

  const handleOK = () => {
    dialog?.resolve(true);
    setDialog(null);
  };

  const handleCancel = () => {
    dialog?.resolve(false);
    setDialog(null);
  };

  // Close on overlay click (alert only — confirm requires explicit choice)
  const handleOverlayClick = () => {
    if (dialog?.type === 'alert') handleOK();
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {dialog && (
        <div className="dlg-overlay" role="dialog" aria-modal="true" onClick={handleOverlayClick}>
          <div className="dlg-box" onClick={e => e.stopPropagation()}>
            {dialog.title && <div className="dlg-title">{dialog.title}</div>}
            <div className="dlg-message">{dialog.message}</div>
            <div className="dlg-actions">
              {dialog.type === 'confirm' && (
                <button className="dlg-btn dlg-btn-cancel" onClick={handleCancel}>
                  Cancel
                </button>
              )}
              <button className="dlg-btn dlg-btn-ok" onClick={handleOK} autoFocus>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}
