#!/usr/bin/env python3
"""
Context Guardian - Hook monitorujący wykorzystanie kontekstu w Claude Code.

Uruchamia się po każdym TodoWrite i ostrzega gdy przekroczymy próg kontekstu.
Celem jest zachowanie miejsca na code review i finalizację pracy.
"""

import sys
import json

# Konfiguracja
CONTEXT_LIMIT = 200_000  # Całkowity limit tokenów
THRESHOLD_PERCENT = 75   # Próg ostrzeżenia (%)
THRESHOLD_TOKENS = CONTEXT_LIMIT * THRESHOLD_PERCENT // 100  # 150,000 tokenów


def read_hook_input():
    """Odczytuje JSON ze stdin."""
    try:
        return json.load(sys.stdin)
    except (json.JSONDecodeError, Exception):
        return None


def get_last_usage(transcript_path):
    """
    Parsuje plik JSONL i zwraca ostatni wpis z message.usage.

    Zwraca dict z polami:
    - input_tokens
    - cache_creation_input_tokens
    - cache_read_input_tokens
    """
    last_usage = None

    try:
        with open(transcript_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                    # Szukamy wpisu z message.usage
                    if 'message' in entry and 'usage' in entry['message']:
                        last_usage = entry['message']['usage']
                except json.JSONDecodeError:
                    continue
    except (FileNotFoundError, IOError, Exception):
        return None

    return last_usage


def calculate_context_tokens(usage):
    """
    Oblicza całkowitą liczbę tokenów kontekstu.

    Algorytm: input_tokens + cache_creation_input_tokens + cache_read_input_tokens
    """
    if not usage:
        return 0

    input_tokens = usage.get('input_tokens', 0)
    cache_creation = usage.get('cache_creation_input_tokens', 0)
    cache_read = usage.get('cache_read_input_tokens', 0)

    return input_tokens + cache_creation + cache_read


def format_warning(tokens, percent):
    """Formatuje komunikat ostrzeżenia z instrukcją dla Claude."""
    return f"""
🚨 KONTEKST: {percent}% ({tokens:,}/{CONTEXT_LIMIT:,} tokenów)

Przekroczono próg {THRESHOLD_PERCENT}%. MUSISZ użyć narzędzia AskUserQuestion z pytaniem:
"Kontekst przekroczył {percent}%. Co chcesz zrobić?"

Opcje do pokazania użytkownikowi:
1. "Dokończ zadanie i commituj" - Dokończę bieżące zadanie, wykonam commit i zakończę sesję
2. "Zapisz kontekst (/dev-docs-update)" - Uruchomię /dev-docs-update aby zapisać stan pracy
3. "Kontynuuj z subagentami" - Od teraz WSZYSTKIE złożone operacje (wyszukiwanie, analiza kodu, implementacja) będę delegować do subagentów przez Task tool, aby nie zużywać kontekstu głównej sesji
""".strip()


def main():
    # 1. Odczyt danych wejściowych
    hook_data = read_hook_input()
    if not hook_data:
        # Brak danych - nie blokuj
        sys.exit(0)

    # 2. Pobierz ścieżkę do transkryptu
    transcript_path = hook_data.get('transcript_path')
    if not transcript_path:
        # Brak ścieżki - nie blokuj
        sys.exit(0)

    # 3. Parsuj JSONL i znajdź ostatnie usage
    usage = get_last_usage(transcript_path)
    if not usage:
        # Brak danych o usage - nie blokuj
        sys.exit(0)

    # 4. Oblicz tokeny kontekstu
    context_tokens = calculate_context_tokens(usage)
    percent = (context_tokens * 100) // CONTEXT_LIMIT

    # 5. Sprawdź próg i zdecyduj
    if context_tokens >= THRESHOLD_TOKENS:
        # Przekroczono próg - wyświetl ostrzeżenie i zablokuj
        warning = format_warning(context_tokens, percent)
        print(warning, file=sys.stderr)
        sys.exit(2)
    else:
        # Wszystko OK
        sys.exit(0)


if __name__ == "__main__":
    main()
