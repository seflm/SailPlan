# BottomDrawer - Export komponenty

Tato složka obsahuje exportovanou BottomDrawer komponentu s detailní dokumentací animací a scroll lock mechanismu.

## 📁 Obsah

- `BottomDrawer.js` - Komponenta s detailními komentáři
- `ANIMATION_AND_SCROLL_LOCK.md` - Detailní popis animací a scroll locku
- `README.md` - Tento soubor

## 🚀 Rychlý start

### Instalace

```bash
npm install react react-dom lucide-react
```

### Použití

```javascript
import BottomDrawer from './BottomDrawer';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setIsOpen(true)}>Otevřít drawer</button>
      
      <BottomDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Nadpis draweru"
        theme="light"
        maxHeight={60}
      >
        <p>Obsah draweru</p>
      </BottomDrawer>
    </>
  );
}
```

## 📖 Props

| Prop | Typ | Default | Popis |
|------|-----|---------|-------|
| `isOpen` | `boolean` | - | Zda je drawer otevřený |
| `onClose` | `function` | - | Callback pro zavření |
| `title` | `string` | - | Nadpis draweru |
| `children` | `ReactNode` | - | Obsah draweru |
| `theme` | `'dark' \| 'light'` | `'light'` | Téma (barvy) |
| `maxHeight` | `number` | `50` | Maximální výška obsahu v vh |
| `animationDuration` | `number` | `300` | Délka animace v ms |

## 🎨 Jak to funguje

### 1. Slide-in animace

Drawer se vysouvá ze spodu obrazovky pomocí CSS transform:

```
translateY(100%) → translateY(0)
```

### 2. Scroll lock

Když je drawer otevřený, scrollování stránky je zablokováno:

```javascript
document.body.style.overflow = 'hidden';
```

### 3. React Portal

Drawer je renderován přímo do `document.body` pomocí React Portal, což zajišťuje správné z-index a pozicování.

## 📚 Dokumentace

Pro detailní popis animací a scroll lock mechanismu viz:
- **[ANIMATION_AND_SCROLL_LOCK.md](./ANIMATION_AND_SCROLL_LOCK.md)**

Tento dokument obsahuje:
- Detailní popis slide-in/slide-out animací
- Jak funguje scroll lock mechanismus
- Timeline animací
- Technické detaily implementace
- Řešení běžných problémů

## 🔧 Customizace

### Změna délky animace

```javascript
<BottomDrawer
  animationDuration={500}  // 500ms místo 300ms
  ...
/>
```

### Změna maximální výšky

```javascript
<BottomDrawer
  maxHeight={70}  // 70vh místo 50vh
  ...
/>
```

### Vlastní styling

Komponenta používá inline styles. Pro vlastní styling můžete:

1. Upravit přímo v `BottomDrawer.js`
2. Přidat CSS třídy a upravit komponentu
3. Použít CSS-in-JS řešení (styled-components, emotion, atd.)

## ⚠️ Důležité poznámky

1. **Scroll lock:** Komponenta automaticky zablokuje scroll při otevření a obnoví při zavření
2. **Cleanup:** Cleanup funkce vždy obnoví scroll, i při neočekávaném unmount
3. **Portal:** Drawer je renderován do `document.body`, ne do normální DOM hierarchie
4. **Delay:** 50ms delay mezi mount a animací je nutný pro plynulou animaci

## 🐛 Řešení problémů

### Slide-out animace nefunguje (drawer prostě zmizí)

**Rychlé řešení:**
1. Ověřit, že `isMounted` zůstává `true` během celé animace (300ms)
2. Použít `useRef` pro timery místo proměnných
3. Přidat `!important` do CSS transform
4. Zkontrolovat, že parent komponenta neunmountuje drawer předčasně

**Detailní řešení:** Viz [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) nebo [ANIMATION_AND_SCROLL_LOCK.md](./ANIMATION_AND_SCROLL_LOCK.md)

### Scroll lock nefunguje (jde scrollovat obsah pod drawerem)

**Rychlé řešení:**
1. Použít `!important` při nastavování overflow
2. Zablokovat scroll i na `html` elementu
3. Pro mobilní zařízení použít `position: fixed` na body
4. Použít CSS třídu místo inline style

**Detailní řešení:** Viz [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) nebo [ANIMATION_AND_SCROLL_LOCK.md](./ANIMATION_AND_SCROLL_LOCK.md)

### Drawer je pod jinými elementy

Ujistěte se, že používáte React Portal a správný z-index (50).

### Další problémy

Více řešení problémů v:
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Rychlý troubleshooting guide
- **[ANIMATION_AND_SCROLL_LOCK.md](./ANIMATION_AND_SCROLL_LOCK.md)** - Detailní debugging guide

## 📝 Příklad použití z projektu

V původním projektu se BottomDrawer používá například takto:

```javascript
// V DashboardPage.js
{isMobile ? (
  <BottomDrawer 
    isOpen={isCashflowDetailOpen} 
    onClose={() => setIsCashflowDetailOpen(false)} 
    title={t('dashboard.cashflowDetailTitle')} 
    theme={theme}
  >
    <CashflowDetailView 
      items={items} 
      liquidAssets={liquidAssets} 
      ...
    />
  </BottomDrawer>
) : (
  <Modal ... />
)}
```

## 📄 Licence

Tato komponenta je součástí portfolio tracker aplikace.

---

Pro více informací viz hlavní dokumentaci projektu.

