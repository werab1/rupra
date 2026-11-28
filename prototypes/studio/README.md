# Rupra Studio – prototyp rozhraní

Jednosouborová ukázka pro Artifact (bez `<html>`/`<head>`). Tři pohledy:

- **Zapisovatel**: příprava týmů a soupisek, potom symetrická tlačítka (body, karty, střídání, ostatní). Zápisy jdou ke schválení, jen start/stop času jde rovnou.
- **Režie**: průhledný výstup na celou obrazovku a pod ním plovoucí pruh se stejnými tlačítky. Tlačítko se rozsvítí, když zapisovatel něco zadá. Klik pošle akci na výstup, pravé tlačítko (dlouhý stisk) změní hráče. Režie umí zapisovat i sama.
- **Vedle sebe**: oba pohledy najednou (od šířky 1100 px).

Stav se sdílí přes capability `db` (kolekce `entries`, dokumenty `match/state` a `match/out`), bez ní běží jen lokálně. Čas se počítá z hodin zapisovatelova zařízení. Adresa pro vMix je zástupná, cílový program zatím není vybraný.
