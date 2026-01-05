import { createPortal } from 'react-dom'
import useMediaQuery from '../hooks/useMediaQuery'
import BottomDrawer from './BottomDrawer'

export default function PaymentInfoModal({ isOpen, onClose, paymentInfo }) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  
  if (!isOpen) return null

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {paymentInfo?.accountNumber || paymentInfo?.iban || paymentInfo?.notes ? (
        <>
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
        </>
      ) : (
        <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
          Informace o platbách nejsou k dispozici.
        </p>
      )}
      <div style={{ marginTop: 'var(--space-md)' }}>
        <button 
          type="button" 
          className="btn btn-primary" 
          onClick={onClose}
          style={{ width: '100%' }}
        >
          Zavřít
        </button>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <BottomDrawer
        isOpen={isOpen}
        onClose={onClose}
        title={
          <span>
            <i className="fas fa-money-bill-wave" style={{ color: 'var(--coral)', marginRight: 'var(--space-sm)' }}></i>
            Informace o platbách
          </span>
        }
        maxHeight={80}
      >
        {content}
      </BottomDrawer>
    )
  }

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
          {content}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

