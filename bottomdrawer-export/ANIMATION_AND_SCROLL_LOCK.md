# BottomDrawer - Detailní popis animací a scroll lock mechanismu

Tento dokument detailně popisuje, jak fungují animace slide-in/slide-out a scroll lock mechanismus v BottomDrawer komponentě.

---

## 📋 Obsah

1. [Přehled mechanismů](#přehled-mechanismů)
2. [Slide-in animace (otevření)](#slide-in-animace-otevření)
3. [Slide-out animace (zavření)](#slide-out-animace-zavření)
4. [Scroll lock mechanismus](#scroll-lock-mechanismus)
5. [Timeline animací](#timeline-animací)
6. [Technické detaily](#technické-detaily)
7. [Řešení problémů](#řešení-problémů)

---

## Přehled mechanismů

BottomDrawer používá tři hlavní mechanismy:

1. **Lifecycle management** - řízení, kdy je komponenta v DOM
2. **CSS Transform animace** - slide-in/slide-out efekt
3. **Body overflow lock** - zablokování scrollování pozadí

---

## Slide-in animace (otevření)

### Krok za krokem

```
1. Uživatel klikne na tlačítko → isOpen = true
   ↓
2. useEffect detekuje změnu isOpen
   ↓
3. setIsMounted(true) - komponenta se přidá do DOM
   ↓
4. Komponenta se vykreslí s transform: translateY(100%)
   - Drawer je mimo obrazovku (100% své výšky dolů)
   - Backdrop má opacity: 0 (neviditelný)
   ↓
5. Po 50ms delay: setIsAnimating(true)
   ↓
6. CSS transition se spustí:
   - transform: translateY(100%) → translateY(0)
   - opacity: 0 → 1 (backdrop)
   ↓
7. Po 300ms: animace dokončena
   - Drawer je viditelný na spodku obrazovky
   - Backdrop je viditelný
```

### Kód

```javascript
if (isOpen) {
    setIsMounted(true);              // Přidat do DOM
    openTimer = setTimeout(() => {
        setIsAnimating(true);         // Spustit animaci po 50ms
    }, 50);
}
```

### CSS transform

```javascript
const drawerStyle = {
    transform: isAnimating ? 'translateY(0)' : 'translateY(100%)',
    transition: `transform 300ms ease-in-out`,
};
```

**Vizuální reprezentace:**

```
Před animací (translateY(100%)):
┌─────────────────────┐
│                     │
│    Viewport         │
│                     │
│                     │
└─────────────────────┘
         ┌─────────────┐  ← Drawer je mimo obrazovku
         │   Drawer    │
         └─────────────┘

Po animaci (translateY(0)):
┌─────────────────────┐
│                     │
│    Viewport         │
│                     │
│                     │
└─────────────────────┘
┌─────────────────────┐  ← Drawer je viditelný
│   Drawer            │
└─────────────────────┘
```

---

## Slide-out animace (zavření)

### Krok za krokem

```
1. Uživatel klikne na X nebo backdrop → isOpen = false
   ↓
2. useEffect detekuje změnu isOpen
   ↓
3. setIsAnimating(false) - spustí se animace zpět
   ↓
4. CSS transition se spustí:
   - transform: translateY(0) → translateY(100%)
   - opacity: 1 → 0 (backdrop)
   ↓
5. Po 300ms: animace dokončena
   ↓
6. setIsMounted(false) - komponenta se odstraní z DOM
```

### Kód

```javascript
else {
    setIsAnimating(false);            // Zastavit animaci (spustí slide-out)
    closeTimer = setTimeout(() => {
        setIsMounted(false);          // Odstranit z DOM po animaci
    }, animationDuration);             // 300ms
}
```

### Proč čekáme na konec animace?

Pokud bychom odstranili komponentu z DOM okamžitě, animace by se neprovedla, protože by element zmizel dřív, než by CSS transition stihl proběhnout.

---

## Scroll lock mechanismus

### Jak funguje

Scroll lock zablokuje scrollování `document.body` elementu, když je drawer otevřený.

### Implementace

```javascript
useEffect(() => {
    if (isMounted) {
        // Zablokovat scrollování
        document.body.style.overflow = 'hidden';
    } else {
        // Obnovit scrollování
        document.body.style.overflow = 'unset';
    }
    
    // Cleanup: vždy obnovit scroll při unmount
    return () => {
        document.body.style.overflow = 'unset';
    };
}, [isMounted]);
```

### Proč to funguje?

1. **`overflow: hidden` na body:**
   - Zablokuje scrollování celé stránky
   - Obsah pod drawerem se nemůže scrollovat
   - Scroll pozice zůstane zachována

2. **Drawer má vlastní scroll:**
   ```javascript
   <div style={{ 
       maxHeight: '50vh',
       overflowY: 'auto'  // Drawer sám může scrollovat
   }}>
       {children}
   </div>
   ```

3. **Backdrop je fixní:**
   ```javascript
   const backdropStyle = {
       position: 'fixed',  // Fixní vůči viewportu
       inset: '0px',       // Pokrývá celou obrazovku
   };
   ```

### Vizuální reprezentace

```
BEZ SCROLL LOCK (špatně):
┌─────────────────────┐
│  Scrollable Content │ ← Může se scrollovat
│                     │
│  [Backdrop]         │
│  ┌─────────────┐    │
│  │   Drawer    │    │
│  └─────────────┘    │
└─────────────────────┘

S SCROLL LOCK (správně):
┌─────────────────────┐
│  Content (locked)   │ ← NEMŮŽE se scrollovat
│                     │
│  [Backdrop]         │
│  ┌─────────────┐    │
│  │   Drawer    │ ← Může scrollovat svůj obsah
│  │ [scrollable]│    │
│  └─────────────┘    │
└─────────────────────┘
```

### Proč je cleanup důležitý?

Cleanup funkce vždy obnoví `overflow`, i když se komponenta unmountuje neočekávaně:

```javascript
return () => {
    document.body.style.overflow = 'unset';
};
```

**Scénáře, kdy to pomůže:**
- Uživatel naviguje pryč během otevřeného draweru
- Komponenta se unmountuje kvůli chybě
- Parent komponenta se unmountuje

Bez cleanup by scroll zůstal zablokovaný!

---

## Timeline animací

### Kompletní timeline otevření

```
t=0ms:    isOpen = true
          ↓
t=0ms:    setIsMounted(true)
          Komponenta v DOM s transform: translateY(100%)
          ↓
t=50ms:   setIsAnimating(true)
          CSS transition začíná
          ↓
t=50-350ms: Animace probíhá
            transform: translateY(100%) → translateY(0)
            opacity: 0 → 1
          ↓
t=350ms:  Animace dokončena
          Drawer je viditelný
```

### Kompletní timeline zavření

```
t=0ms:    isOpen = false
          ↓
t=0ms:    setIsAnimating(false)
          CSS transition začíná (zpět)
          ↓
t=0-300ms: Animace probíhá
           transform: translateY(0) → translateY(100%)
           opacity: 1 → 0
          ↓
t=300ms:  Animace dokončena
          ↓
t=300ms:  setIsMounted(false)
          Komponenta odstraněna z DOM
```

---

## Technické detaily

### Proč 50ms delay?

50ms delay mezi `setIsMounted(true)` a `setIsAnimating(true)` je nutný, aby:

1. Browser stihl vykreslit počáteční stav (translateY(100%))
2. CSS transition mohl detekovat změnu
3. Animace proběhla plynule

**Bez delay:**
- Browser by změnil stav a CSS současně
- Transition by neproběhla (žádná změna k animování)
- Drawer by se objevil okamžitě bez animace

**S delay:**
- Browser vykreslí počáteční stav
- Po 50ms se změní na finální stav
- Transition detekuje změnu a animuje

### Proč React Portal?

```javascript
return createPortal(
    <Drawer />,
    document.body
);
```

**Výhody:**
- Drawer je vždy na vrcholu (z-index funguje správně)
- Není ovlivněn overflow rodičovských elementů
- Fixní pozice funguje bez problémů
- Není ovlivněn transform rodičů

**Bez Portal:**
- Z-index by mohl být ovlivněn rodiči
- Overflow: hidden na rodiči by skryl drawer
- Transform na rodiči by posunul drawer

### CSS Transform vs Position

**Proč `transform` místo `bottom`?**

```javascript
// ❌ ŠPATNĚ - animace by byla pomalá
bottom: isAnimating ? '0px' : '-100%';

// ✅ SPRÁVNĚ - animace je plynulá
transform: isAnimating ? 'translateY(0)' : 'translateY(100%)';
```

**Důvody:**
1. **Performance:** Transform je hardware-accelerated (GPU)
2. **Plynulost:** 60fps vs možná lag s position
3. **Layout:** Transform neovlivňuje layout ostatních elementů

### Easing funkce

```javascript
transition: `transform 300ms ease-in-out`
```

**`ease-in-out` znamená:**
- Začátek: pomalý start
- Střed: rychlejší
- Konec: pomalý konec

**Alternativy:**
- `ease` - rychlý start, pomalý konec
- `linear` - konstantní rychlost
- `ease-in` - pomalý start
- `ease-out` - pomalý konec

---

## Řešení problémů

### Problém 1: Animace neproběhne

**Příčina:** Komponenta se přidá do DOM a animace začne současně.

**Řešení:** Použít delay (50ms) mezi mount a animací.

```javascript
setIsMounted(true);
setTimeout(() => setIsAnimating(true), 50);
```

### Problém 2: Scroll zůstane zablokovaný

**Příčina:** Chybí cleanup funkce v useEffect.

**Řešení:** Vždy obnovit overflow v cleanup:

```javascript
return () => {
    document.body.style.overflow = 'unset';
};
```

### Problém 3: Drawer je pod jinými elementy

**Příčina:** Není použit React Portal nebo z-index je příliš nízký.

**Řešení:** Použít Portal a správný z-index:

```javascript
return createPortal(
    <div style={{ zIndex: 50 }}>...</div>,
    document.body
);
```

### Problém 4: Animace je trhavá

**Příčina:** Použití `position` nebo `top/bottom` místo `transform`.

**Řešení:** Použít CSS transform:

```javascript
transform: isAnimating ? 'translateY(0)' : 'translateY(100%)'
```

### Problém 5: Obsah draweru se nescrolluje

**Příčina:** Chybí `overflowY: 'auto'` na content divu.

**Řešení:** Přidat scroll na content:

```javascript
<div style={{ 
    maxHeight: '50vh',
    overflowY: 'auto'
}}>
    {children}
</div>
```

---

## 🔴 KRITICKÉ PROBLÉMY: Slide-out animace nefunguje

### Symptom: Drawer prostě zmizí bez animace

Pokud drawer zmizí okamžitě bez slide-out animace, jedná se o kritický problém. Níže jsou detailní kroky pro debugging a řešení.

### Debugging krok za krokem

#### Krok 1: Ověřit, že komponenta zůstává v DOM během animace

**Test:**
```javascript
useEffect(() => {
    if (isOpen) {
        setIsMounted(true);
        openTimer = setTimeout(() => {
            setIsAnimating(true);
        }, 50);
    } else {
        console.log('🔴 Zavírání - isAnimating před změnou:', isAnimating);
        setIsAnimating(false);
        console.log('🔴 Zavírání - isAnimating po změně:', false);
        console.log('🔴 Zavírání - isMounted:', isMounted);
        
        closeTimer = setTimeout(() => {
            console.log('🔴 Zavírání - odstraňuji z DOM');
            setIsMounted(false);
        }, animationDuration);
    }

    return () => {
        clearTimeout(openTimer);
        clearTimeout(closeTimer);
    };
}, [isOpen, animationDuration]);
```

**Co hledat:**
- Pokud se `isMounted` změní na `false` dřív než po 300ms, problém je v cleanup nebo v React Strict Mode
- Pokud se `isAnimating` nezmění na `false`, problém je v logice

#### Krok 2: Ověřit CSS transform

**Test v DevTools:**
1. Otevřít drawer
2. V Elements tab najít drawer element
3. Při zavírání sledovat `transform` property
4. Mělo by se měnit z `translateY(0)` na `translateY(100%)`

**Možné problémy:**
```javascript
// ❌ ŠPATNĚ - transform může být přepsán jiným CSS
const drawerStyle = {
    transform: isAnimating ? 'translateY(0)' : 'translateY(100%)',
    // Pokud máte !important v CSS, může to přepsat inline style
};

// ✅ SPRÁVNĚ - použít !important v inline style pokud je potřeba
const drawerStyle = {
    transform: isAnimating ? 'translateY(0) !important' : 'translateY(100%) !important',
    transition: `transform ${animationDuration}ms ease-in-out !important`,
};
```

#### Krok 3: Ověřit, že transition není přepsán

**Test:**
```javascript
// Přidat do drawerStyle pro debugging
const drawerStyle = {
    // ... ostatní styly
    transform: isAnimating ? 'translateY(0)' : 'translateY(100%)',
    transition: `transform ${animationDuration}ms ease-in-out`,
    // Přidat pro debugging:
    willChange: 'transform', // Optimalizace pro browser
    WebkitTransform: isAnimating ? 'translateY(0)' : 'translateY(100%)', // Pro Safari
};
```

#### Krok 4: React Strict Mode problém

**Problém:** React Strict Mode v development módu spouští efekty dvakrát, což může způsobit, že se timer zruší dřív.

**Řešení 1: Použít useRef pro timery**
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
        if (openTimerRef.current) {
            clearTimeout(openTimerRef.current);
        }
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
        }
    };
}, [isOpen, animationDuration]);
```

**Řešení 2: Použít requestAnimationFrame**
```javascript
useEffect(() => {
    let rafId;
    
    if (isOpen) {
        setIsMounted(true);
        rafId = requestAnimationFrame(() => {
            setTimeout(() => {
                setIsAnimating(true);
            }, 50);
        });
    } else {
        setIsAnimating(false);
        rafId = requestAnimationFrame(() => {
            setTimeout(() => {
                setIsMounted(false);
            }, animationDuration);
        });
    }

    return () => {
        if (rafId) {
            cancelAnimationFrame(rafId);
        }
    };
}, [isOpen, animationDuration]);
```

#### Krok 5: Ověřit, že isMounted není změněn předčasně

**Problém:** Pokud se `isMounted` změní na `false` dřív, komponenta se odstraní z DOM před koncem animace.

**Test:**
```javascript
useEffect(() => {
    let openTimer;
    let closeTimer;

    if (isOpen) {
        setIsMounted(true);
        openTimer = setTimeout(() => {
            setIsAnimating(true);
        }, 50);
    } else {
        // DŮLEŽITÉ: Nezměnit isMounted okamžitě!
        setIsAnimating(false);
        
        // Počkat na konec animace PŘED odstraněním z DOM
        closeTimer = setTimeout(() => {
            setIsMounted(false);
        }, animationDuration);
    }

    return () => {
        clearTimeout(openTimer);
        clearTimeout(closeTimer);
    };
}, [isOpen, animationDuration]);

// DŮLEŽITÉ: Early return musí být až po useEffect!
if (typeof document === 'undefined' || !isMounted) {
    return null;
}
```

### Časté příčiny slide-out problému

#### 1. CSS Framework přepisuje styly

**Problém:** Tailwind CSS, Bootstrap, nebo jiný framework může přepisovat inline styles.

**Řešení:**
```javascript
// Použít CSS třídy místo inline styles
const drawerStyle = {
    // ... ostatní
    transform: isAnimating ? 'translateY(0)' : 'translateY(100%)',
};

// A v CSS:
.drawer-enter {
    transform: translateY(100%);
    transition: transform 300ms ease-in-out;
}

.drawer-enter-active {
    transform: translateY(0);
}
```

**Nebo použít !important:**
```javascript
const drawerStyle = {
    transform: `${isAnimating ? 'translateY(0)' : 'translateY(100%)'} !important`,
    transition: `transform ${animationDuration}ms ease-in-out !important`,
};
```

#### 2. Parent komponenta unmountuje drawer

**Problém:** Pokud parent komponenta podmíněně renderuje drawer a změní se podmínka, drawer se unmountuje okamžitě.

**Špatně:**
```javascript
// ❌ ŠPATNĚ
{isOpen && <BottomDrawer isOpen={isOpen} onClose={...} />}
```

**Správně:**
```javascript
// ✅ SPRÁVNĚ - drawer je vždy v DOM, jen se mění isOpen
<BottomDrawer isOpen={isOpen} onClose={...} />
```

#### 3. onClose mění isOpen synchronně

**Problém:** Pokud `onClose` dělá něco, co způsobí re-render, může to přerušit animaci.

**Test:**
```javascript
const handleClose = () => {
    console.log('Zavírání draweru');
    // Pokud zde děláte něco těžkého, může to přerušit animaci
    setIsOpen(false);
};

// Lepší: použít setTimeout pro async operace
const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
        setIsOpen(false);
    }, animationDuration);
};
```

#### 4. CSS transition není aplikován

**Test v konzoli:**
```javascript
// Najít drawer element
const drawer = document.querySelector('[role="dialog"]');
const computed = window.getComputedStyle(drawer);
console.log('Transform:', computed.transform);
console.log('Transition:', computed.transition);
```

**Pokud transition není aplikován:**
- Zkontrolovat, zda není přepsán jiným CSS
- Zkontrolovat, zda inline style funguje
- Zkusit přidat `!important`

### Kompletní opravená verze pro slide-out

```javascript
useEffect(() => {
    let openTimer;
    let closeTimer;
    let isUnmounting = false;

    if (isOpen) {
        isUnmounting = false;
        setIsMounted(true);
        // Použít requestAnimationFrame pro lepší synchronizaci
        openTimer = setTimeout(() => {
            if (!isUnmounting) {
                setIsAnimating(true);
            }
        }, 50);
    } else {
        // DŮLEŽITÉ: Neodstraňovat z DOM okamžitě!
        setIsAnimating(false);
        
        // Počkat na konec animace
        closeTimer = setTimeout(() => {
            setIsMounted(false);
        }, animationDuration);
    }

    return () => {
        isUnmounting = true;
        if (openTimer) clearTimeout(openTimer);
        if (closeTimer) clearTimeout(closeTimer);
    };
}, [isOpen, animationDuration]);
```

---

## 🔴 KRITICKÉ PROBLÉMY: Scroll lock nefunguje

### Symptom: Obsah pod drawerem se stále scrolluje

Pokud můžete scrollovat obsah pod drawerem, scroll lock mechanismus nefunguje správně.

### Debugging krok za krokem

#### Krok 1: Ověřit, že overflow je nastaven

**Test v konzoli:**
```javascript
// Při otevření draweru
console.log('Body overflow:', document.body.style.overflow);
console.log('Body computed overflow:', window.getComputedStyle(document.body).overflow);
```

**Očekávaný výsledek:**
- `document.body.style.overflow` = `"hidden"`
- `window.getComputedStyle(document.body).overflow` = `"hidden"`

**Pokud není `hidden`:**
- Zkontrolovat, zda se useEffect spouští
- Zkontrolovat, zda `isMounted` je `true`
- Zkontrolovat, zda není přepsán jiným CSS

#### Krok 2: Ověřit timing

**Problém:** Scroll lock se může nastavit pozdě nebo se může resetovat příliš brzy.

**Test:**
```javascript
useEffect(() => {
    console.log('🔵 Scroll lock - isMounted:', isMounted);
    
    if (isMounted) {
        console.log('🔵 Nastavuji overflow: hidden');
        document.body.style.overflow = 'hidden';
        console.log('🔵 Overflow nastaven:', document.body.style.overflow);
    } else {
        console.log('🔵 Obnovuji overflow: unset');
        document.body.style.overflow = 'unset';
    }
    
    return () => {
        console.log('🔵 Cleanup - obnovuji overflow');
        document.body.style.overflow = 'unset';
    };
}, [isMounted]);
```

#### Krok 3: Ověřit, že není přepsán CSS

**Problém:** Jiný CSS nebo JavaScript může přepisovat `overflow`.

**Test:**
```javascript
// Po nastavení overflow: hidden
setTimeout(() => {
    const computed = window.getComputedStyle(document.body);
    console.log('Computed overflow:', computed.overflow);
    console.log('Inline style overflow:', document.body.style.overflow);
    
    if (computed.overflow !== 'hidden' && document.body.style.overflow === 'hidden') {
        console.error('⚠️ CSS přepisuje inline style!');
    }
}, 100);
```

**Řešení:**
```javascript
// Použít !important
document.body.style.setProperty('overflow', 'hidden', 'important');
```

#### Krok 4: Ověřit, že není více instancí draweru

**Problém:** Pokud máte více drawerů otevřených současně, cleanup může resetovat scroll příliš brzy.

**Řešení:**
```javascript
// Globální counter pro otevřené drawery
let openDrawersCount = 0;

