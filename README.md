# Boatra.com

Moderní platforma pro organizaci jachtových plaveb. Od plánování přes rozdělení posádky až po předávání lodí – vše na jednom místě.

## Funkce

- ⛵ **Správa flotily** - Organizujte plavby s jednou nebo více loděmi
- 📋 **Chytré checklisty** - Vytvářejte vlastní checklisty pro předávání lodí a další úkoly
- 👥 **Crew listy** - Sběr důležitých údajů od účastníků
- 💳 **Sledování plateb** - Přehled záloh a plateb
- 🗺️ **Trasy a lokace** - Sdílení informací o trase plavby
- ⏱️ **Časová osa** - Hlavní timeline s důležitými termíny

## Technologie

- React 18
- Vite
- Firebase (Authentication, Firestore, Storage)
- React Router

## Instalace

1. Nainstalujte závislosti:
```bash
npm install
```

2. Vytvořte soubor `.env` na základě `.env.example` a vyplňte Firebase konfiguraci:
```bash
cp .env.example .env
```

3. Spusťte vývojový server:
```bash
npm run dev
```

4. Pro produkční build:
```bash
npm run build
```

## Struktura projektu

```
src/
  ├── components/     # React komponenty
  ├── pages/         # Stránky aplikace
  ├── hooks/         # Custom React hooks
  ├── config/        # Konfigurace (Firebase)
  └── App.jsx        # Hlavní komponenta
```

## Firebase Setup

1. Vytvořte nový projekt v [Firebase Console](https://console.firebase.google.com/)
2. Povolte Authentication (Email/Password)
3. Vytvořte Firestore databázi
4. Povolte Storage
5. Zkopírujte konfigurační údaje do `.env` souboru

## License

MIT



