import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * BottomDrawer - Drawer komponenta, která se vysouvá ze spodu obrazovky
 * 
 * Tato komponenta implementuje:
 * 1. Slide-in/slide-out animaci pomocí CSS transform
 * 2. Scroll lock mechanismus pro zablokování scrollování pozadí
 * 3. Backdrop s blur efektem
 * 4. React Portal pro renderování mimo DOM hierarchii
 * 
 * @param {boolean} isOpen - Zda je drawer otevřený
 * @param {function} onClose - Callback pro zavření draweru
 * @param {string} title - Nadpis draweru
 * @param {ReactNode} children - Obsah draweru
 * @param {string} theme - 'dark' nebo 'light'
 * @param {number} maxHeight - Maximální výška obsahu v vh (default: 50)
 * @param {number} animationDuration - Délka animace v ms (default: 300)
 */
const BottomDrawer = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  theme = 'light',
  maxHeight = 50,
  animationDuration = 300
}) => {
    // State pro řízení lifecycle komponenty
    const [isMounted, setIsMounted] = useState(false);      // Zda je komponenta v DOM
    const [isAnimating, setIsAnimating] = useState(false);   // Zda probíhá animace

    /**
     * EFEKT 1: Řízení lifecycle a animací
     * 
     * Tento efekt řídí, kdy se komponenta mountuje/unmountuje a kdy začíná animace.
     * Používá dva stavy:
     * - isMounted: řídí, zda je komponenta v DOM (pro React Portal)
     * - isAnimating: řídí CSS třídy pro animaci
     * 
     * SLIDE IN (otevření):
     * 1. isOpen se změní na true
     * 2. Okamžitě se nastaví isMounted = true (komponenta se přidá do DOM)
     * 3. Po 50ms delay se nastaví isAnimating = true (spustí se animace)
     *    - Delay je nutný, aby browser stihl vykreslit počáteční stav před animací
     *    - Bez delay by animace neproběhla, protože by se změnil stav a CSS současně
     * 
     * SLIDE OUT (zavření):
     * 1. isOpen se změní na false
     * 2. Okamžitě se nastaví isAnimating = false (spustí se animace zpět)
     * 3. Po animationDuration (300ms) se nastaví isMounted = false (odstraní se z DOM)
     *    - Musíme počkat na konec animace, než odstraníme komponentu z DOM
     */
    useEffect(() => {
        let openTimer;
        let closeTimer;
        let isUnmounting = false;

        if (isOpen) {
            // SLIDE IN: Přidat do DOM, pak spustit animaci
            isUnmounting = false;
            setIsMounted(true);
            openTimer = setTimeout(() => {
                if (!isUnmounting) {
                    setIsAnimating(true);
                }
            }, 50); // 50ms delay pro plynulou animaci
        } else {
            // SLIDE OUT: Zastavit animaci, pak odstranit z DOM
            // DŮLEŽITÉ: Neodstraňovat z DOM okamžitě, musíme počkat na konec animace!
            setIsAnimating(false);
            closeTimer = setTimeout(() => {
                if (!isUnmounting) {
                    setIsMounted(false);
                }
            }, animationDuration); // Počkat na konec animace
        }

        // Cleanup: zrušit timery při unmount nebo změně isOpen
        return () => {
            isUnmounting = true;
            if (openTimer) clearTimeout(openTimer);
            if (closeTimer) clearTimeout(closeTimer);
        };
    }, [isOpen, animationDuration]);

    /**
     * EFEKT 2: Scroll Lock Mechanismus
     * 
     * Tento efekt zablokuje scrollování body elementu, když je drawer otevřený.
     * 
     * JAK FUNGUJE:
     * 1. Když se drawer otevře (isMounted = true):
     *    - Nastaví se document.body.style.overflow = 'hidden'
     *    - Tím se zablokuje scrollování celé stránky
     *    - Obsah pod drawerem (backdrop) se nemůže scrollovat
     * 
     * 2. Když se drawer zavře (isMounted = false):
     *    - Nastaví se document.body.style.overflow = 'unset'
     *    - Scrollování se obnoví
     * 
     * PROČ TO FUNGUJE:
     * - overflow: hidden na body elementu zablokuje scrollování celé stránky
     * - Drawer sám má vlastní scroll (overflowY: 'auto' na content divu)
     * - Backdrop (pozadí) je fixní (position: fixed), takže se nescrolluje
     * 
     * DŮLEŽITÉ:
     * - Cleanup funkce vždy obnoví overflow, i když se komponenta unmountuje
     *   neočekávaně (např. při navigaci)
     * - Tím se předejde situaci, kdy by scroll zůstal zablokovaný
     * 
     * POZNÁMKA: Pokud scroll lock nefunguje, zkuste:
     * 1. Použít !important: document.body.style.setProperty('overflow', 'hidden', 'important')
     * 2. Zablokovat i html element: document.documentElement.style.overflow = 'hidden'
     * 3. Pro mobilní zařízení použít position: fixed na body
     * Viz ANIMATION_AND_SCROLL_LOCK.md pro detailní řešení problémů
     */
    useEffect(() => {
        if (isMounted) {
            // Zablokovat scrollování na html i body pro lepší kompatibilitu
            const html = document.documentElement;
            const body = document.body;
            
            // Uložit scroll pozici pro případ, že bychom potřebovali position: fixed
            const scrollY = window.scrollY;
            
            // Nastavit overflow: hidden
            // Použít setProperty s important pro případ, že CSS framework přepisuje
            html.style.setProperty('overflow', 'hidden', 'important');
            body.style.setProperty('overflow', 'hidden', 'important');
            
            // Pro mobilní zařízení: použít position: fixed pro lepší scroll lock
            // Odkomentovat pokud scroll lock nefunguje na mobilu:
            // body.style.setProperty('position', 'fixed', 'important');
            // body.style.setProperty('width', '100%', 'important');
            // body.style.setProperty('top', `-${scrollY}px`, 'important');
        } else {
            // Obnovit scrollování
            document.documentElement.style.removeProperty('overflow');
            document.body.style.removeProperty('overflow');
            document.body.style.removeProperty('position');
            document.body.style.removeProperty('width');
            document.body.style.removeProperty('top');
        }
        
        // Cleanup: vždy obnovit scroll při unmount
        return () => {
            document.documentElement.style.removeProperty('overflow');
            document.body.style.removeProperty('overflow');
            document.body.style.removeProperty('position');
            document.body.style.removeProperty('width');
            document.body.style.removeProperty('top');
        };
    }, [isMounted]);

    // SSR check: pokud není document (server-side rendering), nevykreslovat
    if (typeof document === 'undefined' || !isMounted) {
        return null;
    }

    /**
     * BACKDROP STYLES
     * 
     * Backdrop je poloprůhledná vrstva za drawerem, která:
     * - Ztmaví pozadí (rgba(0, 0, 0, 0.4))
     * - Přidá blur efekt (backdrop-filter: blur(4px))
     * - Má nižší z-index než drawer (40 vs 50)
     * - Animuje opacity (fade in/out)
     */
    const backdropStyle = {
        position: 'fixed',           // Fixní pozice vůči viewportu
        inset: '0px',                // Pokrývá celou obrazovku (top:0, right:0, bottom:0, left:0)
        backgroundColor: 'rgba(0, 0, 0, 0.4)',  // 40% černá
        backdropFilter: 'blur(4px)', // Blur efekt pro pozadí
        zIndex: 40,                  // Pod drawerem, ale nad obsahem
        transition: `opacity ${animationDuration}ms ease-in-out`,
        opacity: isAnimating ? 1 : 0, // Animace opacity
    };

    /**
     * DRAWER STYLES
     * 
     * Drawer panel má:
     * - Fixní pozici na spodku obrazovky
     * - CSS transform pro slide animaci
     * - Vlastní scroll pro obsah
     * - Zaoblené rohy nahoře
     */
    const drawerStyle = {
        position: 'fixed',           // Fixní pozice
        bottom: '0px',               // Na spodku obrazovky
        left: '0px',                 // Od levého okraje
        right: '0px',                // Od pravého okraje
        zIndex: 50,                 // Nad backdropem a obsahem
        width: '100%',               // Plná šířka
        maxWidth: '48rem',          // Max 768px (centrováno)
        marginLeft: 'auto',          // Centrování
        marginRight: 'auto',         // Centrování
        padding: '1.5rem',           // 24px padding
        backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
        color: theme === 'dark' ? '#f3f4f6' : '#111827',
        borderTopLeftRadius: '1.5rem',   // Zaoblené rohy nahoře
        borderTopRightRadius: '1.5rem',
        boxShadow: '0 -10px 15px -3px rgb(0 0 0 / 0.1), 0 -4px 6px -4px rgb(0 0 0 / 0.1)',
        overflow: 'hidden',         // Skrýt přetečení
        transition: `transform ${animationDuration}ms ease-in-out`,
        /**
         * ANIMACE SLIDE IN/OUT:
         * 
         * translateY(100%) = drawer je úplně mimo obrazovku (100% své výšky dolů)
         * translateY(0) = drawer je na své finální pozici
         * 
         * SLIDE IN:
         * - Začíná: translateY(100%) - drawer je mimo obrazovku
         * - Končí: translateY(0) - drawer je viditelný
         * - Animace: transform se mění z translateY(100%) na translateY(0)
         * 
         * SLIDE OUT:
         * - Začíná: translateY(0) - drawer je viditelný
         * - Končí: translateY(100%) - drawer je mimo obrazovku
         * - Animace: transform se mění z translateY(0) na translateY(100%)
         * 
         * ease-in-out = plynulá animace (pomalý start, rychlý střed, pomalý konec)
         * 
         * POZNÁMKA: Pokud animace nefunguje, zkuste:
         * 1. Přidat !important: transform: 'translateY(0) !important'
         * 2. Zkontrolovat, zda CSS framework nepřepisuje transform
         * 3. Zkontrolovat, zda isMounted není změněn předčasně
         * Viz ANIMATION_AND_SCROLL_LOCK.md pro detailní debugging
         */
        transform: isAnimating ? 'translateY(0)' : 'translateY(100%)',
        // Přidat willChange pro optimalizaci
        willChange: 'transform',
    };

    /**
     * REACT PORTAL
     * 
     * createPortal renderuje komponentu přímo do document.body,
     * ne do normální DOM hierarchie. To zajišťuje:
     * - Drawer je vždy na vrcholu (z-index funguje správně)
     * - Není ovlivněn overflow nebo z-index rodičovských elementů
     * - Lze použít fixní pozici bez problémů
     */
    return createPortal(
        <>
            {/* Backdrop - kliknutím se zavře */}
            <div 
                style={backdropStyle} 
                onClick={onClose} 
                aria-hidden="true" 
            />
            
            {/* Drawer Panel */}
            <div
                style={drawerStyle}
                role="dialog"
                aria-modal="true"
                aria-labelledby="drawer-title"
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem' }}>
                    <h2 id="drawer-title" style={{ fontSize: '1.125rem', fontWeight: 600, cursor: 'default' }}>
                        {title}
                    </h2>
                    <button 
                        onClick={onClose} 
                        className={`p-1 rounded-full cursor-pointer ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`} 
                        aria-label="Close"
                    >
                        <X size={24} />
                    </button>
                </div>
                
                {/* Content - má vlastní scroll */}
                <div style={{ 
                    maxHeight: `${maxHeight}vh`,  // Maximální výška v viewport height
                    overflowY: 'auto',            // Vertikální scroll, pokud obsah přesahuje
                    paddingRight: '0.5rem',        // Padding pro scrollbar
                    fontSize: '0.875rem'          // 14px
                }}>
                    {children}
                </div>
            </div>
        </>,
        document.body
    );
};

export default BottomDrawer;