useEffect(() => {
    if (isMounted) {
        openDrawersCount++;
        if (openDrawersCount === 1) {
            document.body.style.overflow = 'hidden';
        }
    } else {
        openDrawersCount = Math.max(0, openDrawersCount - 1);
        if (openDrawersCount === 0) {
            document.body.style.overflow = 'unset';
        }
    }
    
    return () => {
        openDrawersCount = Math.max(0, openDrawersCount - 1);
        if (openDrawersCount === 0) {
            document.body.style.overflow = 'unset';
        }
    };
}, [isMounted]);
```

### Časté příčiny scroll lock problému

#### 1. CSS Framework přepisuje overflow

**Problém:** Tailwind CSS nebo jiný framework může mít globální styly pro body.

**Řešení 1: Použít !important**
```javascript
useEffect(() => {
    if (isMounted) {
        document.body.style.setProperty('overflow', 'hidden', 'important');
    } else {
        document.body.style.removeProperty('overflow');
    }
    
    return () => {
        document.body.style.removeProperty('overflow');
    };
}, [isMounted]);
```

**Řešení 2: Použít třídu místo inline style**
```javascript
// V CSS
body.drawer-open {
    overflow: hidden !important;
}

// V komponentě
useEffect(() => {
    if (isMounted) {
        document.body.classList.add('drawer-open');
    } else {
        document.body.classList.remove('drawer-open');
    }
    
    return () => {
        document.body.classList.remove('drawer-open');
    };
}, [isMounted]);
```

#### 2. Scroll je na jiném elementu

**Problém:** Scrollování může být na `html` elementu nebo na jiném kontejneru, ne na `body`.

**Test:**
```javascript
// Zkontrolovat všechny možné scroll kontejnery
console.log('HTML overflow:', window.getComputedStyle(document.documentElement).overflow);
console.log('Body overflow:', window.getComputedStyle(document.body).overflow);

