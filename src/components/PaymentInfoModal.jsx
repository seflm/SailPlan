import { createPortal } from 'react-dom'

export default function PaymentInfoModal({ isOpen, onClose, paymentInfo }) {
  if (!isOpen) return null

  const modalContent = (
    <div 
      className="modal-overlay active" 
      onClick={onClose}
    >
      <div 
        className="modal" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        <div className="modal-header">
          <h4>
            <i className="fas fa-money-bill-wave" style={{ color: 'var(--coral)', marginRight: 'var(--space-sm)' }}></i>
            Informace o platbách
          </h4>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="modal-body">
          {paymentInfo?.accountNumber || paymentInfo?.iban || paymentInfo?.notes ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
              {paymentInfo.accountNumber && (
                <div>
                  <div className="text-sm text-muted" style={{ marginBottom: 'var(--space-xs)' }}>
                    <i className="fas fa-university" style={{ marginRight: 'var(--space-xs)' }}></i>
                    Číslo účtu
                  </div>
                  <div className="font-semibold" style={{ fontSize: '1.125rem', color: 'var(--gray-700)' }}>
                    {paymentInfo.accountNumber}
                  </div>
                </div>
              )}
              
              {paymentInfo.iban && (
                <div>
                  <div className="text-sm text-muted" style={{ marginBottom: 'var(--space-xs)' }}>
                    <i className="fas fa-globe" style={{ marginRight: 'var(--space-xs)' }}></i>
                    IBAN
                  </div>
                  <div className="font-semibold" style={{ fontSize: '1.125rem', color: 'var(--gray-700)' }}>
                    {paymentInfo.iban}
                  </div>
                </div>
              )}
              
              {paymentInfo.notes && (
                <div>
                  <div className="text-sm text-muted" style={{ marginBottom: 'var(--space-xs)' }}>
                    <i className="fas fa-info-circle" style={{ marginRight: 'var(--space-xs)' }}></i>
                    Další informace
                  </div>
                  <div className="text-sm" style={{ whiteSpace: 'pre-wrap', color: 'var(--gray-600)', lineHeight: 1.6 }}>
                    {paymentInfo.notes}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
              Informace o platbách nejsou k dispozici.
            </p>
          )}
        </div>
        
        <div className="modal-footer">
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={onClose}
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

