# Procurement API Testing

API-testing mot leverandørens konkurransegjennomføringsverktøy.

## Sikkerhet

**API-nøkkelen (`VENDOR_API_KEY`) er ALDRI tilgjengelig i dette prosjektet.**

- Nøkkelen ligger i macOS Keychain
- Kode leser `os.environ["VENDOR_API_KEY"]` — verdien injiseres ved kjøring
- Hooks blokkerer Bash-kommandoer som kan eksponere hemmeligheter
- `.env`-filer skal ALDRI opprettes i dette prosjektet

### Slik kjører du kode som trenger API-nøkkelen

```bash
# Wrapper-scriptet injiserer nøkkelen fra Keychain
~/bin/procurement-api python script.py
~/bin/procurement-api python -m pytest
```

### Slik legger du til nøkkelen i Keychain (én gang)

```bash
security add-generic-password -s 'procurement-api' -a "$USER" -w
# Limer inn nøkkelen når du blir bedt om passord
```

## Kommandoer

```bash
python -m pytest           # Kjør tester (via wrapper)
ruff check src/            # Linting
```