// Pokud máte wrapper div
const wrapper = document.querySelector('.app-wrapper');
if (wrapper) {
    console.log('Wrapper overflow:', window.getComputedStyle(wrapper).overflow);
}
```

**Řešení:**
```javascript
useEffect(() => {
    if (isMounted) {
        // Zablokovat scroll na html i body
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        
        // Pokud máte wrapper
        const wrapper = document.querySelector('.app-wrapper');
        if (wrapper) {
            wrapper.style.overflow = 'hidden';
        }
    } else {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        
        const wrapper = document.querySelector('.app-wrapper');
        if (wrapper) {
            wrapper.style.overflow = '';
        }
    }
    
    return () => {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
    };
}, [isMounted]);
```

#### 3. Touch scroll na mobilních zařízeních

**Problém:** Na mobilních zařízeních může `overflow: hidden` nefungovat pro touch scroll.

**Řešení:**
```javascript
useEffect(() => {
    if (isMounted) {
        // Zablokovat scroll
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.height = '100%';
        
        // Uložit scroll pozici
        const scrollY = window.scrollY;
        document.body.style.top = `-${scrollY}px`;
    } else {
        // Obnovit scroll
        const scrollY = document.body.style.top;
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
        document.body.style.top = '';
        
        if (scrollY) {
            window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
    }
    
    return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
        document.body.style.top = '';
    };
}, [isMounted]);
```

#### 4. React Router nebo jiná navigace

**Problém:** Při navigaci se může cleanup spustit pozdě nebo vůbec.

**Řešení:**
```javascript
useEffect(() => {
    if (isMounted) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'unset';
    }
    
    // Cleanup při unmount
    return () => {
        // Použít setTimeout pro zajištění, že se spustí
        setTimeout(() => {
            document.body.style.overflow = 'unset';
        }, 0);
    };
}, [isMounted]);

