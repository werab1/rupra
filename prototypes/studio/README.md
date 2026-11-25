# Rupra Studio – ukázka rozhraní (prototyp)

Jednosouborová ukázka bez serveru. Dvě strany v jedné stránce:

- **Zapisovatel**: příprava zápasu (týmy, barvy, soupisky), potom zápis bodů, karet a času.
- **Příjemce**: dostává živě přegenerované samostatné HTML soubory grafik (soupiska, skóre, statistiky, střelci) a zápis událostí.

Soubor `studio.html` je určený pro Artifact (bez `<html>`/`<head>`). Pro lokální otevření v prohlížeči ho stačí vložit do běžné HTML kostry. Data žijí jen v paměti stránky. Cílový vysílací software zatím není vybraný.
