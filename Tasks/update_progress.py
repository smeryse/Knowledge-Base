#!/usr/bin/env python3
"""
Скрипт для обновления статус-бара прогресса задач в ежедневных заметках Obsidian.
Использование: python update_progress.py <файл_заметки>
"""

import re
import sys
from pathlib import Path


def parse_tasks(content: str) -> tuple[int, int]:
    """
    Парсит задачи из контента и возвращает:
    - сумму выполненных баллов
    - общую сумму баллов
    """
    completed_points = 0
    total_points = 0
    
    # Находим все задачи с баллами в формате (- [x] или - [ ]) и (+N)
    pattern = r'-\s?\[([xX ])\].*?\(\+(\d+)\)'
    
    for match in re.finditer(pattern, content):
        is_completed = match.group(1).lower() == 'x'
        points = int(match.group(2))
        
        total_points += points
        if is_completed:
            completed_points += points
    
    return completed_points, total_points


def create_progress_bar(completed: int, total: int, width: int = 50) -> str:
    """Создаёт визуальный прогресс-бар."""
    if total == 0:
        filled = 0
        percent = 0
    else:
        percent = (completed / total) * 100
        filled = int((completed / total) * width)
    
    bar = '█' * filled + '░' * (width - filled)
    return f'**Прогресс:** ` {bar} ` **{completed}/{total}** ({percent:.0f}%)'


def update_note(filepath: str) -> None:
    """Обновляет статус-бар в заметке."""
    path = Path(filepath)
    
    if not path.exists():
        print(f"❌ Файл не найден: {filepath}")
        sys.exit(1)
    
    content = path.read_text(encoding='utf-8')
    
    # Парсим задачи
    completed, total = parse_tasks(content)
    
    if total == 0:
        print("⚠️  Не найдено задач с баллами (+N)")
        return
    
    # Создаём прогресс-бар
    progress_bar = create_progress_bar(completed, total)
    
    # Удаляем старый прогресс-бар если есть
    content = re.sub(r'\n\*\*Прогресс:\*\*.*?\n', '\n', content)
    
    # Находим место для вставки (перед ## Заметки)
    lines = content.split('\n')
    new_lines = []
    progress_inserted = False
    
    for line in lines:
        # Вставляем перед секцией "## Заметки"
        if not progress_inserted and line.strip() == '## Заметки':
            new_lines.append('')
            new_lines.append(progress_bar)
            new_lines.append('')
            progress_inserted = True
        
        new_lines.append(line)
    
    # Записываем обновлённый контент
    path.write_text('\n'.join(new_lines), encoding='utf-8')
    
    print(f"✅ Прогресс обновлён: {completed}/{total} ({(completed/total)*100:.0f}%)")
    print(f"📊 {progress_bar}")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Использование: python update_progress.py <файл_заметки>")
        print("Пример: python update_progress.py Daily/2026-04-01.md")
        sys.exit(1)
    
    update_note(sys.argv[1])