// Také cleanup při unmount komponenty
useEffect(() => {
    return () => {
        document.body.style.overflow = 'unset';
    };
}, []);
```

### Kompletní opravená verze scroll lock

```javascript
useEffect(() => {
    if (isMounted) {
        // Zablokovat scroll na html i body
        const html = document.documentElement;
        const body = document.body;
        
        // Uložit původní hodnoty
        const originalHtmlOverflow = html.style.overflow;
        const originalBodyOverflow = body.style.overflow;
        const originalBodyPosition = body.style.position;
        const scrollY = window.scrollY;
        
        // Nastavit lock
        html.style.setProperty('overflow', 'hidden', 'important');
        body.style.setProperty('overflow', 'hidden', 'important');
        body.style.setProperty('position', 'fixed', 'important');
        body.style.setProperty('width', '100%', 'important');
        body.style.setProperty('top', `-${scrollY}px`, 'important');
        
        return () => {
            // Obnovit původní hodnoty
            html.style.removeProperty('overflow');
            body.style.removeProperty('overflow');
            body.style.removeProperty('position');
            body.style.removeProperty('width');
            body.style.removeProperty('top');
            
            // Obnovit scroll pozici
            window.scrollTo(0, scrollY);
        };
    } else {
        // Pokud není mounted, obnovit scroll
        document.documentElement.style.removeProperty('overflow');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('position');
        document.body.style.removeProperty('width');
        document.body.style.removeProperty('top');
    }
}, [isMounted]);
```

---

## 🧪 Testovací checklist

### Pro slide-out animaci

- [ ] Drawer zůstává v DOM během celé animace (300ms)
- [ ] `isAnimating` se změní na `false` při zavření
- [ ] `isMounted` se změní na `false` až po 300ms
- [ ] CSS `transform` se mění z `translateY(0)` na `translateY(100%)`
- [ ] CSS `transition` je aplikován
- [ ] Žádný jiný CSS nepřepisuje transform
- [ ] React Strict Mode nezpůsobuje problémy
- [ ] Parent komponenta neunmountuje drawer předčasně

### Pro scroll lock

- [ ] `document.body.style.overflow` je `"hidden"` při otevření
- [ ] `window.getComputedStyle(document.body).overflow` je `"hidden"`
- [ ] Scroll je zablokován na `html` i `body`
- [ ] Scroll pozice je zachována
- [ ] Scroll je obnoven při zavření
- [ ] Cleanup funkce vždy obnoví scroll
- [ ] Funguje na mobilních zařízeních (touch scroll)
- [ ] Funguje při navigaci (React Router)

---

## Shrnutí

### Klíčové body

1. **Lifecycle:** Použít dva stavy (`isMounted`, `isAnimating`) pro správné řízení
2. **Delay:** 50ms delay mezi mount a animací pro plynulost
3. **Transform:** Použít CSS transform místo position pro performance
4. **Scroll lock:** Nastavit `overflow: hidden` na body při otevření
5. **Cleanup:** Vždy obnovit overflow v cleanup funkci
6. **Portal:** Použít React Portal pro správné z-index a pozicování

### Best practices

✅ Použít CSS transform pro animace  
✅ Přidat delay před spuštěním animace  
✅ Vždy cleanup při unmount  
✅ Použít React Portal pro modals/drawers  
✅ Zablokovat scroll při otevření  
✅ Testovat na různých zařízeních  

---

*Tento dokument popisuje implementaci BottomDrawer komponenty z portfolio tracker aplikace.*

