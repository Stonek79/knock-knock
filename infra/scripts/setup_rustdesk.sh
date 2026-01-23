#!/bin/bash
# RustDesk Installation Script for Manjaro (Arch-based)

echo "Обнаружена система Manjaro. Используем pamac/pacman для установки..."

# 1. Попытка установки через AUR (рекомендуемый способ для Manjaro)
if command -v pamac &> /dev/null; then
    pamac build rustdesk-bin --no-confirm
else
    # Если pamac нет, пробуем через pacman (требуется предварительная настройка AUR хелперов вручную или использование бинарника)
    echo "Pamac не найден. Пытаемся установить зависимости и бинарный пакет..."
    sudo pacman -Sy --noconfirm libx11 libxfixes libxdamage libxcomposite libxrender libxext libxrandr libxtst libxi libvpx opus
    wget https://github.com/rustdesk/rustdesk/releases/download/1.3.1/rustdesk-1.3.1-x86_64.pkg.tar.zst
    sudo pacman -U ./rustdesk-1.3.1-x86_64.pkg.tar.zst --noconfirm
fi

# 2. Настройка пароля для unattended access
echo "RustDesk установлен. Пожалуйста, выполните: sudo rustdesk --password ВАШ_ПАРОЛЬ"
