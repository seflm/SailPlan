# BottomDrawer - Rychlý troubleshooting guide

Tento dokument obsahuje rychlá řešení nejčastějších problémů s BottomDrawer komponentou.

---

## 🔴 Slide-out animace nefunguje (drawer prostě zmizí)

### Rychlé řešení 1: Ověřit timing

```javascript
// V useEffect pro lifecycle
else {
    console.log('Zavírání - isAnimating:', isAnimating);
    setIsAnimating(false);
    
    // DŮLEŽITÉ: Počkat na konec animace před unmount!
    closeTimer = setTimeout(() => {
        setIsMounted(false);
    }, animationDuration); // Musí být 300ms nebo více
}
```

### Rychlé řešení 2: Použít useRef pro timery

```javascript
const openTimerRef = useRef(null);
const closeTimerRef = useRef(null);

useEffect(() => {
    if (isOpen) {
        setIsMounted(true);
        openTimerRef.current = setTimeout(() => {
            setIsAnimating(true);
        }, 50);
    } else {
        setIsAnimating(false);
        closeTimerRef.current = setTimeout(() => {
            setIsMounted(false);
        }, animationDuration);
    }

    return () => {
        if (openTimerRef.current) clearTimeout(openTimerRef.current);
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
}, [isOpen, animationDuration]);
```

### Rychlé řešení 3: Přidat !important do CSS

```javascript
const drawerStyle = {
    transform: `${isAnimating ? 'translateY(0)' : 'translateY(100%)'} !important`,
    transition: `transform ${animationDuration}ms ease-in-out !important`,
};
```

### Rychlé řešení 4: Ověřit, že parent neunmountuje drawer

```javascript
// ❌ ŠPATNĚ
{isOpen && <BottomDrawer isOpen={isOpen} onClose={...} />}

// ✅ SPRÁVNĚ
<BottomDrawer isOpen={isOpen} onClose={...} />
```

---

## 🔴 Scroll lock nefunguje (jde scrollovat obsah pod drawerem)

### Rychlé řešení 1: Použít !important

```javascript
useEffect(() => {
    if (isMounted) {
        document.body.style.setProperty('overflow', 'hidden', 'important');
        document.documentElement.style.setProperty('overflow', 'hidden', 'important');
    } else {
        document.body.style.removeProperty('overflow');
        document.documentElement.style.removeProperty('overflow');
    }
    
    return () => {
        document.body.style.removeProperty('overflow');
        document.documentElement.style.removeProperty('overflow');
    };
}, [isMounted]);
```

### Rychlé řešení 2: Zablokovat i html element

```javascript
useEffect(() => {
    if (isMounted) {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
    } else {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
    }
    
    return () => {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
    };
}, [isMounted]);
```

### Rychlé řešení 3: Pro mobilní zařízení použít position: fixed

```javascript
useEffect(() => {
    if (isMounted) {
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.overflow = 'hidden';
    } else {
        const scrollY = document.body.style.top;
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        document.body.style.overflow = '';
        
        if (scrollY) {
            window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
    }
    
    return () => {
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        document.body.style.overflow = '';
    };
}, [isMounted]);
```

### Rychlé řešení 4: Použít CSS třídu místo inline style

```css
/* V CSS souboru */
body.drawer-open {
    overflow: hidden !important;
}

html.drawer-open {
    overflow: hidden !important;
}
```

```javascript
useEffect(() => {
    if (isMounted) {
        document.documentElement.classList.add('drawer-open');
        document.body.classList.add('drawer-open');
    } else {
        document.documentElement.classList.remove('drawer-open');
        document.body.classList.remove('drawer-open');
    }
    
    return () => {
        document.documentElement.classList.remove('drawer-open');
        document.body.classList.remove('drawer-open');
    };
}, [isMounted]);
```

---

## 🧪 Rychlé testy v konzoli

### Test slide-out animace

```javascript
// 1. Otevřít drawer
// 2. V konzoli:
const drawer = document.querySelector('[role="dialog"]');
const computed = window.getComputedStyle(drawer);
console.log('Transform:', computed.transform);
console.log('Transition:', computed.transition);

// 3. Zavřít drawer a sledovat, zda se transform mění
// Mělo by se měnit z matrix(1, 0, 0, 1, 0, 0) na matrix(1, 0, 0, 1, 0, XXX)
```

### Test scroll lock

```javascript
// Při otevřeném draweru:
console.log('Body overflow:', document.body.style.overflow);
console.log('Body computed overflow:', window.getComputedStyle(document.body).overflow);
console.log('HTML overflow:', window.getComputedStyle(document.documentElement).overflow);

// Mělo by být: "hidden" pro všechny tři
```

---

## 📋 Checklist pro debugging

### Slide-out problém

- [ ] `isMounted` zůstává `true` během celé animace (300ms)
- [ ] `isAnimating` se změní na `false` při zavření
- [ ] CSS `transform` se mění z `translateY(0)` na `translateY(100%)`
- [ ] CSS `transition` je aplikován
- [ ] Parent komponenta neunmountuje drawer předčasně
- [ ] React Strict Mode nezpůsobuje problémy
- [ ] Žádný jiný CSS nepřepisuje transform

### Scroll lock problém

- [ ] `document.body.style.overflow` je `"hidden"` při otevření
- [ ] `window.getComputedStyle(document.body).overflow` je `"hidden"`
- [ ] `document.documentElement.style.overflow` je také `"hidden"`
- [ ] Scroll je zablokován i na mobilních zařízeních
- [ ] Scroll je obnoven při zavření
- [ ] Cleanup funkce vždy obnoví scroll

---

## 🔧 Kompletní opravená verze

### Pro slide-out problém

```javascript
useEffect(() => {
    let openTimer;
    let closeTimer;
    let isUnmounting = false;

    if (isOpen) {
        isUnmounting = false;
        setIsMounted(true);
        openTimer = setTimeout(() => {
            if (!isUnmounting) {
                setIsAnimating(true);
            }
        }, 50);
    } else {
        // DŮLEŽITÉ: Neodstraňovat z DOM okamžitě!
        setIsAnimating(false);
        closeTimer = setTimeout(() => {
            if (!isUnmounting) {
                setIsMounted(false);
            }
        }, animationDuration);
    }

    return () => {
        isUnmounting = true;
        if (openTimer) clearTimeout(openTimer);
        if (closeTimer) clearTimeout(closeTimer);
    };
}, [isOpen, animationDuration]);
```

### Pro scroll lock problém

```javascript
useEffect(() => {
    if (isMounted) {
        const html = document.documentElement;
        const body = document.body;
        const scrollY = window.scrollY;
        
        // Použít !important pro případ CSS frameworku
        html.style.setProperty('overflow', 'hidden', 'important');
        body.style.setProperty('overflow', 'hidden', 'important');
        
        // Pro mobilní zařízení (odkomentovat pokud je potřeba):
        // body.style.setProperty('position', 'fixed', 'important');
        // body.style.setProperty('width', '100%', 'important');
        // body.style.setProperty('top', `-${scrollY}px`, 'important');
    } else {
        document.documentElement.style.removeProperty('overflow');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('position');
        document.body.style.removeProperty('width');
        document.body.style.removeProperty('top');
    }
    
    return () => {
        document.documentElement.style.removeProperty('overflow');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('position');
        document.body.style.removeProperty('width');
        document.body.style.removeProperty('top');
    };
}, [isMounted]);
```

---

## 📚 Více informací

Pro detailní popis problémů a řešení viz:
- **[ANIMATION_AND_SCROLL_LOCK.md](./ANIMATION_AND_SCROLL_LOCK.md)** - Detailní debugging guide

