# Specifikace aplikace Boatra.com

## 1. Úvod

Boatra.com je aplikace pro organizaci a management plaveb, převážně jachet určených pro 2-20 lidí. Aplikace je navržena pro účastníky, kapitány i organizátory plaveb. Plná podpora pro mobilní responzivní zobrazení - většina uživatelů bude na mobilním zařízení a kapitáni na mobilech budou i vyplňovat checklisty při předání lodí.

## 2. Role a oprávnění

### 2.1 Hlavní role

**Organizátor:**
- Vytváří a spravuje plavby
- Přiřazuje účastníky do lodí
- Mění účastníkům role
- Vidí a vyplňuje checklisty lodí
- Vidí stav hlavního checklistu všech účastníků a může ho vyplňovat
- Vidí stav vyplnění crewlistu a zobrazuje crewlist pro jednotlivé lodě
- Kompletní informace z crewlistů všech lodí vidí pouze organizátor
- Spravuje dokumenty k plavbě (přidávání, mazání, prohlížení, stahování)
- Exportuje crewlist (každá loď zvlášť jako PDF)
- Exportuje lodní deník všech lodí (každá loď zvlášť jako PDF)
- Spravuje checklisty a templaty v nastavení organizátora
- Organizátor může být sám členem posádky (kapitán nebo jiný)

**Kapitán:**
- Vidí informace pouze z crewlistů přiřazených jejich lodím
- Vidí dokumenty k plavbě (pouze prohlížení, nemůže přidávat/mazat)
- Exportuje lodní deník své lodě (PDF)
- Vyplňuje lodní deník pro svou loď
- Vyplňuje checklisty pro svou loď
- Organizátor může být i kapitánem na lodi

**Člen posádky:**
- Člen posádky je kdokoliv, kdo je součástí plavby ale není organizátor
- Organizátor může ale být členem posádky
- Vidí svou vlastní instanci hlavního checklistu
- Vyplňuje crewlist (pokud je to povoleno v nastavení plavby)
- Vidí informace o své lodi a posádce (pokud je přiřazen)

### 2.2 Podrole

Organizátor může definovat podrole na lodi (např. kormidelník, mastman, bowman) jako podrole role klasického účastníka. Tyto podrole mají stejná oprávnění jako klasický účastník - jsou pouze vizuální pro lepší organizaci posádky.

### 2.3 Oprávnění k informacím

Jestli jednotlivé role uvidí informace o ostatních lodích (posádka, checklisty, info o lodi apod.) záleží na nastavení plavby organizátorem.

## 3. Hlavní rozhraní

### 3.1 Landing page (uživatel nepřihlášen)

- Propaguje aplikaci, zmiňuje její výhody a funkce
- CTA k registraci
- Zmiňuje pricing (budoucí feature, zatím je aplikace zdarma)
- Vysvětlení systému checklistů

### 3.2 Dashboard (základní obrazovka přihlášeného uživatele)

Hlavní obrazovka přihlášeného uživatele je jeho seznam plaveb (organizovaných i účastněných). Pokud uživatel nemá žádnou plavbu, na hlavní obrazovce se ukáže možnost:
- Zorganizovat plavbu
- Zúčastnit se nějaké (pomocí ID a PINu)
- Zobrazit si DEMO plavbu

#### 3.2.1 Hlavička

- Menu obsahující odkazy na sekci plaveb, kterých se uživatel účastní, a na sekci plaveb, které uživatel organizuje
- Kolečko s profilem - po kliku se otevře stránka s možností editace profilu
- Sekundární menu (roletka po kliknutí) obsahující:
  - Odkaz na stránku nastavení organizátora (pokud je uživatel organizátor)

### 3.3 Nastavení organizátora

Organizátor si zde může:

**Management checklistů:**
- Definovat jednotlivé checklisty (například přebírání lodě, vracení lodě, co sebou pro posádku, apod.)
- Obsahy checklistů je možné roztřídit kategorií (například u předávání lodě budou kategorie motor, kokpit, paluba, apod.)
- Defaultní checklist bude checklist na předání lodě

**Management templatů:**
- Možnost přidat a upravovat templaty plaveb (stejný formulář jako při vytváření plaveb)

## 4. Rozhraní plavby

### 4.1 Hlavní rozhraní(stránka) plavby

Hlavní rozhraní plavby bude následující (vše zde je definováno organizátorem při zakládání plavby ve formuláři plavby):

