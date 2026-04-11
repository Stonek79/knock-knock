# Реализация звонков (WebRTC) в Knock-Knock

**Статус:** 🟢 Актуально (PocketBase Edition)

Этот документ описывает архитектуру и шаги внедрения системы аудио- и видеозвонков на базе **LiveKit** и **PocketBase**.


---

## 📋 Содержание

1. [Архитектура](#архитектура)
2. [Инфраструктура](#инфраструктура)
3. [План реализации](#план-реализации)
4. [Приложения](#приложения)

---

## Архитектура

### Выбранное решение: LiveKit Server (Self-Hosted)

**Обоснование выбора:**

| Критерий | Преимущество |
|----------|--------------|
| **Приватность** | Полный контроль — сервер на домашней инфраструктуре |
| **Простота** | Готовые React компоненты, 10-15 часов на MVP |
| **Функционал** | Аудио + видео + групповые звонки из коробки |
| **Инфраструктура** | Один Docker контейнер, минимальная настройка |
| **Производительность** | SFU архитектура (оптимально для групповых звонков) |
| **Стоимость** | Бесплатно (open-source) |

---

### Схема архитектуры

```
┌─────────────────────────────────────────────────────────────┐
│  Клиент (Browser / PWA)                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  @livekit/components-react                          │   │
│  │  ├─ LiveKitRoom, VideoConference                    │   │
│  │  ├─ Готовые UI компоненты                           │   │
│  │  └─ Встроенное управление состоянием                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↕ (WebSocket + UDP)
              ┌───────────────────────────────┐
              │  WireGuard Tunnel             │
              └───────────────────────────────┘
                          ↕ (WebSocket + UDP)
┌─────────────────────────────────────────────────────────────┐
│  Домашний сервер (Ubuntu + Docker)                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LiveKit Server (SFU)                                │   │
│  │  ├─ Маршрутизация медиапотоков (WebRTC)             │   │
│  │  ├─ Групповые звонки                                │   │
│  │  ├─ E2E шифрование (DTLS-SRTP)                      │   │
│  │  └─ Token-based аутентификация                      │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Supabase (Docker)                                   │   │
│  │  ├─ Пользователи и аутентификация                   │   │
│  │  ├─ История звонков (call_logs)                     │   │
│  │  └─ Edge Functions (генерация токенов LiveKit)      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↕ (WireGuard)
┌─────────────────────────────────────────────────────────────┐
│  VPS (Public Access)                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Nginx (Reverse Proxy)                               │   │
│  │  ├─ Проксирование WebSocket на домашний сервер      │   │
│  │  └─ TLS termination (HTTPS/WSS)                     │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Coturn (TURN/STUN)                                  │   │
│  │  └─ NAT traversal для клиентов                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

### Поток звонка (Call Flow)

```
Caller                              Supabase LiveKit Server                      Callee
  │                                       │                                       │
  │─── Get Token (Edge Function) ────────>│                                       │
  │                                       │                                       │
  │<─── JWT Token ────────────────────────│                                       │
  │                                       │                                       │
  │─── Connect (WebSocket) ──────────────>│                                       │
  │                                       │                                       │
  │═══════════════════════════════════════│═══════════════════════════════════════│
  │                           LiveKit Room                                       │
  │═══════════════════════════════════════│═══════════════════════════════════════│
  │                                       │                                       │
  │─── Publish Track (Media) ────────────>│─── Forward Track ────────────────────>│
  │                                       │                                       │
  │<──────────────────────────────────────│<─── Subscribe Track ──────────────────│
  │                                       │                                       │
  │═══════════════════════════════════════════════════════════════════════════════│
  │                        Media Stream (P2P через SFU)                           │
  │═══════════════════════════════════════════════════════════════════════════════│
```

---

## Инфраструктура

### Требования к серверу

| Ресурс | Минимум | Рекомендуется |
|--------|---------|---------------|
| **CPU** | 2 ядра | 4 ядра |
| **RAM** | 2 GB | 4 GB |
| **Порты** | 7880, 7881, 443, 60000-60100/UDP | Те же + TLS |
| **Домен** | `calls.yourdomain.com` | Тот же + wildcard TLS |

---

### Шаг 1: Настройка LiveKit Server

#### 1.1: Docker Compose конфигурация

Создать файл `/opt/livekit/docker-compose.yml`:

```yaml
version: '3.8'

services:
  livekit:
    image: livekit/livekit-server:latest
    ports:
      - "7880:7880"   # HTTP API
      - "7881:7881"   # TCP
      - "443:443"     # WebSocket (TLS)
      - "60000-60100:60000-60100/udp"  # UDP (media)
    command:
      - --config
      - /etc/livekit.yaml
    volumes:
      - ./livekit.yaml:/etc/livekit.yaml
      - ./data:/data
    restart: always
    network_mode: host  # Для лучшего performance UDP
```

#### 1.2: Конфигурация LiveKit

Создать файл `/opt/livekit/livekit.yaml`:

```yaml
# LiveKit Server Configuration
port: 7880
rtc:
  udp_port: 60000
  tcp_port: 7881
  use_external_ip: true  # Важно для работы за NAT
  
# Аутентификация
keys:
  API_KEY: API_SECRET  # Сгенерировать: openssl rand -hex 16

# Webhook (опционально, для событий)
webhook:
  api_key: API_KEY
  urls: []

# Логирование
logging:
  level: info  # debug, info, warn, error
  json: true

# Redis (опционально, для кластеризации)
# redis:
#   address: localhost:6379
```

#### 1.3: Запуск LiveKit

```bash
# Создать директорию
sudo mkdir -p /opt/livekit
cd /opt/livekit

# Создать конфиги (см. выше)
sudo nano docker-compose.yml
sudo nano livekit.yaml

# Запустить
docker compose up -d

# Проверить статус
docker compose ps

# Посмотреть логи
docker compose logs -f livekit
```

---

### Шаг 2: Настройка Nginx на VPS

#### 2.1: Конфигурация Nginx для WebSocket

Создать файл `/etc/nginx/sites-available/livekit-ws`:

```nginx
# WebSocket проксирование для LiveKit (сигналинг)
server {
    listen 443 ssl http2;
    server_name calls.yourdomain.com;

    # SSL сертификаты (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # WebSocket proxy
    location / {
        proxy_pass https://HOME_SERVER_IP:7880;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;

        # Для WebSocket
        proxy_buffering off;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name calls.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

**Важно:** Nginx проксирует только WebSocket (сигналинг). UDP трафик для медиа пробрасывается через iptables (см. Шаг 2.2).

#### 2.2: Проброс UDP через WireGuard (iptables DNAT)

Nginx не может проксировать UDP порты для WebRTC. Необходимо настроить DNAT на VPS:

```bash
#!/bin/bash
# /usr/local/bin/setup-webrtc-nat.sh

VPS_PUBLIC_IP="<VPS_PUBLIC_IP>"
HOME_SERVER_WG_IP="10.50.0.2"  # IP домашнего сервера в WireGuard
UDP_PORT_RANGE="60000:60100"

# Включить IP forwarding
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# DNAT: Проброс UDP с публичного интерфейса на домашний сервер
sudo iptables -t nat -A PREROUTING -i eth0 -p udp --dport $UDP_PORT_RANGE \
    -j DNAT --to-destination $HOME_SERVER_WG_IP:$UDP_PORT_RANGE

# SNAT/Masquerade: Обратный трафик через WireGuard
sudo iptables -t nat -A POSTROUTING -o wg0 -j MASQUERADE

# Разрешить форвардинг для WireGuard интерфейса
sudo iptables -A FORWARD -i wg0 -j ACCEPT
sudo iptables -A FORWARD -o wg0 -j ACCEPT

# Сохранить правила (для Ubuntu/Debian)
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

**Создать systemd сервис для автоматического применения правил:**

```ini
# /etc/systemd/system/webrtc-nat.service
[Unit]
Description=WebRTC UDP Port Forwarding via WireGuard
After=network.target wireguard@wg0.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/setup-webrtc-nat.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

```bash
# Активировать сервис
sudo systemctl daemon-reload
sudo systemctl enable webrtc-nat
sudo systemctl start webrtc-nat
```

#### 2.3: Активация сайта Nginx

```bash
# Активировать сайт
sudo ln -s /etc/nginx/sites-available/livekit-ws /etc/nginx/sites-enabled/

# Проверить конфигурацию
sudo nginx -t

# Перезагрузить Nginx
sudo systemctl reload nginx

# Получить SSL сертификат
sudo certbot --nginx -d calls.yourdomain.com
```

---

### Шаг 3: Настройка фаервола

#### 3.1: На домашнем сервере

```bash
# Открыть порты для LiveKit
sudo ufw allow 7880/tcp
sudo ufw allow 7881/tcp
sudo ufw allow 443/tcp
sudo ufw allow 60000:60100/udp

# Разрешить WireGuard
sudo ufw allow 51820/udp

# Перезагрузить UFW
sudo ufw reload
```

#### 3.2: На VPS

```bash
# Открыть порты для LiveKit (проксирование)
sudo ufw allow 443/tcp
sudo ufw allow 60000:60100/udp

# Разрешить WireGuard
sudo ufw allow 51820/udp

# Перезагрузить UFW
sudo ufw reload
```

---

### Шаг 4: Настройка Coturn (TURN сервер)

Coturn уже настроен на VPS. Проверить конфигурацию:

```bash
# /etc/turnserver.conf
listening-port=3478
external-ip=<VPS_PUBLIC_IP>
realm=yourdomain.com

# Auth
use-auth-secret
static-auth-secret=<GENERATE_A_STRONG_SECRET>

# Resources
total-quota=100
max-bps=3000000

# Logging
log-file=stdout
```

---

## План реализации

### Этап 0: Подготовка инфраструктуры (2-3 часа)

**Задачи:**

- [ ] **Развернуть LiveKit Server на домашнем сервере:**
  - [ ] Создать `/opt/livekit/docker-compose.yml`
  - [ ] Создать `/opt/livekit/livekit.yaml`
  - [ ] Запустить `docker compose up -d`
  - [ ] Проверить доступность: `curl http://localhost:7880`

- [ ] **Настроить Nginx на VPS:**
  - [ ] Создать конфиг `/etc/nginx/sites-available/livekit`
  - [ ] Активировать сайт
  - [ ] Получить SSL сертификат (Certbot)
  - [ ] Проверить WebSocket проксирование

- [ ] **Настроить фаервол:**
  - [ ] Открыть порты на домашнем сервере
  - [ ] Открыть порты на VPS
  - [ ] Проверить доступность через `telnet`

- [ ] **Обновить переменные окружения:**
  ```env
  # .env.local (фронтенд)
  VITE_LIVEKIT_URL=wss://calls.yourdomain.com
  
  # .env (Supabase Edge Functions)
  LIVEKIT_API_KEY=your-api-key
  LIVEKIT_API_SECRET=your-api-secret
  ```

---

### Этап 1: Интеграция LiveKit (10-15 часов)

#### 1.1: Установка зависимостей (30 мин)

```bash
cd app
npm install @livekit/components-react @livekit/components-core livekit-client
npm install -D @livekit/components-styles
```

#### 1.2: Создание Edge Function для токенов (1-2 часа)

Создать файл `/app/supabase/functions/generate-livekit-token/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { AccessToken } from 'https://esm.sh/livekit-server-sdk@2';

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  };
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const { roomName, participantName, userId } = await req.json();
    
    // Проверка авторизации пользователя
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization');
    }
    
    // Создать токен
    const at = new AccessToken(
      Deno.env.get('LIVEKIT_API_KEY'),
      Deno.env.get('LIVEKIT_API_SECRET'),
      {
        identity: participantName,
        name: participantName,
        roomName,
        ttl: '1h',
      }
    );
    
    // Добавить права
    at.addGrant({
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    
    const token = await at.toJwt();
    
    return new Response(
      JSON.stringify({ token, roomName }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
```

#### 1.3: Создание компонента звонка (3-4 часа)

Создать файл `/app/src/features/calls/CallRoom/index.tsx`:

```tsx
import { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { supabase } from '@/lib/supabase';
import { useCallStore } from '@/stores/call/callStore';

interface CallRoomProps {
  roomName: string;
  participantName: string;
  videoEnabled: boolean;
  onCallEnd: () => void;
}

export function CallRoom({ 
  roomName, 
  participantName, 
  videoEnabled,
  onCallEnd 
}: CallRoomProps) {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Генерация токенов LiveKit через PB-хуки
    (async () => {
      try {
        const data = await pb.send('/api/livekit-token', {
          method: 'POST',
          body: { roomName, participantName },
        });
        
        setToken(data.token);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [roomName, participantName]);
  
  const handleDisconnected = () => {
    onCallEnd();
  };
  
  if (error) {
    return (
      <div className="error-state">
        <p>Ошибка подключения: {error}</p>
        <button onClick={onCallEnd}>Закрыть</button>
      </div>
    );
  }
  
  if (!token) {
    return (
      <div className="loading-state">
        <p>Подключение к звонку...</p>
      </div>
    );
  }
  
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <LiveKitRoom
        token={token}
        serverUrl={import.meta.env.VITE_LIVEKIT_URL}
        video={videoEnabled}
        audio={true}
        onDisconnected={handleDisconnected}
        style={{ width: '100%', height: '100%' }}
      >
        <VideoConference />
        <ControlBar variation="minimal" />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
```

#### 1.4: Создание store для управления звонками (1-2 часа)

Создать файл `/app/src/stores/call/callStore.ts`:

```typescript
import { create } from 'zustand';

interface CallState {
  // Состояние
  status: 'idle' | 'in-call' | 'connecting' | 'ended';
  callType: 'audio' | 'video' | null;
  remoteUserId: string | null;
  roomId: string | null;
  
  // Действия
  startCall: (userId: string, type: 'audio' | 'video') => void;
  acceptCall: () => void;
  endCall: () => void;
  setCallState: (state: Partial<CallState>) => void;
}

export const useCallStore = create<CallState>((set) => ({
  status: 'idle',
  callType: null,
  remoteUserId: null,
  roomId: null,
  
  startCall: (userId, type) => {
    const roomId = `call_${userId}_${Date.now()}`;
    set({
      status: 'connecting',
      callType: type,
      remoteUserId: userId,
      roomId,
    });
  },
  
  acceptCall: () => {
    set({ status: 'in-call' });
  },
  
  endCall: () => {
    set({
      status: 'ended',
      callType: null,
      remoteUserId: null,
      roomId: null,
    });
  },
  
  setCallState: (state) => {
    set(state);
  },
}));
```

#### 1.5: Интеграция с существующим UI (2-3 часа)

Обновить страницу `/app/src/pages/CallsPage/index.tsx`:

```tsx
import { Phone, PhoneCall, Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Box } from '@/components/layout/Box';
import { Flex } from '@/components/layout/Flex';
import { Button } from '@/components/ui/Button';
import { CallRoom } from '@/features/calls/CallRoom';
import { useCallStore } from '@/stores/call/callStore';
import { ICON_SIZE } from '@/lib/utils/iconSize';
import styles from './callspage.module.css';

export function CallsPage() {
  const { t } = useTranslation();
  const { status, startCall, endCall, roomId } = useCallStore();
  
  const handleStartCall = (type: 'audio' | 'video') => {
    // Временно заглушка - в будущем выбор контакта
    startCall('user-id', type);
  };
  
  if (status === 'in-call' || status === 'connecting') {
    return (
      <CallRoom
        roomName={roomId || 'default'}
        participantName="user"
        videoEnabled={true}
        onCallEnd={endCall}
      />
    );
  }
  
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      flexGrow="1"
      p="6"
      gap="4"
      className={styles.container}
    >
      <Box className={styles.iconBox}>
        <Phone size={ICON_SIZE.xl} />
      </Box>

      <h2 className={styles.title}>{t('calls.title', 'Звонки')}</h2>

      <p className={styles.description}>
        {t(
          'calls.emptyDescription',
          'Здесь будет отображаться история ваших звонков.',
        )}
      </p>

      <Flex gap="3">
        <Button
          variant="solid"
          size="md"
          onClick={() => handleStartCall('audio')}
        >
          <Phone size={ICON_SIZE.sm} />
          {t('calls.audioCall', 'Аудиозвонок')}
        </Button>
        
        <Button
          variant="solid"
          size="md"
          onClick={() => handleStartCall('video')}
        >
          <Video size={ICON_SIZE.sm} />
          {t('calls.videoCall', 'Видеозвонок')}
        </Button>
      </Flex>
    </Flex>
  );
}
```

---

### Этап 2: История звонков (3-5 часов)

#### 2.1: Создание таблицы в Supabase

Создать файл `/infra/migrations/create_call_logs_table.sql`:

```sql
-- Таблица для истории звонков
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID REFERENCES auth.users(id),
  callee_id UUID REFERENCES auth.users(id),
  room_id TEXT,
  
  -- Тип звонка
  call_type TEXT CHECK (call_type IN ('audio', 'video')),
  
  -- Статус
  status TEXT CHECK (status IN (
    'initiated', 
    'connected', 
    'missed', 
    'rejected', 
    'ended'
  )),
  
  -- Временные метки
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Метаданные
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_call_logs_users 
  ON call_logs(caller_id, callee_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_room 
  ON call_logs(room_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_started 
  ON call_logs(started_at DESC);

-- RLS Policies
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- Пользователи видят звонки где они участвуют
CREATE POLICY "Users can view own calls"
  ON call_logs
  FOR SELECT
  USING (
    auth.uid() = caller_id OR 
    auth.uid() = callee_id
  );

-- Создавать записи могут все
CREATE POLICY "Users can create calls"
  ON call_logs
  FOR INSERT
  WITH CHECK (true);

-- Обновлять могут только участники
CREATE POLICY "Users can update own calls"
  ON call_logs
  FOR UPDATE
  USING (
    auth.uid() = caller_id OR 
    auth.uid() = callee_id
  );
```

Применить миграцию:

```bash
# Через Supabase CLI
supabase db push --db-url "postgresql://postgres:password@HOME_SERVER_IP:5432/postgres"
```

#### 2.2: Логирование звонков

Создать файл `/app/src/lib/services/call-logger.ts`:

```typescript
import { supabase } from '@/lib/supabase';

export async function logCall(
  callerId: string,
  calleeId: string,
  type: 'audio' | 'video',
  status: 'initiated' | 'connected' | 'ended' | 'missed' | 'rejected',
  roomId?: string,
  durationSeconds?: number,
  errorMessage?: string
) {
  const { error } = await supabase
    .from('call_logs')
    .insert({
      caller_id: callerId,
      callee_id: calleeId,
      call_type: type,
      status,
      room_id: roomId,
      duration_seconds: durationSeconds,
      ended_at: status === 'ended' ? new Date().toISOString() : null,
      error_message: errorMessage,
    });
  
  if (error) {
    console.error('Failed to log call:', error);
    throw error;
  }
}

export async function updateCallStatus(
  callId: string,
  status: 'connected' | 'ended' | 'missed' | 'rejected',
  durationSeconds?: number
) {
  const { error } = await supabase
    .from('call_logs')
    .update({
      status,
      duration_seconds: durationSeconds,
      ended_at: status === 'ended' ? new Date().toISOString() : null,
    })
    .eq('id', callId);
  
  if (error) {
    console.error('Failed to update call status:', error);
    throw error;
  }
}
```

#### 2.3: Компонент истории звонков

Создать файл `/app/src/features/calls/CallHistory/index.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Box } from '@/components/layout/Box';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth/authStore';

interface CallLog {
  id: string;
  caller_id: string;
  callee_id: string;
  call_type: 'audio' | 'video';
  status: string;
  started_at: string;
  duration_seconds: number | null;
}

export function CallHistory() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  
  const { data: calls, isLoading } = useQuery({
    queryKey: ['calls', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .or(`caller_id.eq.${user?.id},callee_id.eq.${user?.id}`)
        .order('started_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as CallLog[];
    },
  });
  
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0 сек';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      connected: '✅ Завершён',
      missed: '❌ Пропущенный',
      rejected: '❌ Отклонён',
      ended: '✅ Завершён',
    };
    return statusMap[status] || status;
  };
  
  return (
    <Box>
      <h2>{t('calls.history', 'История звонков')}</h2>
      
      {isLoading ? (
        <p>Загрузка...</p>
      ) : calls?.length === 0 ? (
        <p>История звонков пуста</p>
      ) : (
        <ul>
          {calls.map((call) => (
            <li key={call.id}>
              <div>
                <strong>{call.call_type === 'video' ? '📹' : '📞'}</strong>
                <span> {getStatusText(call.status)}</span>
              </div>
              <div>
                <small>
                  {new Date(call.started_at).toLocaleString()} • 
                  Длительность: {formatDuration(call.duration_seconds)}
                </small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Box>
  );
}
```

---

## Приложения

### A. Переменные окружения

```env
# .env.local (фронтенд)
VITE_LIVEKIT_URL=wss://calls.yourdomain.com

# .env (Supabase Edge Functions)
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# .env (Supabase, опционально)
VITE_TURN_SERVER=turn:yourdomain.com:3478
VITE_TURN_USERNAME=privmessenger
VITE_TURN_PASSWORD=your-turn-secret
```

---

### B. Проверка работоспособности

```bash
# 1. Проверить LiveKit Server
curl http://localhost:7880

# 2. Проверить WebSocket проксирование
wscat -c wss://calls.yourdomain.com

# 3. Проверить Edge Function
curl -X POST 'https://yourdomain.com/functions/v1/generate-livekit-token' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"roomName":"test","participantName":"test-user"}'

# 4. Проверить логи LiveKit
docker compose logs -f livekit
```

---

### C. Тестовые сценарии

```typescript
// E2E тесты (Playwright)
describe('Звонки', () => {
  it('должен установить видеозвонок', async ({ page }) => {
    // Тест
  });
  
  it('должен завершить звонок и сохранить историю', async ({ page }) => {
    // Тест
  });
});
```

---

## Следующие шаги

1. ✅ **Инфраструктура готова:**
   - LiveKit Server развёрнут на домашнем сервере
   - Nginx настроен на VPS
   - Фаервол открыт

2. 🚀 **Начать реализацию:**
   - Этап 0: Подготовка инфраструктуры (2-3 часа)
   - Этап 1: Интеграция LiveKit (10-15 часов)
   - Этап 2: История звонков (3-5 часов)

**Общее время реализации MVP:** 15-23 часа

---

**Документ будет обновляться по мере реализации.**
