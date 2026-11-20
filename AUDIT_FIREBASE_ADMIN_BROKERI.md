# Audit separat — TMA CheckHub / AutoCheck (20.11.2026)

## Domeniu verificat
Arhiva site-ului `tma-checkhub-main (49)(2).zip`, fără acces la proiectul Firebase activ, la regulile publicate, la consola Google Play sau la credențiale. Acesta este un audit STATIC, nu un test de penetrare și nu certifică securitatea producției.

## Observații
- Panoul `autocheck/tmadmin/` conține cod client pentru autentificare și administrare. Prezența verificărilor în JavaScript nu garantează autorizarea server-side.
- `partners/brokers.json` este un catalog public: nu includeți acolo date confidențiale, chei sau informații personale inutile.
- `partners/GHID_ADMINISTRARE_BROKERI.md` și `broker-template.json` necesită validarea procesului de publicare; modificați doar datele publice aprobate de broker.
- Controlul accesului la date, recenzii, răspunsuri și moderare trebuie impus în Firestore Security Rules / Cloud Functions, nu doar în interfață.
- Site-ul este static pe GitHub Pages; un panou admin găzduit acolo nu poate păstra secrete de server în codul browserului.

## Verificări necesare înainte de lansare
1. Confirmați regulile Firestore DEPLOYATE: implicit deny, roluri admin/moderator atribuite exclusiv din backend, nu din documente editabile de utilizator.
2. Verificați în Cloud Functions fiecare acțiune privilegiată: token verificat, rol, validarea parametrilor, rate limiting, jurnalizare, gestionarea erorilor.
3. Testați cu cont anonim, utilizator obișnuit, moderator și administrator: citire, editare, ștergere, recenzii, răspunsuri și rapoarte.
4. Confirmați că brokerii inactivi nu apar în aplicație și că exclusivitatea are condiții comerciale clare.
5. Verificați dacă politicile de confidențialitate acoperă datele brokerilor și recenziile utilizatorilor.
6. Verificați separat aplicația Android și backendul înainte de a considera auditul complet.

## Google Play — verificare publică
La 20.11.2026, accesarea automată a `https://play.google.com/store/apps/details?id=com.autocheck.mihai` a returnat HTTP 404 din instrumentul de verificare. Acest rezultat NU dovedește singur că aplicația nu este publică: Google Play poate răspunde diferit în funcție de regiune, cont sau protecții anti-bot. Nu se poate confirma publicarea doar din arhivă. Verificați dintr-un browser privat, cu un cont care nu este tester, și în Play Console > Producție > Țări/regiuni.

## Limitări
Nicio regulă Firebase, funcție Cloud sau setare Google Play nu a fost modificată în acest patch.
