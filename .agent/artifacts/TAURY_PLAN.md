# 📋 Подробный план интеграции Tauri v2 + VLESS/Reality (обход ТСПУ)

> **Статус:** 📝 Утверждённый план реализации
> **Автор:** Анализ на основе истории проекта (`.agent/artifacts/`) и текущего состояния кода
> **Дата:** Август 2026
> **Главные критерии:** Надёжность и Приватность

---

## 📌 Содержание

1. [Executive Summary](#1-executive-summary)
2. [Контекст и предыстория](#2-контекст-и-предыстория)
3. [Обоснование выбора технологий](#3-обоснование-выбора-технологий)
4. [Почему НЕ Shadowsocks-rust](#4-почему-не-shadowsocks-rust)
5. [Почему НЕ маскировка под "Макс"](#5-почему-не-маскировка-под-макс)
6. [Архитектура решения](#6-архитектура-решения)
7. [Используемые инструменты и технологии](#7-используемые-инструменты-и-технологии)
8. [План реализации по этапам](#8-план-реализации-по-этапам)
9. [Безопасность и приватность](#9-безопасность-и-приватность)
10. [Анализ рисков](#10-анализ-рисков)
11. [Двойная стратегия: PWA + Tauri](#11-двойная-стратегия-pwa--tauri)
12. [Выявленные проблемы PWA ↔ Tauri и варианты их решения](#12-выявленные-проблемы-pwa--tauri-и-варианты-их-решения)
13. [Контрольный список готовности](#13-контрольный-список-готовности)

---

## 1. Executive Summary

### Цель
Завернуть существующее PWA-приложение Nemo в нативный десктопный и мобильный клиент на базе **Tauri v2**, со встроенным на уровне Rust-бэкенда прокси-клиентом **VLESS/Reality** (xray-core) для обхода блокировок ТСПУ РКН.

### Ключевые решения

| Параметр | Решение | Обоснование |
|---|---|---|
| Фреймворк | **Tauri v2** | Уже инициализирован в проекте; поддерживает Windows, macOS, Linux, Android, iOS |
| Протокол обхода | **VLESS/Reality** | Единственный протокол, прошедший проверку боем в проекте (через Hiddify) |
| Прокси-движок | **xray-core как sidecar** | Зрелый, активно поддерживается, уже используется в инфраструктуре |
| Маскировка под "Макс" | ❌ **Отклонено** | Рискованно, легко обнаруживается, привлекает внимание |
| WebRTC/LiveKit | **Bypass прокси** | Прямые соединения для минимизации задержек в звонках |
| PWA fallback | **Service Worker + WS-туннель** | Для пользователей без нативного приложения |

### Ожидаемый результат
- Нативные приложения для Windows, macOS, Linux, Android, iOS
- Встроенный прокси-клиент, работающий прозрачно для пользователя
- Автоматический обход блокировок ТСПУ без системного VPN
- Разделение трафика: API через прокси, WebRTC напрямую

---

## 2. Контекст и предыстория

### Текущее состояние Tauri-кода

Проект `knock-knock` (Nemo) уже содержит базовый каркас Tauri v2 в `app/src-tauri/`:

```
app/src-tauri/
├── Cargo.toml          # Tauri 2.11.3 + 5 плагинов
├── tauri.conf.json     # productName "Nemo", CSP: null
├── build.rs            # Стандартный tauri_build
├── capabilities/
│   └── default.json    # Разрешения: core, fs, dialog, http, notification, os
├── icons/              # Все платформы (iOS, Android, desktop)
└── src/
    ├── main.rs         # Точка входа → app_lib::run()
    └── lib.rs          # Базовый Builder + tray icon + 5 плагинов
```

**Степень готовности:** ~10%. Каркас есть, но:
- 0 Tauri-команд (`#[tauri::command]`)
- 0 импортов Tauri API во фронтенде
- 0 скриптов сборки (`tauri dev`/`tauri build`)
- 0 прокси-кода
- CSP отключён

### История обхода блокировок в проекте

Из архивов `.agent/artifacts/.archive/` восстановлена следующая хронология:

| # | Технология | Период | Результат | Причина отказа |
|---|---|---|---|---|
| 1 | **WireGuard VPN** | Ранний этап | ❌ Заблокирован | TSPU определяет отпечаток WireGuard, режет UDP |
| 2 | **Cloudflare Tunnel** (`cloudflared`) | Июль 2026 | ❌ Заблокирован | TSPU рвёт TLS-хэндшейки Cloudflare (`EOF`), даже через VPN |
| 3 | **Чистый FRP** (без VPN) | Июль 2026 | ❌ Обрывы 40 сек | DPI определяет долгоживущий TCP нетипичного протокола |
| 4 | **FRP + Hiddify (VLESS/Reality)** | Июль 2026 | ✅ **Работает** | Трафик FRP завёрнут в VLESS/Reality, ТСПУ не отличает от легитимного |

**Ключевой урок:** Только VLESS/Reality прошёл проверку боем. Все остальные протоколы были заблокированы.

### Текущая рабочая архитектура (серверная)

```
[Пользователь из РФ]
      │
      ▼ (HTTPS → Cloudflare Proxy → DNS Only → Финский сервер)
[Финский сервер (iptables DNAT/MASQUERADE)]
      │
      ▼ (Перекидывает пакеты на Ninja VPS)
[Ninja VPS (Nginx + FRPS + Push-Gateway + LiveKit)]
      │
      ▲ (Зашифрованный FRP-туннель через Hiddify VPN)
      │
[Домашний сервер (PocketBase + FRPC + MinIO)]
```

**Проблема текущей архитектуры:** Обход работает на уровне **сервера**, но пользователь должен включать системный VPN (Hiddify) вручную. Нативное Tauri-приложение решит эту проблему — прокси будет встроен в само приложение.

---

## 3. Обоснование выбора технологий

### 3.1. Почему Tauri v2, а не Electron

| Критерий | Tauri v2 | Electron |
|---|---|---|
| Размер бинарника | ~3-10 МБ | ~100-200 МБ |
| Потребление RAM | ~50-100 МБ | ~200-500 МБ |
| Backend язык | **Rust** (безопасный, быстрый) | JavaScript/Node.js |
| Мобильные платформы | ✅ Android, iOS | ❌ Только десктоп |
| Доступ к нативным API | ✅ Через Rust-плагины | ⚠️ Через Node.js |
| Интеграция прокси | ✅ Нативный Rust-поток | ⚠️ Через child_process |
| Безопасность | ✅ Rust memory safety | ⚠️ Node.js уязвимости |

**Решение:** Tauri v2 — идеальный выбор. Rust-бэкенд позволяет интегрировать прокси-клиент на уровне ядра, без накладных расходов JavaScript.

### 3.2. Почему VLESS/Reality, а не Shadowsocks

| Критерий | Shadowsocks | VLESS/Reality |
|---|---|---|
| Механизм маскировки | Нет (просто шифрование) | "Кража" TLS-рукопожатия реального сайта |
| Детектируемость ТСПУ | ⚠️ Высокая (ML-анализ энтропии) | ✅ Низкая (неотличим от HTTPS) |
| Проверка активным зондом | ❌ Проваливается | ✅ Проходит (реальный сайт отвечает) |
| SNI совпадает с IP? | N/A (нет SNI) | ✅ Да (реальный сайт) |
| TLS-сертификат валидный? | N/A | ✅ Да (украдён у реального сайта) |
| Опыт в проекте | Нет | ✅ Есть (Hiddify/happ) |
| Активное развитие | ⚠️ Замедлилось | ✅ Активно (xray-core) |

**Решение:** VLESS/Reality — единственный протокол с доказанной эффективностью против ТСПУ в реальных условиях этого проекта.

### 3.3. Почему xray-core как sidecar, а не Rust-крейт

| Вариант | Описание | Плюсы | Минусы |
|---|---|---|---|
| **A: xray-core sidecar** (рекомендуется) | Бинарник xray-core запускается как дочерний процесс Tauri | ✅ Зрелый, протестирован, уже используется в проекте, активная поддержка | ⚠️ Внешний бинарник (Go), ~20 МБ |
| B: shadowsocks-rust крейт | Rust-брейт, встроенный в Cargo.toml | ✅ Нативный Rust, малый размер | ❌ Shadowsocks детектируется ТСПУ |
| C: Rust VLESS клиент | Ручная реализация VLESS на Rust | ✅ Нативный Rust | ❌ Незрелый, сложный, высокий риск багов |

**Решение:** Вариант A (xray-core sidecar). Tauri v2 имеет нативную поддержку sidecar-бинарников через `tauri.conf.json` → `bundle.externalBin`. xray-core — это тот же движок, что работает в Hiddify/happ на домашнем сервере.

---

## 4. Почему НЕ Shadowsocks-rust

### Технические причины

1. **ТСПУ умеет распознавать Shadowsocks:**
   - Используется ML-анализ трафика (энтропия Шеннона, распределение размеров пакетов, тайминги)
   - Shadowsocks шифрует, но **не маскирует** — сам факт зашифрованного нетипичного трафика к зарубежному IP уже красный флаг
   - Статья: "Shadowsocks traffic detection using machine learning" (множество публикаций 2023-2025)

2. **Отсутствие маскировки под легитимный трафик:**
   - Shadowsocks не имитирует TLS-рукопожатие
   - ТСПУ видит "голый" зашифрованный поток — это сразу подозрительно
   - VLESS/Reality, напротив, выглядит как обычный HTTPS к реальному сайту

3. **Проверка активным зондом (active probing):**
   - ТСПУ может подключиться к тому же IP:порту и проверить, что там отвечает
   - Shadowsocks-сервер ответит случайным мусором → провал
   - Reality-сервер ответит как реальный сайт (например, microsoft.com) → проходит

4. **История проекта:**
   - В проекте уже попробовали WireGuard, Cloudflare Tunnel, чистый FRP — всё заблокировано
   - Только VLESS/Reality (через Hiddify) работает
   - Нет смысла откатываться к менее эффективному протоколу

### Когда Shadowsocks-rust был бы уместен
- В странах с менее агрессивным DPI (без ТСПУ)
- Для обхода простых блокировок по доменам/IP
- НЕ в РФ с ТСПУ

---

## 5. Почему НЕ маскировка под "Макс"

### Идея
Сделать так, чтобы трафик приложения выглядел как подключение к российскому государственному мессенджеру "Макс" (max.ru).

### Почему это провалится

#### Проблема 1: Несовпадение SNI и IP-адреса
ТСПУ сверяет SNI (Server Name Indication) в TLS-хэндшейке с реальным IP-адресом назначения:
- Если SNI = `max.ru`, но IP не принадлежит серверам "Макса" → **мгновенная блокировка**
- ТСПУ имеет whitelist IP-адресов российских сервисов
- Невозможно подключиться к своему VPS с SNI `max.ru` — это очевидный обман

#### Проблема 2: Невозможность подделки TLS-сертификата
- Сертификат `max.ru` выдан конкретному серверу и защищён приватным ключом
- Подделать TLS-сертификат невозможно без компрометации Удостоверяющего центра или приватного ключа
- ТСПУ может проверить сертификат → сразу спалят

#### Проблема 3: Поведенческий анализ
- "Макс" использует конкретные API-эндпоинты, порты, паттерны пакетов
- Трафик к PocketBase будет выглядеть иначе, даже если SNI совпадёт
- ТСПУ использует DPI для анализа протоколов прикладного уровня

#### Проблема 4: Проверка активным зондом
- ТСПУ подключается к тому же IP:порту и проверяет ответ
- Если сервер не отвечает как "Макс" → блокировка
- Reality решает эту проблему: сервер отвечает как реальный сайт (microsoft.com)

#### Проблема 5: Юридический риск
- Маскировка под государственный мессенджер — это **имперсонация**
- Может привлечь повышенное внимание ФСБ/МВД
- В случае обнаружения — реакция будет жёстче, чем на обычный VPN
- Возможна уголовная ответственность (ст. 274.1 УК РФ — воздействие на критическую информационную инфраструктуру)

### Почему Reality лучше
Reality "крадёт" TLS-рукопожатие **реального популярного международного сайта** (например, `microsoft.com`, `apple.com`, `gateway.icloud.com`). Когда ТСПУ проверяет:
- SNI совпадает с IP? ✅ Да (реальный сайт)
- TLS-сертификат валидный? ✅ Да (украдён у реального сайта)
- Активный зонд получает ответ? ✅ Да (реальный сайт отвечает)
- Трафик выглядит как HTTPS? ✅ Да

**Вердикт: Маскировка под "Макс" — технически невозможна, юридически опасна, и не нужна. Reality уже решает эту задачу лучше.**

---

## 6. Архитектура решения

### 6.1. Общая схема

```
┌─────────────────────────────────────────────────────────┐
│                    Tauri Application                     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              React UI (WebView)                  │   │
│  │                                                  │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────┐ │   │
│  │  │ PocketBase   │  │ LiveKit/WebRTC│  │ Media  │ │   │
│  │  │ API Client   │  │ (Calls)      │  │ (S3)   │ │   │
│  │  └──────┬───────┘  └──────┬───────┘  └───┬────┘ │   │
│  │         │                 │              │       │   │
│  │         ▼                 │              ▼       │   │
│  │  127.0.0.1:local_port     │     127.0.0.1:port   │   │
│  └─────────┼─────────────────┼──────────────┼───────┘   │
│            │                 │              │            │
│  ┌─────────▼─────────────────▼──────────────▼───────┐   │
│  │           Tauri Rust Backend (lib.rs)             │   │
│  │                                                    │   │
│  │  ┌──────────────────┐  ┌──────────────────────┐  │   │
│  │  │  Proxy Manager    │  │  Routing Rules       │  │   │
│  │  │  (proxy.rs)      │  │  (routing.rs)        │  │   │
│  │  │                  │  │                      │  │   │
│  │  │  - start/stop    │  │  - API → proxy       │  │   │
│  │  │  - port alloc    │  │  - WebRTC → direct   │  │   │
│  │  │  - health check  │  │  - Media → proxy     │  │   │
│  │  └────────┬─────────┘  └──────────────────────┘  │   │
│  │           │                                        │   │
│  │  ┌────────▼─────────────────────────────────────┐ │   │
│  │  │         xray-core (sidecar процесс)          │ │   │
│  │  │                                              │ │   │
│  │  │  Protocol: VLESS + Reality                   │ │   │
│  │  │  SNI: microsoft.com (или другой реальный)    │ │   │
│  │  │  Local: SOCKS5 127.0.0.1:random_port         │ │   │
│  │  │  Remote: VPS_NINJA_IP:443                    │ │   │
│  │  └──────────────────────────────────────────────┘ │   │
│  └────────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼ (VLESS/Reality туннель)
                  [Зашифрованный трафик]
                         │
                         ▼
              [VPS Ninja (за рубежом)]
                         │
                    ┌────┴────┐
                    ▼         ▼
            [PocketBase]  [LiveKit]
             (через FRP)   (напрямую)
```

### 6.2. Поток данных

| Тип трафика | Маршрут | Обоснование |
|---|---|---|
| API PocketBase (текст, настройки) | UI → SOCKS5 → xray → VLESS/Reality → VPS → FRP → Home PB | Должен идти через прокси (блокировки) |
| Медиа (S3/MinIO) | UI → SOCKS5 → xray → VLESS/Reality → VPS → FRP → Home MinIO | Должен идти через прокси |
| WebRTC/LiveKit (звонки) | UI → **напрямую** → VPS LiveKit | Минимум задержки, UDP не маскируется |
| Push-уведомления | xray → VPS Push-Gateway → APNs/FCM | Через прокси (зарубежный IP для push) |

### 6.3. Жизненный цикл прокси

```
[Запуск приложения]
       │
       ▼
[Tauri setup()]
       │
       ├──> 1. Генерация случайного локального порта (1024-65535)
       ├──> 2. Загрузка конфигурации VLESS/Reality (с сервера или из bundled-файла)
       ├──> 3. Запуск xray-core как sidecar-процесса
       ├──> 4. Ожидание готовности SOCKS5-прокси (health check)
       ├──> 5. Настройка WebView proxy на 127.0.0.1:local_port
       ├──> 6. Настройка bypass-правил для IP LiveKit
       └──> 7. Уведомление фронтенда: "прокси готов"
              │
              ▼
[Приложение работает]
       │
       ├──> Мониторинг состояния xray-core (перезапуск при падении)
       ├──> Переключение API-адреса PocketBase на 127.0.0.1:local_port
       └──> WebRTC-трафик идёт напрямую (bypass)
              │
              ▼
[Закрытие приложения]
       │
       └──> Остановка xray-core, освобождение порта
```

---

## 7. Используемые инструменты и технологии

### 7.1. Rust-сторона (Tauri backend)

| Инструмент | Версия | Назначение |
|---|---|---|
| **Tauri** | 2.11.3+ | Фреймворк нативных приложений |
| **xray-core** | 25.x+ (latest) | Прокси-движок VLESS/Reality (sidecar) |
| **tauri-plugin-shell** | 2.x | Управление sidecar-процессами |
| **tauri-plugin-http** | 2.5.9 | HTTP-запросы (health check) |
| **tauri-plugin-os** | 2.3.2 | Определение ОС (разные бинарники xray) |
| **tauri-plugin-fs** | 2.5.1 | Чтение/запись конфигов прокси |
| **tauri-plugin-dialog** | 2.7.2 | Диалоги (настройки прокси) |
| **tauri-plugin-notification** | 2.x | Уведомления о статусе прокси |
| **serde** | 1.0 | Сериализация конфигов |
| **log** | 0.4 | Логирование |
| **tauri-plugin-log** | 2.x | Логирование в файл |

### 7.2. JavaScript/TypeScript-сторона (Frontend)

| Инструмент | Версия | Назначение |
|---|---|---|
| **@tauri-apps/api** | 2.11.1 | Базовый API Tauri (invoke, events) |
| **@tauri-apps/plugin-shell** | 2.x | Управление sidecar (из JS) |
| **@tauri-apps/plugin-os** | 2.3.2 | Определение платформы |
| **@tauri-apps/plugin-http** | 2.5.9 | HTTP через Tauri (вне браузера) |
| **@tauri-apps/plugin-fs** | 2.5.1 | Файловая система (чтение конфигов) |
| **@tauri-apps/plugin-notification** | 2.3.3 | Нативные уведомления |
| **@tauri-apps/cli** | 2.11.4 | CLI для сборки (`tauri dev`, `tauri build`) |

### 7.3. Инфраструктура

| Инструмент | Назначение |
|---|---|
| **xray-core** (Go-бинарник) | Прокси-клиент VLESS/Reality |
| **VPS Ninja** | Точка назначения туннеля (entrypoint) |
| **Hiddify/happ** | Текущий системный VPN (эталон для конфига xray) |
| **FRP** | Проброс портов от VPS к домашнему серверу |
| **Cloudflare** | DNS + проксирование (серые тучки) |
| **Финский сервер** | NAT-транзит (iptables DNAT/MASQUERADE) |

### 7.4. Сборка и CI/CD

| Инструмент | Назначение |
|---|---|
| **@tauri-apps/cli** | Локальная сборка (`tauri build`) |
| **GitHub Actions** | CI/CD для сборки под все платформы |
| **cross** (Rust) | Кросс-компиляция (если нужна) |
| **Makefile** | Команды `make tauri-dev`, `make tauri-build` |

---

## 8. План реализации по этапам

### Этап 1: Rust-ядро прокси (критичный, 1-2 недели)

#### 1.1. Добавление зависимостей в `Cargo.toml`

```toml
[dependencies]
# Существующие
tauri = { version = "2.11.3", features = [] }
tauri-plugin-log = "2"
tauri-plugin-notification = "2"
tauri-plugin-dialog = "2.7.2"
tauri-plugin-fs = "2.5.1"
tauri-plugin-http = "2.5.9"
tauri-plugin-os = "2.3.2"

# Новые
tauri-plugin-shell = "2"    # Управление sidecar-процессом xray-core
rand = "0.8"                # Генерация случайного порта
sysinfo = "0.31"            # Проверка состояния процесса xray
```

#### 1.2. Создание модуля `proxy.rs`

Новый файл: `app/src-tauri/src/proxy.rs`

Ответственности:
- Генерация случайного локального порта (проверка, что порт свободен)
- Формирование конфигурации xray-core (JSON-конфиг VLESS/Reality)
- Запуск xray-core как sidecar-процесса через `tauri-plugin-shell`
- Мониторинг состояния процесса (health check)
- Перезапуск при падении (с экспоненциальной задержкой)
- Остановка при закрытии приложения

Ключевые функции:
```rust
// Tauri-команды для вызова из фронтенда
#[tauri::command]
fn start_proxy(app: AppHandle, config: ProxyConfig) -> Result<ProxyStatus, String>

#[tauri::command]
fn stop_proxy(app: AppHandle) -> Result<(), String>

#[tauri::command]
fn get_proxy_status(app: AppHandle) -> Result<ProxyStatus, String>

#[tauri::command]
fn get_proxy_port(app: AppHandle) -> Result<u16, String>

#[tauri::command]
fn restart_proxy(app: AppHandle) -> Result<ProxyStatus, String>
```

Структуры данных:
```rust
#[derive(Serialize, Deserialize)]
struct ProxyConfig {
    server: String,           // IP VPS
    server_port: u16,         // 443
    uuid: String,              // UUID пользователя
    flow: String,             // "xtls-rprx-vision"
    security: String,          // "reality"
    sni: String,              // "microsoft.com" (реальный сайт)
    fingerprint: String,       // "chrome" (uTLS)
    public_key: String,        // Публичный ключ Reality
    short_id: String,          // Short ID Reality
}

#[derive(Serialize, Deserialize)]
struct ProxyStatus {
    running: bool,
    local_port: u16,
    pid: Option<u32>,
    uptime_seconds: u64,
    bytes_sent: u64,
    bytes_received: u64,
}
```

#### 1.3. Конфигурация xray-core

Генерируемый JSON-конфиг xray-core:
```json
{
  "inbounds": [{
    "port": "<random_local_port>",
    "protocol": "socks",
    "settings": { "udp": true }
  }],
  "outbounds": [{
    "protocol": "vless",
    "settings": {
      "vnext": [{
        "address": "<vps_ip>",
        "port": 443,
        "users": [{
          "id": "<uuid>",
          "flow": "xtls-rprx-vision",
          "encryption": "none"
        }]
      }]
    },
    "streamSettings": {
      "network": "tcp",
      "security": "reality",
      "realitySettings": {
        "serverName": "microsoft.com",
        "fingerprint": "chrome",
        "publicKey": "<public_key>",
        "shortId": "<short_id>"
      }
    }
  }],
  "routing": {
    "rules": [{
      "type": "field",
      "ip": ["<livekit_vps_ip>"],
      "outboundTag": "direct"
    }]
  }
}
```

**Важно:** Routing rules обеспечивают bypass для WebRTC/LiveKit трафика — он идёт напрямую, не через прокси.

#### 1.4. Регистрация sidecar в `tauri.conf.json`

```json
{
  "bundle": {
    "externalBin": [
      "binaries/xray-x86_64-pc-windows-msvc",
      "binaries/xray-x86_64-apple-darwin",
      "binaries/xray-aarch64-apple-darwin",
      "binaries/xray-x86_64-unknown-linux-gnu",
      "binaries/xray-aarch64-linux-android",
      "binaries/xray-aarch64-apple-ios"
    ]
  }
}
```

Tauri автоматически добавит суффикс платформы при сборке.

#### 1.5. Обновление `lib.rs`

Интеграция модуля `proxy` в `run()`:
- Регистрация Tauri-команд через `.invoke_handler()`
- Инициализация прокси в `.setup()`
- Обработка события закрытия (остановка xray)

#### 1.6. Обновление `capabilities/default.json`

Добавление разрешений для `shell` (запуск sidecar):
```json
{
  "permissions": [
    "core:default",
    "fs:default",
    "dialog:default",
    "http:default",
    "notification:default",
    "os:default",
    "shell:allow-execute",
    "shell:allow-spawn",
    "shell:allow-kill"
  ]
}
```

---

### Этап 2: Фронтенд-интеграция (1 неделя)

#### 2.1. Хук `useTauri()`

Новый файл: `app/src/hooks/useTauri.ts`

```typescript
// Определение, запущено ли приложение в Tauri
export function useTauri() {
  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
  // ...
}
```

#### 2.2. Сервис `TauriProxyService`

Новый файл: `app/src/lib/services/tauriProxyService.ts`

```typescript
// Управление прокси через Tauri-команды
export class TauriProxyService {
  async startProxy(): Promise<ProxyStatus>
  async stopProxy(): Promise<void>
  async getStatus(): Promise<ProxyStatus>
  async getPort(): Promise<number>
  async restart(): Promise<ProxyStatus>
}
```

#### 2.3. Динамическое переключение API-адреса

Модификация: `app/src/lib/pocketbase.ts`

```typescript
// В нативной сборке — 127.0.0.1:local_port
// В PWA — api.whoami.ninja
const apiUrl = isTauri 
  ? `http://127.0.0.1:${proxyPort}` 
  : 'https://api.whoami.ninja';
```

#### 2.4. UI-компонент статуса прокси

Новый компонент: `app/src/components/common/ProxyStatusIndicator.tsx`

- Индикатор "Обход активен" / "Обход отключён" / "Ошибка подключения"
- Кнопка перезапуска прокси
- Настройки (выбор сервера, протокола)

---

### Этап 3: Сборка и конфигурация (3-5 дней)

#### 3.1. Скрипты в `package.json`

```json
{
  "scripts": {
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "tauri:build:debug": "tauri build --debug"
  }
}
```

#### 3.2. Настройка CSP в `tauri.conf.json`

```json
{
  "app": {
    "security": {
      "csp": "default-src 'self'; connect-src 'self' http://127.0.0.1:* https://api.whoami.ninja wss://api.whoami.ninja; img-src 'self' data: blob: https://*.whoami.ninja; media-src 'self' blob:; style-src 'self' 'unsafe-inline'"
    }
  }
}
```

#### 3.3. Команды в `Makefile`

```makefile
tauri-dev:
	cd app && npm run tauri:dev

tauri-build:
	cd app && npm run tauri:build

tauri-build:android:
	cd app && npm run tauri:build -- --target aarch64-linux-android

tauri-build:ios:
	cd app && npm run tauri:build -- --target aarch64-apple-ios
```

#### 3.4. Скачивание бинарников xray-core

Скрипт: `app/src-tauri/scripts/download-xray.sh`

- Скачивает xray-core с GitHub Releases для каждой платформы
- Кладёт в `app/src-tauri/binaries/` с правильными суффиксами
- Проверяет SHA256

---

### Этап 4: Безопасность и конфигурация (2-3 дня)

#### 4.1. Безопасное хранение конфигурации прокси

**НЕ хардкодить** UUID, ключи, IP-адреса в бинарнике!

Схема:
1. При первом запуске приложение запрашивает конфиг у сервера (через временный токен)
2. Конфиг сохраняется в зашифрованном виде в хранилище ОС (Keychain на macOS, Credential Manager на Windows, Keystore на Android)
3. При последующих запусках — читается из хранилища

#### 4.2. Ротация ключей

- UUID и Reality public_key периодически меняются
- Сервер раздаёт новые конфиги через API
- Приложение автоматически обновляет конфиг

#### 4.3. Anti-fingerprinting

- Случайный выбор "украденного" сайта из списка (microsoft.com, apple.com, gateway.icloud.com, etc.)
- Рандомизация fingerprint (chrome, firefox, safari)
- Рандомизация shortId

---

### Этап 5: Тестирование (3-5 дней)

#### 5.1. Юнит-тесты Rust
- Тест генерации конфига xray
- Тест выделения/освобождения порта
- Тест health check

#### 5.2. Интеграционные тесты
- Запуск xray-core sidecar
- Проверка SOCKS5-прокси
- Проверка bypass-правил для WebRTC

#### 5.3. E2E тесты
- Запуск приложения в Tauri
- Проверка подключения к PocketBase через прокси
- Проверка звонков напрямую (bypass)

#### 5.4. Тесты обхода ТСПУ
- Запуск из РФ без системного VPN
- Проверка доступности API
- Проверка скорости/задержки
- Проверка звонков

---

## 9. Безопасность и приватность

### 9.1. Угрозы и контрмеры

| Угроза | Контрмера |
|---|---|
| ТСПУ блокирует домен | ✅ Прокси VLESS/Reality (трафик неотличим от HTTPS) |
| ТСПУ блокирует IP VPS | ✅ Финский NAT-транзит (нейтральный IP) |
| Утечка DNS-запросов | ✅ xray-core DNS routing (все DNS через прокси) |
| Утечка WebRTC IP | ✅ WebRTC через Tauri WebView (не браузер), bypass для LiveKit IP |
| Компрометация ключей | ✅ Ротация UUID/ключей, шифрованное хранение |
| Анализ трафика (traffic analysis) | ✅ Reality маскирует под реальный TLS |
| Активный зонд ТСПУ | ✅ Reality-сервер отвечает как реальный сайт |
| Деанонимизация push-уведомлений | ✅ Push-Gateway на зарубежном VPS |

### 9.2. Приватность пользователя

- **Нет логов на стороне клиента:** xray-core работает в memory-only режиме (loglevel: "none")
- **Нет трекинга:** приложение не отправляет телеметрию
- **E2E шифрование:** сообщения уже зашифрованы на уровне приложения (Web Crypto API)
- **Физический контроль данных:** PocketBase на домашнем сервере

### 9.3. Приватность владельца

- **Анонимный домен:** Njalla/Porkbun + крипто-оплата
- **Разделение репозиториев:** Dev (приватный) vs Prod (анонимный, squash-коммиты)
- **Сервер за рубежом:** VPS оплачивается криптовалютой
- **Нет российских юр. лиц:** сервис позиционируется как международный

---

## 10. Анализ рисков

### 10.1. Технические риски

| Риск | Вероятность | Влияние | Митигация |
|---|---|---|---|
| xray-core падает | Средняя | Высокое | Автоматический перезапуск (watchdog) |
| ТСПУ блокирует Reality | Низкая | Критическое | Ротация SNI, запасные протоколы |
| Порт занят другим процессом | Низкая | Низкое | Проверка + генерация нового порта |
| Бинарник xray не запускается на платформе | Средняя | Высокое | Тестирование на всех платформах |
| Утечка DNS | Средняя | Высокое | DNS routing в xray (все DNS через прокси) |
| WebRTC утечка реального IP | Средняя | Высокое | WebView настройки + bypass только для LiveKit IP |

### 10.2. Операционные риски

| Риск | Вероятность | Влияние | Митигация |
|---|---|---|---|
| VPS заблокирован | Средняя | Высокое | Финский транзит + запасные VPS |
| Домен заблокирован | Высокая | Среднее | DNS Only (серые тучки) + прямой IP |
| Push-Gateway недоступен | Низкая | Среднее | Резервный push-сервер |
| Домашний сервер offline | Средняя | Среднее | VPS продолжает работать (текст, звонки) |

### 10.3. Юридические риски

| Риск | Вероятность | Влияние | Митигация |
|---|---|---|---|
| Блокировка приложения в RuStore/App Store | Высокая | Среднее | Распространение через сайт (APK) + AltStore (iOS) |
| Запрет VPN в РФ | Растёт | Высокое | Reality маскируется под HTTPS, не определяется как VPN |
| Запрос данных у хостинга | Низкая | Высокое | Хостинг за рубежом, оплата криптой |

---

## 11. Двойная стратегия: PWA + Tauri

### 11.1. Логика разделения

| Канал | Технология обхода | Целевая аудитория |
|---|---|---|
| **PWA (браузер)** | Service Worker + WebSocket-туннель | Пользователи без установки нативного приложения |
| **Tauri (нативное)** | xray-core sidecar + VLESS/Reality | Пользователи, установившие приложение |

### 11.2. Автоопределение окружения

```typescript
// app/src/lib/env.ts
const isTauri = '__TAURI__' in window;
const isPWA = window.matchMedia('(display-mode: standalone)').matches;
const isBrowser = !isTauri && !isPWA;

// Логика:
// isTauri → использовать xray-core прокси (127.0.0.1:port)
// isPWA → использовать Service Worker туннель
// isBrowser → прямое подключение (пользователь сам включает VPN)
```

### 11.3. PWA fallback (Service Worker туннель)

Согласно разделу 5 `BYPASS_STRATEGY.md`:
1. Service Worker перехватывает все `fetch` запросы к API PocketBase
2. Вместо HTTP-запроса — упаковка в WebSocket-кадр
3. WebSocket маскируется под чат-сокет (не блокируется ТСПУ)
4. Зарубежный прокси-сервер эмулирует HTTP-запрос к PocketBase

**Преимущество Tauri над PWA:** прокси работает на уровне ОС (Rust native thread), а не в песочнице браузера. Нет ограничений Service Worker, нет fingerprinting браузера, полный контроль над сетевым стеком.

---

## 12. Выявленные проблемы PWA ↔ Tauri и варианты их решения

В результате глубокого анализа всего проекта (фронтенд, бэкенд, инфраструктура, CI/CD) выявлены следующие проблемы, которые **необходимо решить** для завершённости Tauri-интеграции. Большинство из них — конфликты между PWA-архитектурой и нативной Tauri-средой.

---

### 12.1. Проблема: Service Worker не работает в Tauri WebView

**Суть проблемы:**
`app/src/sw.ts` (307 строк) — сложный Service Worker, обрабатывающий:
- Precaching статики (Workbox)
- Runtime-кэширование (аватары, шрифты)
- Push-уведомления с E2E-дешифрацией (Blind Push)
- Background Sync (отложенная отправка сообщений из Outbox)
- Обработку кликов по уведомлениям (навигация)

В Tauri WebView Service Worker **может не работать** или работать с ограничениями:
- WebView2 (Windows) / WKWebView (macOS) / Android WebView — разная поддержка SW
- Background Sync API недоступно вне браузера
- Web Push API не работает в Tauri (нет FCM/APNs интеграции на уровне WebView)

**Варианты решения:**

| Вариант | Описание | Плюсы | Минусы |
|---|---|---|---|
| **A: Условное отключение SW в Tauri** (рекомендуется) | При `isTauri` — не регистрировать SW, использовать Tauri-аналоги | ✅ Чисто, не ломает PWA | ⚠️ Нужно реализовать аналоги на Rust |
| B: Оставить SW в Tauri | Надеяться, что WebView поддержит SW | ✅ Меньше кода | ❌ Ненадёжно, разная поддержка на платформах |
| C: Полный отказ от SW | Убрать SW, всё перевести на Tauri | ✅ Единая архитектура | ❌ Ломает PWA-версию |

**Рекомендация:** Вариант A. В `main.tsx` добавить проверку:
```typescript
if (!isTauri && "serviceWorker" in navigator) {
  // Регистрация SW только в браузере/PWA
}
```
В Tauri заменить:
- Push → `tauri-plugin-notification` + push-gateway
- Background Sync → Rust-side scheduler (cron в PocketBase уже есть)
- Precaching → не нужно (статика в бинарнике)
- Outbox → Rust-side очередь или оставить в Dexie.js (IndexedDB работает в WebView)

---

### 12.2. Проблема: VitePWA плагин конфликтует с Tauri-сборкой

**Суть проблемы:**
`vite.config.ts` использует `VitePWA` плагин в режиме `injectManifest`. При `tauri build` плагин пытается инжектить Service Worker в нативную сборку, что:
- Увеличивает размер бандла
- Создает ненужный SW-файл в `dist/`
- Может вызывать ошибки при загрузке в WebView

**Варианты решения:**

| Вариант | Описание | Плюсы | Минусы |
|---|---|---|---|
| **A: Условное отключение VitePWA** (рекомендуется) | Проверять `process.env.TAURI_ENV_PLATFORM` и отключать плагин | ✅ Чисто, не ломает PWA | ⚠️ Нужно тестировать |
| B: Оставить как есть | VitePWA генерирует SW, но он не используется в Tauri | ✅ Ноль изменений | ❌ Лишний код в бандле |
| C: Раздельные vite конфиги | `vite.config.ts` для PWA, `vite.tauri.config.ts` для Tauri | ✅ Полная изоляция | ❌ Дублирование конфига |

**Рекомендация:** Вариант A. В `vite.config.ts`:
```typescript
const isTauri = !!process.env.TAURI_ENV_PLATFORM;
plugins: [
  tanstackRouter({ target: "react", autoCodeSplitting: true }),
  react(),
  ...(!isTauri ? [VitePWA({ ... })] : []),
],
```

---

### 12.3. Проблема: Захардкоженные URL в `env.ts` и `pocketbase.ts`

**Суть проблемы:**
- `app/src/lib/env.ts` — `VITE_PB_URL` по умолчанию `https://api.whoami.ninja`
- `app/src/lib/pocketbase.ts` — `new PocketBase(env.VITE_PB_URL)` создаёт синглтон при импорте

В Tauri-сборке API должен идти через локальный прокси: `http://127.0.0.1:local_port`. Но:
- `env.ts` не знает о Tauri
- `pocketbase.ts` создаёт синглтон до того, как прокси запущен
- LiveKit URL тоже захардкожен (`wss://whoami.ninja/livekit/`)

**Варианты решения:**

| Вариант | Описание | Плюсы | Минусы |
|---|---|---|---|
| **A: Ленивая инициализация PB** (рекомендуется) | Заменить синглтон на фабрику с динамическим URL | ✅ Гибкость | ⚠️ Нужно рефакторить импорты |
| B: Tauri env переменные | Передавать URL через Tauri `beforeBuildCommand` | ✅ Просто | ❌ URL неизвестен до запуска прокси |
| C: Runtime конфигурация | Загружать конфиг из файла при запуске | ✅ Не требует пересборки | ⚠️ Сложнее |

**Рекомендация:** Вариант A. Создать `pbClient` с динамической инициализацией:
```typescript
// pocketbase.ts
let pbInstance: TypedPocketBase | null = null;

export async function getPbClient(): Promise<TypedPocketBase> {
  if (pbInstance) return pbInstance;
  
  const url = isTauri 
    ? `http://127.0.0.1:${await getProxyPort()}`
    : env.VITE_PB_URL;
    
  pbInstance = new PocketBase(url) as TypedPocketBase;
  return pbInstance;
}
```
Для LiveKit: в Tauri — прямой WebSocket к VPS (bypass прокси), в PWA — через `wss://whoami.ninja/livekit/`.

---

### 12.4. Проблема: Web Push API не работает в Tauri

**Суть проблемы:**
Push-уведомления в PWA используют:
- `navigator.serviceWorker.pushManager.subscribe()` — регистрация подписки
- Web Push API (VAPID ключи) — отправка пушей
- Service Worker `push` event — приём и дешифрация

В Tauri WebView:
- `pushManager` недоступен или не работает
- Нет интеграции с APNs/FCM на уровне WebView
- Service Worker push event не срабатывает

**Варианты решения:**

| Вариант | Описание | Плюсы | Минусы |
|---|---|---|---|
| **A: `tauri-plugin-notification`** (рекомендуется) | Нативные уведомления ОС + push-gateway | ✅ Работает на всех платформах | ⚠️ Нужен свой push-gateway |
| B: Опрос сервера (polling) | Периодически запрашивать непрочитанные | ✅ Просто | ❌ Батарея, задержки |
| C: WebSocket long-poll | Держать постоянное WS-соединение | ✅ Real-time | ❌ Батарея, не нативные уведомления |

**Рекомендация:** Вариант A. Схема:
1. Tauri-приложение регистрируется в push-gateway (на VPS)
2. Push-gateway отправляет пуши через APNs/FCM с зарубежного IP
3. `tauri-plugin-notification` принимает и показывает уведомление
4. E2E-дешифрация выполняется в Rust-слое (или в JS через `invoke`)

---

### 12.5. Проблема: Background Sync недоступен в Tauri

**Суть проблемы:**
`sw.ts` реализует Background Sync для Outbox (отложенная отправка сообщений при восстановлении сети):
- Регистрация `sync` event в Service Worker
- При восстановлении сети — вычитывание очереди из Dexie.js
- Отправка накопленных сообщений

В Tauri WebView Background Sync API недоступен.

**Варианты решения:**

| Вариант | Описание | Плюсы | Минусы |
|---|---|---|---|
| **A: Rust-side scheduler** (рекомендуется) | Rust-поток мониторит сеть и вычитывает outbox | ✅ Работает даже в фоне | ⚠️ Нужен Rust-код |
| B: JS-side polling | `useNetworkStatus` хук при `online` триггерит outbox | ✅ Просто | ❌ Только при открытом приложении |
| C: PocketBase cron | Серверный cron проверяет неотправленные | ✅ Не зависит от клиента | ❌ Нет доступа к зашифрованным данным |

**Рекомендация:** Вариант B для MVP (просто и работает), Вариант A для полной нативной поддержки. Outbox в Dexie.js (IndexedDB) **работает в Tauri WebView**, так что хранилище не нужно менять.

---

### 12.6. Проблема: IndexedDB / Dexie.js в Tauri WebView

**Суть проблемы:**
Приложение активно использует IndexedDB через Dexie.js:
- `media-db.ts` — хранение медиа (Dexie.js)
- `outbox-db.ts` — очередь сообщений
- `chat-history-db.ts` — история чатов

Вопрос: работает ли IndexedDB в Tauri WebView?

**Анализ:**
- WebView2 (Windows) — ✅ поддерживает IndexedDB
- WKWebView (macOS) — ✅ поддерживает IndexedDB
- Android WebView — ✅ поддерживает IndexedDB
- iOS WKWebView — ✅ поддерживает IndexedDB

**Вывод:** Проблемы нет. IndexedDB работает во всех Tauri WebView. Dexie.js можно использовать без изменений.

---

### 12.7. Проблема: Web Crypto API в Tauri WebView

**Суть проблемы:**
E2E шифрование использует Web Crypto API (`window.crypto.subtle`):
- `encryption.ts` — AES-GCM шифрование
- `keys.ts` — ECDH генерация ключей
- `keystore.ts` — хранение ключей
- `recovery.ts` — восстановление ключей

Вопрос: работает ли Web Crypto API в Tauri WebView?

**Анализ:**
- Все Tauri WebView поддерживают Web Crypto API
- `crypto.subtle` доступен во всех современных WebView

**Вывод:** Проблемы нет. Web Crypto API работает. E2E шифрование не требует изменений.

---

### 12.8. Проблема: Дубликат директории `app/app/src/features/`

**Суть проблемы:**
В проекте есть две директории features:
- `app/src/features/` — основная (полная, актуальная)
- `app/app/src/features/` — содержит только `chat/room/components/JoinRoomView/`

Вторая директория — остаток от старой структуры проекта. Она:
- Засоряет репозиторий
- Может вызывать путаницу при импортах
- Попадает в бандл при сборке

**Решение:** Удалить `app/app/` полностью. Это безопасно — основной код в `app/src/`.

---

### 12.9. Проблема: `.env.production.template` ссылается на Supabase

**Суть проблемы:**
`app/.env.production.template` содержит переменные:
- `VITE_SUPABASE_URL=`
- `VITE_SUPABASE_ANON_KEY=`
- `SUPABASE_SERVICE_ROLE_KEY=`
- `SUPABASE_CLI_PASSWORD=`
- `SUPABASE_HOME_IP_ADDRESS=`

Но проект **давно мигрировал на PocketBase** (см. ROADMAP.md). Supabase не используется.

**Решение:** Обновить `.env.production.template`:
- Убрать все Supabase переменные
- Добавить PocketBase переменные (`VITE_PB_URL`, `VITE_LIVEKIT_URL`)
- Добавить Tauri-специфичные переменные (`TAURI_PROXY_SERVER`, `TAURI_PROXY_UUID`, и т.д.)

---

### 12.10. Проблема: CSP отключён в `tauri.conf.json`

**Суть проблемы:**
```json
"security": { "csp": null }
```
CSP (Content Security Policy) отключён. В production-сборке это уязвимость — приложение уязвимо к XSS-атакам.

**Решение:** Настроить CSP:
```json
"csp": "default-src 'self'; connect-src 'self' http://127.0.0.1:* https://api.whoami.ninja wss://*.whoami.ninja; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'"
```

---

### 12.11. Проблема: Нет скриптов Tauri в `package.json` и `Makefile`

**Суть проблемы:**
- В `package.json` нет `tauri:dev`, `tauri:build` скриптов
- В `Makefile` нет команд для Tauri
- Разработчик не может запустить `npm run tauri:dev` или `make tauri-dev`

**Решение:**
В `package.json`:
```json
"tauri:dev": "tauri dev",
"tauri:build": "tauri build",
"tauri:build:debug": "tauri build --debug"
```
В `Makefile`:
```makefile
tauri-dev:
	cd app && npm run tauri:dev
tauri-build:
	cd app && npm run tauri:build
```

---

### 12.12. Проблема: CI/CD не покрывает Android/iOS

**Суть проблемы:**
`.github/workflows/tauri-build.yml` собирает только:
- macOS (aarch64 + x86_64)
- Ubuntu
- Windows

Нет сборок для:
- Android (aarch64-linux-android)
- iOS (aarch64-apple-ios)

**Решение:** Добавить matrix entries для Android/iOS:
```yaml
- platform: 'macos-latest'
  args: '--target aarch64-apple-ios'
- platform: 'ubuntu-22.04'
  args: '--target aarch64-linux-android'
```
Потребуется установка Android SDK / iOS toolchain в CI.

---

### 12.13. Проблема: Нет безопасного хранения конфигурации прокси

**Суть проблемы:**
Конфигурация VLESS/Reality (UUID, public_key, short_id, SNI) не должна:
- Хардкодиться в бинарнике (декомпиляция)
- Храниться в открытом виде в файле
- Передаваться по незащищённому каналу

**Варианты решения:**

| Вариант | Описание | Плюсы | Минусы |
|---|---|---|---|
| **A: OS Keychain** (рекомендуется) | Keychain (macOS), Credential Manager (Win), Keystore (Android) | ✅ Безопасно | ⚠️ Нужен tauri-plugin-keychain или аналог |
| B: Зашифрованный файл | Конфиг в файле, зашифрован ключом устройства | ✅ Просто | ⚠️ Ключ устройства можно извлечь |
| C: Загрузка с сервера | При запуске — запрос конфига с сервера | ✅ Ротация ключей | ❌ Нужна сеть при запуске |

**Рекомендация:** Вариант A + C. При первом запуске — загрузка с сервера (C), затем сохранение в Keychain (A). При последующих запусках — чтение из Keychain. Периодическая ротация через сервер.

---

### 12.14. Сводная таблица проблем и решений

| # | Проблема | Критичность | Решение | Сложность |
|---|---|---|---|---|
| 12.1 | Service Worker в Tauri | 🔴 Критичная | Условное отключение + Tauri-аналоги | Высокая |
| 12.2 | VitePWA конфликт | 🟡 Важная | Условное отключение плагина | Низкая |
| 12.3 | Захардкоженные URL | 🔴 Критичная | Ленивая инициализация PB | Средняя |
| 12.4 | Web Push API | 🔴 Критичная | `tauri-plugin-notification` | Высокая |
| 12.5 | Background Sync | 🟡 Важная | JS-side polling (MVP) / Rust scheduler | Средняя |
| 12.6 | IndexedDB/Dexie.js | ✅ Нет проблемы | Работает без изменений | — |
| 12.7 | Web Crypto API | ✅ Нет проблемы | Работает без изменений | — |
| 12.8 | Дубликат `app/app/` | 🟢 Низкая | Удалить директорию | Низкая |
| 12.9 | Устаревший `.env.template` | 🟡 Важная | Обновить переменные | Низкая |
| 12.10 | CSP отключён | 🔴 Критичная | Настроить CSP | Низкая |
| 12.11 | Нет скриптов Tauri | 🟡 Важная | Добавить в package.json + Makefile | Низкая |
| 12.12 | Нет Android/iOS в CI | 🟡 Важная | Добавить matrix entries | Средняя |
| 12.13 | Нет безопасного хранения конфига | 🔴 Критичная | OS Keychain + серверная ротация | Высокая |

---

## 13. Контрольный список готовности
+++++++ REPLACE</task_progress>

### Этап 1: Rust-ядро
- [ ] Добавить `tauri-plugin-shell` в `Cargo.toml`
- [ ] Создать модуль `proxy.rs` (управление xray-core)
- [ ] Реализовать Tauri-команды (`start_proxy`, `stop_proxy`, `get_proxy_status`, `get_proxy_port`, `restart_proxy`)
- [ ] Настроить routing rules (bypass для LiveKit IP)
- [ ] Скачать бинарники xray-core для всех платформ
- [ ] Настроить `externalBin` в `tauri.conf.json`
- [ ] Обновить `capabilities/default.json` (разрешения shell)
- [ ] Интегрировать в `lib.rs` (invoke_handler, setup, shutdown)

### Этап 2: Фронтенд
- [ ] Создать хук `useTauri()` (определение окружения)
- [ ] Создать `TauriProxyService` (управление через invoke)
- [ ] Модифицировать `pocketbase.ts` (динамический API URL)
- [ ] Создать UI-компонент статуса прокси
- [ ] Настроить bypass для WebRTC в LiveKit конфиге

### Этап 3: Сборка
- [ ] Добавить скрипты `tauri:dev` / `tauri:build` в `package.json`
- [ ] Настроить CSP в `tauri.conf.json`
- [ ] Добавить команды в `Makefile`
- [ ] Создать скрипт скачивания xray-core
- [ ] Протестировать сборку на macOS (dev)
- [ ] Протестировать сборку на Windows
- [ ] Протестировать сборку на Linux

### Этап 4: Безопасность
- [ ] Реализовать безопасное хранение конфига (Keychain/Keystore)
- [ ] Настроить ротацию UUID/ключей
- [ ] Реализовать anti-fingerprinting (рандомизация SNI)
- [ ] Настроить DNS routing (все DNS через прокси)
- [ ] Отключить логирование xray (loglevel: "none")

### Этап 5: Тестирование
- [ ] Юнит-тесты Rust (генерация конфига, порт-менеджмент)
- [ ] Интеграционные тесты (запуск xray, health check)
- [ ] E2E тесты (подключение к PB через прокси)
- [ ] Тест обхода ТСПУ (из РФ без VPN)
- [ ] Тест звонков (WebRTC bypass)
- [ ] Тест производительности (latency, throughput)

### Этап 6: Мобильные платформы
- [ ] Настроить сборку для Android (aarch64-linux-android)
- [ ] Настроить сборку для iOS (aarch64-apple-ios)
- [ ] Получить/создать ключи подписи (Android keystore, iOS provisioning)
- [ ] Тест на реальных устройствах

---

## 📎 Приложения

### Ссылки на документы
- `docs/BYPASS_STRATEGY.md` — полная стратегия обхода блокировок
- `.agent/artifacts/INFRASTRUCTURE_V2.md` — гибридная S3 инфраструктура
- `.agent/artifacts/GIT_MIGRATION.md` — разделение dev/prod репозиториев
- `.agent/artifacts/.archive/vps_migration_strategy.md` — история миграции VPS
- `.agent/artifacts/.archive/cloudflare_migration_plan.md` — проваленный план Cloudflare
- `.agent/artifacts/.archive/pwa_offline_architecture.md` — архитектура PWA

### Эталонная конфигурация
- Текущий рабочий конфиг Hiddify/happ на домашнем сервере — **эталон** для генерации xray-конфига в Tauri
- Параметры VLESS/Reality (UUID, public_key, short_id, SNI) — брать из рабочей конфигурации Hiddify

---

> **Главный принцип:** Не изобретать велосипед. У вас уже есть работающее решение (VLESS/Reality через Hiddify). Нужно перенести его из системного VPN в Tauri sidecar — это даст пользователям нативное приложение со встроенным обходом блокировок, без необходимости включать системный VPN.