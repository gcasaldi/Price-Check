# Price-Check

Estensione Chrome (Manifest V3) per aiutarti a risparmiare quando navighi su:

- Amazon
- Booking
- e-commerce generici

Funzioni MVP:

- confronto prezzo attuale vs storico locale
- messaggio rapido: **"Stai pagando troppo?"**
- storico prezzi in mini-grafico
- wishlist intelligente con prezzo target
- alert automatici periodici sugli elementi in wishlist

## Installazione (sviluppo)

1. Apri Chrome e vai su `chrome://extensions`.
2. Attiva **Modalità sviluppatore**.
3. Clicca **Carica estensione non pacchettizzata**.
4. Seleziona la cartella di questo progetto (`Price-Check`).

## Come usarla

1. Vai su una pagina prodotto/hotel (Amazon, Booking o e-commerce).
2. Apri l'estensione dal toolbar.
3. Guarda il verdict prezzo e lo storico.
4. Aggiungi il prodotto alla wishlist e (opzionale) imposta un target.
5. L'estensione controlla periodicamente gli item in wishlist e crea alert quando conviene.

## File principali

- `manifest.json`: configurazione estensione
- `content.js`: rilevazione prezzo dalla pagina
- `background.js`: storage storico, analisi, wishlist, alert
- `popup.html` + `popup.js` + `popup.css`: interfaccia utente