**Informace o plavbě poskytnuté organizátorem:**
- Informace o místě startu a volitelně i informace o cestě a cíli plavby. Včetně malé mapy.
- Seznam míst (lokality), kam se posádka podívá během plavby - každé místo může mít fotku
- Informace o přepravě do místa startu
- Informace o počtu lidí a počtu volných míst, počtu lodí v plavbě
- Informace o platbách a zálohách (organizátor si může odškrtávat od koho dostal zaplacenou definovanou zálohu v aplikaci - záloh může být více, ale aplikace sama o sobě není připravena na tracking financí)

**Hlavní timeline/checklist:**
- Oddělený od systému checklistů a nastavitelný přímo ve formuláři plavby
- Slouží jako checklist a časová osa toho, co se musí stihnout před plavbou (například platba zálohy, vyplnění crewlistu)
- Každý z bodů bude mít volitelně i nejpozdější datum splnění
- Každý event(bod) v checklistu bude mít nadpis, popis, a bude volitelně checkable
- Typy eventů: Custom, Crewlist, Platba
- Hlavní checklist je definovaný ve formuláři plavby organizátorem a zobrazuje se všem účastníkům na stránce plavby
- Všem se zobrazuje jejich instance a jen organizátor vidí stavy checklistů jednotlivých účastníků

**Sekce lodě:**
- Zobrazuje informace o všech lodích v plavbě
- V definici lodě se bude dát nastavit její jméno, technické parametry, počet míst, obrázek, role posádky na palubě (kormidelník, mastman, bowman, apod. - tyto podrole jsou podrole)

**Crewlist:**
- Údaje účastníků nutné z legálních důvodů
- Vždy existuje 1 crewlist pro 1 loď
- Posádka vyplňuje před odjezdem, pokud je to v nastavení plavby (formuláři) povoleno
- Organizátor definuje jaké informace potřebuje od každého účastníka
- Je možné definovat, že od různých rolí potřebuje různé informace (například od kapitána bude potřebovat číslo jeho licence)
- Crewlist bude v hlavním checklistu, pokud je povolen crewlist a pokud je přidán do hlavního checklistu

**Systém checklistů:**
- Checklisty jsou definované v nastavení organizátora
- Jsou univerzální a lze je použít libovolně jako následující:
  1. Checklist pro konkrétní role uživatelů (organizátor, kapitán, posádka, apod.) v plavbě - každý uživatel uvidí svoji vlastní instanci tohoto checklistu na stránce plavby a může si ho v rozhraní vyplnit
  2. Checklist pro loď - tyto checklisty budou vyplňovány jednou pro každou loď jejími kapitány nebo organizátorem plavby
- Ke každé vyplňované položce checklistu může být přidána poznámka (i namísto vyplnění)

**Lokality:**
- Sekce "lokality" na stránce plavby obsahuje:
  - Start (povinný)
  - Cíl (volitelný, pokud není stejný jako start)
  - Seznam míst s fotkami, kam se posádka podívá během plavby
- Organizátor přidává lokality při vytváření/editaci plavby nebo v templatu
- Pořadí míst nehraje roli

**Dokumenty:**
- Všechny dokumenty jsou na úrovni plavby (smlouvy, pojištění, licence, dokumentace lodě, apod.)
- Aplikace nepracuje s typy dokumentů - jsou to pouze obecné "dokumenty k plavbě"
- Pouze organizátor může přidávat, mazat, prohlížet a stahovat dokumenty
- Dokumenty vidí na stránce plavby pouze organizátor (malá sekce schovaná v menu plavby)
- Kapitáni vidí dokumenty (pouze prohlížení, nemohou přidávat/mazat/stahovat)

**Lodní deník:**
- Každý kapitán každý den plavby vyplní lodní deník
- Informace z něho pak budou k dispozici kapitánovi a organizátorům v aplikaci a k exportu
- Sledování vody, paliva apod. je součástí lodního deníku

### 4.2 Rozhraní plavby - verze organizátora

Organizátor bude mít navíc možnosti:
- Přiřazovat účastníky do lodí
- Měnit účastníkům role
- Vidět a vyplňovat checklisty lodí
- Vidět stav hlavního checklistu všech účastníků a vyplňovat ho
- Vidět stav vyplnění crewlistu a zobrazit crewlist pro jednotlivé lodě (ať už vyplněný, částečně vyplněný, nebo úplně vyplněný, vždy k němu bude mít přístup)
- Spravovat dokumenty
- Exportovat crewlist (každá loď zvlášť jako PDF)
- Exportovat lodní deník všech lodí (každá loď zvlášť jako PDF)

