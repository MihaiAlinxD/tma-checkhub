# Administrarea brokerilor AutoCheck – TMA CheckHub

Catalogul public este `partners/brokers.json`. Aplicația îl poate descărca online, fără publicarea unui nou AAB, atât timp cât păstrăm schema acceptată de versiunea instalată.

## Reguli
- Păstrați `schema_version: 1` și cheia `brokers` (listă).
- GCC Asigurări rămâne `tier: "exclusive"`; nu îi modificați datele fără acord.
- Categorii: `exclusive` (Exclusiv), `promoted` (Promovat), `standard` (Standard).
- `active: true` afișează brokerul; `active: false` îl ascunde după reîmprospătarea catalogului.
- `promoted` este un câmp existent, distinct de `tier`; pentru a evita ambiguitatea, folosiți `tier` pentru nivel și lăsați `promoted: false` dacă nu există o regulă explicită în aplicație.
- `id` trebuie să fie unic și stabil, de forma `nume-broker`.
- `photo` trebuie să fie un URL HTTPS public accesibil (de exemplu în `partners/images/`).
- `whatsapp` trebuie să conțină cifre, cu prefix internațional, fără `+` și spații.
- Folosiți doar servicii recunoscute deja de aplicație; pentru un serviciu nou trebuie verificat codul aplicației, ca să aibă traducere și pictogramă.
- Nu adăugați brokeri fictivi în catalogul public.

## Adăugare broker
1. Copiați obiectul din `broker-template.json` în lista `brokers` din `brokers.json` și completați toate valorile.
2. Încărcați fotografia optimizată în `partners/images/` și completați URL-ul ei public.
3. Verificați JSON-ul (fără virgule finale), apoi încărcați fișierele în GitHub.
4. După publicarea GitHub Pages, deschideți direct URL-ul `.../partners/brokers.json` și verificați datele.
5. Testați în AutoCheck afișarea, categoria, pictogramele și WhatsApp; aplicația poate afișa temporar date din cache.

## Eliminare temporară
Schimbați doar `active` în `false` și republicați JSON-ul. Nu ștergeți imediat datele unui broker dacă există posibilitatea reactivării.

## Atenție
Modificările JSON pot actualiza datele și categoriile suportate de aplicația deja publicată, dar **nu pot adăuga funcționalități noi în codul instalat**. Nu modificați denumirile câmpurilor sau valorile `tier` fără testarea aplicației.