### 4.3 Rozhraní plavby - verze kapitána

Kapitán má navíc možnosti:
- Vidět informace z crewlistů přiřazených jejich lodím
- Vidět dokumenty k plavbě (pouze prohlížení)
- Exportovat lodní deník své lodě (PDF) - v menu plavby
- Vyplňovat lodní deník pro svou loď
- Vyplňovat checklisty pro svou loď

### 4.4 Rozhraní plavby - uživatel, který si plavbu zobrazil ale ještě neklikl na tlačítko zúčastnit se

- Nebude obsahovat téměř žádná data o ostatních účastnících kromě jejich křestního jména, role, a přiřazení do lodi
- Pokud je uživatel již přiřazený organizátorem do konkrétní lodi a na konkrétní pozici, bude mu zobrazeno více informací o jeho konkrétní lodi, jako detailní složení posádky
- Pokud uživatel nebude přiřazený organizátorem, bude zde poznámka, že nebyl přiřazen do konkrétní lodi, a bude mu umožněno zvolit preferovanou loď. Tuto preferenci pak uvidí organizátor v přehledu přiřazení

## 5. Formulář plavby

Bude se používat pro vytváření, editaci plaveb a templatů plaveb. Obsahuje:
- Základní informace o plavbě
- Definice lodí (jméno, technické parametry, počet míst, obrázek, role posádky na palubě)
- Hlavní timeline/checklist (s možností přidat eventy typu Custom, Crewlist, Platba)
- Lokality (start, cíl, seznam míst s fotkami)
- Nastavení crewlistu (jaké údaje jsou potřeba, jaké údaje navíc pro roli kapitána)
- Nastavení oprávnění (jestli jednotlivé role uvidí informace o ostatních lodích)
- Informace o platbách a zálohách
- Informace o přepravě
- A další informace o plavbě

## 6. Zvaní účastníků

- Zvát účastníky sdílením odkazu (s ID) a PINu
- Nebo pomocí emailu je zvát přímo

## 7. Export

### 7.1 Export crewlistu

- Exportuje se každá loď zvlášť (3 lodě = 3 PDF)
- Pouze organizátor může exportovat
- Formát: PDF

### 7.2 Export lodního deníku

- Exportuje se každá loď zvlášť
- Kapitán může exportovat lodní deník své lodě (PDF) - v menu plavby
- Organizátor může exportovat lodní deník všech lodí (každá loď zvlášť jako PDF) - v menu plavby
- Formát: PDF

### 7.3 Stahování dokumentů

- Dokumenty se stahují samostatně z aplikace (ne jako součást exportu)
- Pouze organizátor může stahovat dokumenty

## 8. Principy designu

- Stránka plavby má být přehledná, ne zahlcená informacemi
- Různé funkce v menu, ne vše na hlavní stránce
- Plná podpora pro mobilní responzivní zobrazení
- Většina uživatelů bude na mobilním zařízení
- Kapitáni na mobilech budou i vyplňovat checklisty při předání lodí

## 9. Budoucí funkce (ne v první verzi)

- Více organizátorů na jedné plavbě
- Notifikace a komunikace mezi účastníky
- Historie změn
- Systém storna a náhradníků
- Integrace s předpovědí počasí
- Detailní plánování trasy s waypointy
- Hodnocení a feedback po plavbě
- Detailní finanční tracking
- Offline režim

## 10. Definice pojmů

**Crewlist:** Údaje účastníků nutné z legálních důvodů. Vždy existuje 1 crewlist pro 1 loď.

**Účastník:** Kdokoliv, kdo je součástí plavby ale není organizátor. Sám organizátor může ale být účastníkem.

**Hlavní checklist:** Checklist definovaný ve formuláři plavby organizátorem, zobrazuje se všem účastníkům na stránce plavby. Všem se zobrazuje jejich instance a jen organizátor vidí stavy checklistů jednotlivých účastníků.

**Systém checklistů:** Univerzální systém checklistů definovaných organizátorem v nastavení. Lze použít pro role uživatelů nebo pro lodě.

**Lodní deník:** Deník, který každý kapitán každý den plavby vyplní. Obsahuje informace včetně sledování vody, paliva apod.

**Templates plaveb:** Předpřipravené šablony plaveb, které organizátor může použít při vytváření nové plavby.

