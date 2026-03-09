# Регистрация и почтовая инфраструктура

**Версия:** 1.0  
**Дата:** Март 2026  
**Статус:** План реализации

---

## 📋 Содержание

1. [Архитектура](#архитектура)
2. [Инфраструктура](#инфраструктура)
3. [План реализации](#план-реализации)
4. [Приложения](#приложения)

---

## Архитектура

### Выбранное решение

**Регистрация:** Гибридная (логин + пароль, email опционально) + Invite-Only (опционально)

**Почта:** Гибридная (Postfix для приёма + Brevo Relay для отправки)

**Защита от ботов:** Cloudflare Turnstile + Rate Limiting

---

### Схема архитектуры

```
┌─────────────────────────────────────────────────────────────┐
│  Клиент (Browser / PWA)                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Форма регистрации                                   │   │
│  │  ├─ Логин + Пароль (обязательно)                    │   │
│  │  ├─ Email (опционально, для восстановления)         │   │
│  │  ├─ Cloudflare Turnstile (CAPTCHA)                  │   │
│  │  └─ Чекбокс принятия правил                         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↕ (HTTPS)
┌─────────────────────────────────────────────────────────────┐
│  VPS (Public Access)                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Nginx (Reverse Proxy)                               │   │
│  │  ├─ Rate Limiting (3 регистрации/час)               │   │
│  │  └─ TLS termination (HTTPS)                         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↕ (WireGuard)
┌─────────────────────────────────────────────────────────────┐
│  Домашний сервер (Ubuntu + Docker)                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Supabase (Docker)                                   │   │
│  │  ├─ Аутентификация пользователей                    │   │
│  │  ├─ Email подтверждение (опционально)               │   │
│  │  └─ Edge Functions (валидация CAPTCHA)              │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Postfix (SMTP)                                      │   │
│  │  ├─ Приём писем: feedback@yourdomain.com            │   │
│  │  ├─ Приём писем: admin@yourdomain.com               │   │
│  │  └─ Relay через Brevo для исходящих                 │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Brevo SMTP Relay                                    │   │
│  │  └─ Отправка писем пользователям (300/день)         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

### Поток регистрации

#### Режим 1: Открытая регистрация (по умолчанию)

```
User                    VPS (Nginx)              Supabase                Brevo
  │                          │                       │                       │
  │─── Заполнить форму ─────>│                       │                       │
  │                          │                       │                       │
  │─── Пройти CAPTCHA ──────>│                       │                       │
  │                          │                       │                       │
  │                          │─── Rate Limit Check ─>│                       │
  │                          │                       │                       │
  │                          │─── signUp() ─────────>│                       │
  │                          │                       │                       │
  │                          │                       │─── Если email: ──────>│
  │                          │                       │       Отправка письма │
  │                          │                       │                       │
  │<──(✅ Аккаунт создан)────│                       │                       │
```

#### Режим 2: Invite-Only (закрытая регистрация)

```
User                    VPS (Nginx)              Supabase                Brevo
  │                          │                       │                       │
  │─── Ввод инвайт-кода ────>│                       │                       │
  │                          │                       │                       │
  │                          │─── Validate Code ────>│                       │
  │                          │                       │                       │
  │<──(❌ Неверный код) ─────│                       │                       │
  │                          │                       │                       │
  │─── Пройти CAPTCHA ──────>│                       │                       │
  │                          │                       │                       │
  │                          │─── signUp() ─────────>│                       │
  │                          │                       │                       │
  │<──(✅ Аккаунт создан)────│                       │                       │
```

---

## Инфраструктура

### Требования к серверу

| Ресурс | Минимум | Рекомендуется |
|--------|---------|---------------|
| **CPU** | 1 ядро | 2 ядра |
| **RAM** | 1 GB | 2 GB |
| **Домен** | `yourdomain.com` | Тот же + wildcard TLS |

---

### Шаг 1: Настройка DNS записей

Создать DNS записи у вашего регистратора домена:

```dns
; A записи
@           A       <VPS_IP>
www         CNAME   @
mail        A       <VPS_IP>

; MX записи (для приёма почты)
@           MX      10 mail.yourdomain.com.

; SPF (разрешённые отправители)
@           TXT     "v=spf1 mx ip4:<VPS_IP> include:spf.brevo.com ~all"

; DKIM (Brevo)
brevo._domainkey  TXT  "v=DKIM1; k=rsa; p=<public-key-from-brevo>"

; DMARC (политика проверки)
_dmarc          TXT  "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com"
```

---

### Шаг 2: Настройка Brevo (SMTP Relay)

#### 2.1: Регистрация аккаунта

1. Перейти на https://www.brevo.com
2. Зарегистрироваться (бесплатно, 300 писем/день)
3. Подтвердить email
4. Добавить домен в разделе **Senders & IP** → **Domains**
5. Получить SMTP credentials:
   - **SMTP Server:** `smtp-relay.brevo.com`
   - **Port:** `587`
   - **Login:** ваш email
   - **Password:** сгенерировать в разделе **SMTP & API**

#### 2.2: Верификация домена

1. В панели Brevo перейти в **Senders & IP** → **Domains**
2. Добавить домен `yourdomain.com`
3. Скопировать DKIM ключ
4. Добавить TXT запись в DNS (см. выше)
5. Дождаться верификации (5-10 минут)

---

### Шаг 3: Настройка Postfix на домашнем сервере

#### 3.1: Установка Postfix

```bash
# Установить Postfix
sudo apt update
sudo apt install -y postfix mailutils

# При установке выбрать: "Internet Site"
# System mail name: yourdomain.com
```

#### 3.2: Конфигурация Postfix

Отредактировать `/etc/postfix/main.cf`:

```bash
# Базовые настройки
myhostname = mail.yourdomain.com
mydomain = yourdomain.com
myorigin = $mydomain
mydestination = $myhostname, localhost.$mydomain, localhost, $mydomain

# Сетевые настройки
inet_interfaces = all
inet_protocols = ipv4

# Relay через Brevo
relayhost = [smtp-relay.brevo.com]:587
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous
smtp_tls_security_level = encrypt
smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt

# Алиасы
alias_maps = hash:/etc/aliases
alias_database = hash:/etc/aliases
```

#### 3.3: Настройка credentials

Создать файл `/etc/postfix/sasl_passwd`:

```bash
[smtp-relay.brevo.com]:587    YOUR_BREVO_LOGIN:YOUR_BREVO_PASSWORD
```

Защитить файл и сгенерировать базу:

```bash
sudo chmod 600 /etc/postfix/sasl_passwd
sudo postmap /etc/postfix/sasl_passwd
sudo systemctl restart postfix
```

#### 3.4: Проверка работы

```bash
# Отправить тестовое письмо
echo "Test message" | mail -s "Test Subject" admin@yourdomain.com

# Проверить логи
sudo tail -f /var/log/mail.log
```

---

### Шаг 4: Настройка Nginx Rate Limiting на VPS

#### 4.1: Конфигурация Nginx

**Важно:** Если вы используете Cloudflare (даже только как CDN/proxy), реальные IP пользователей скрыты за IP-адресами Cloudflare. Необходимо настроить `set_real_ip_from` для корректной работы Rate Limiting.

Отредактировать `/etc/nginx/sites-available/knock-knock`:

```nginx
http {
    # Cloudflare Real IP
    # https://www.cloudflare.com/ips/
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 131.0.72.0/22;
    set_real_ip_from 2400:cb00::/32;
    set_real_ip_from 2606:4700::/32;
    set_real_ip_from 2803:f800::/32;
    set_real_ip_from 2405:b500::/32;
    set_real_ip_from 2405:8100::/32;
    set_real_ip_from 2c9f:1c::/32;
    real_ip_header CF-Connecting-IP;

    # Rate limiting зоны (теперь использует реальный IP пользователя)
    limit_req_zone $binary_remote_addr zone=registration:10m rate=3r/h;
    limit_req_zone $binary_remote_addr zone=email_send:10m rate=5r/h;

    server {
        # ... существующие настройки

        # Защита регистрации
        location /auth/v1/signup {
            limit_req zone=registration burst=1 nodelay;

            proxy_pass http://home-server-ip:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Защита отправки email
        location ~ ^/functions/v1/(send-.*|generate-.*) {
            limit_req zone=email_send burst=2 nodelay;

            proxy_pass http://home-server-ip:8000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

**Альтернатива:** Если не используете Cloudflare, удалите блок `set_real_ip_from` и оставьте как было.

#### 4.2: Применить конфигурацию

```bash
# Проверить конфигурацию
sudo nginx -t

# Перезагрузить Nginx
sudo systemctl reload nginx
```

**Проверка:**
```bash
# Убедиться, что реальный IP определяется корректно
curl -I https://yourdomain.com
# В логах Nginx должен быть ваш реальный IP, а не IP Cloudflare
```

---

### Шаг 5: Настройка Cloudflare Turnstile

#### 5.1: Регистрация в Cloudflare

1. Перейти на https://www.cloudflare.com/products/turnstile/
2. Войти через аккаунт Cloudflare (или создать)
3. Добавить сайт:
   - **Domain:** yourdomain.com
   - **Widget mode:** Invisible (невидимая CAPTCHA)
4. Получить ключи:
   - **Site key:** `1x00000000000000000000AA`
   - **Secret key:** `1x0000000000000000000000000000000AA`

---

## План реализации

### Этап 0: Подготовка (2-3 часа)

**Задачи:**

- [ ] **Зарегистрировать домен:**
  - [ ] Выбрать регистратора (Namecheap, Cloudflare, etc.)
  - [ ] Зарегистрировать домен `yourdomain.com`

- [ ] **Настроить DNS записи:**
  - [ ] Добавить A записи для домена
  - [ ] Добавить MX записи для почты
  - [ ] Добавить TXT записи (SPF, DKIM, DMARC)

- [ ] **Создать аккаунт Brevo:**
  - [ ] Зарегистрироваться на https://brevo.com
  - [ ] Подтвердить email
  - [ ] Добавить домен
  - [ ] Получить SMTP credentials

- [ ] **Создать аккаунт Cloudflare Turnstile:**
  - [ ] Зарегистрироваться на https://cloudflare.com
  - [ ] Добавить сайт
  - [ ] Получить Site Key и Secret Key

- [ ] **Обновить переменные окружения:**
  ```env
  # .env.local (фронтенд)
  VITE_SUPABASE_URL=https://yourdomain.com
  VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
  
  # .env (Supabase)
  SMTP_HOST=smtp-relay.brevo.com
  SMTP_PORT=587
  SMTP_USER=your-brevo-login
  SMTP_PASS=your-brevo-password
  SMTP_SENDER_NAME=Knock-Knock
  SMTP_ADMIN_EMAIL=noreply@yourdomain.com
  
  # .env (Edge Functions)
  TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
  BREVO_API_KEY=xapi-...
  ADMIN_EMAIL=admin@yourdomain.com
  
  # Режим регистрации
  VITE_REGISTRATION_MODE="open"
  VITE_INVITE_CODE_REQUIRED=false
  INVITE_CODE_SECRET_KEY=your-secret-key
  MAX_INVITES_PER_USER=5
  ```

---

### Этап 1: Настройка SMTP для Supabase (2-3 часа)

#### 1.1: Обновление конфигурации Supabase

Отредактировать файл `/infra/home/supabase.env.template`:

```env
# Email Configuration
MAILER_EMAILS_ENABLED=true
MAILER_TEMPLATES_ENABLED=true

# SMTP Settings (Brevo Relay)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<brevo-login>
SMTP_PASS=<brevo-password>
SMTP_SENDER_NAME=Knock-Knock
SMTP_ADMIN_EMAIL=noreply@yourdomain.com

# Site URLs
SITE_URL=https://yourdomain.com
API_EXTERNAL_URL=https://yourdomain.com

# Email Templates
MAILER_URLPATHS_INVITE=/auth/verify
MAILER_URLPATHS_CONFIRMATION=/auth/verify
MAILER_REDIRECT_URL=https://yourdomain.com/auth/verify
```

#### 1.2: Настройка шаблонов писем в Supabase

В Supabase Dashboard → Authentication → Email Templates:

**Confirmation Email:**
```html
<h2>Добро пожаловать в Knock-Knock!</h2>
<p>Нажмите на ссылку ниже для подтверждения email:</p>
<p><a href="{{ .ConfirmationURL }}">Подтвердить email</a></p>
<p>Или введите код: {{ .Token }}</p>
```

**Magic Link Email:**
```html
<h2>Вход в Knock-Knock</h2>
<p>Нажмите на ссылку для входа:</p>
<p><a href="{{ .ConfirmationURL }}">Войти</a></p>
```

#### 1.3: Включение подтверждения email

В Supabase Dashboard → Authentication → Settings:

- [ ] **Enable email confirmations:** true
- [ ] **Enable double opt-in:** true (опционально)

#### 1.4: Тестирование отправки

```bash
# Тестовая регистрация
curl -X POST 'https://yourdomain.com/auth/v1/signup' \
  -H 'apikey: <anon-key>' \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@yourdomain.com","password":"test123"}'

# Проверить логи Supabase
docker compose logs -f auth
```

---

### Этап 2: Страница подтверждения email (2-3 часа)

#### 2.1: Создание роута

Создать файл `/app/src/routes/_auth/verify.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Flex } from '@/components/layout/Flex';
import { Heading } from '@/components/ui/Heading';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { supabase } from '@/lib/supabase';

export function EmailVerification() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  
  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const hash = params.get('hash');
        
        if (!token || !hash) {
          throw new Error('Invalid token or hash');
        }
        
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'email',
        });
        
        if (error) throw error;
        
        setStatus('success');
      } catch (err) {
        setErrorMessage(err.message);
        setStatus('error');
      }
    };
    
    verifyEmail();
  }, []);
  
  const handleGoToChat = () => {
    navigate({ to: '/chat' });
  };
  
  const handleBackToRegistration = () => {
    navigate({ to: '/auth/register' });
  };
  
  return (
    <Flex direction="column" align="center" justify="center" gap="4" p="6">
      {status === 'loading' && (
        <>
          <Spinner size="lg" />
          <Text>Подтверждение email...</Text>
        </>
      )}
      
      {status === 'success' && (
        <>
          <Alert variant="success">
            <AlertTitle>{t('auth.emailVerified')}</AlertTitle>
            <AlertDescription>
              {t('auth.emailVerifiedDescription')}
            </AlertDescription>
          </Alert>
          <Button onClick={handleGoToChat}>
            {t('auth.goToChat')}
          </Button>
        </>
      )}
      
      {status === 'error' && (
        <>
          <Alert variant="danger">
            <AlertTitle>{t('auth.verificationError')}</AlertTitle>
            <AlertDescription>
              {errorMessage || t('auth.verificationErrorDescription')}
            </AlertDescription>
          </Alert>
          <Button onClick={handleBackToRegistration}>
            {t('auth.backToRegistration')}
          </Button>
        </>
      )}
    </Flex>
  );
}
```

#### 2.2: Обновление локализации

Добавить в `/app/src/locales/ru/auth.ts`:

```typescript
export const auth = {
  // ... существующие ключи
  emailVerified: "Email подтверждён!",
  emailVerifiedDescription: "Ваш аккаунт активирован. Теперь вы можете войти.",
  goToChat: "Перейти к чатам",
  verificationError: "Ошибка подтверждения",
  verificationErrorDescription: "Ссылка недействительна или истекла.",
  backToRegistration: "Вернуться к регистрации",
};
```

Добавить в `/app/src/locales/en/auth.ts`:

```typescript
export const auth = {
  // ... existing keys
  emailVerified: "Email confirmed!",
  emailVerifiedDescription: "Your account is activated. You can now log in.",
  goToChat: "Go to chats",
  verificationError: "Verification error",
  verificationErrorDescription: "The link is invalid or has expired.",
  backToRegistration: "Back to registration",
};
```

---

### Этап 3: Защита от ботов (3-4 часа)

#### 3.1: Установка зависимости

```bash
cd app
npm install react-turnstile
```

#### 3.2: Обновление формы регистрации

Отредактировать `/app/src/features/auth/components/LoginForm.tsx`:

```tsx
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { AppLogo } from "@/components/ui/AppLogo";
import { Button } from "@/components/ui/Button";
import { EmailInput } from "@/components/ui/EmailInput";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Checkbox } from "@/components/ui/Checkbox";
import { AUTH_MODES, AUTH_VIEW_MODES } from "@/lib/constants";
import { useLoginForm } from "../hooks/useLoginForm";
import Turnstile from 'react-turnstile';
import styles from "./loginForm.module.css";

interface LoginFormProps {
    onSuccess: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
    const { t } = useTranslation();
    const {
        form,
        submitError,
        authMode,
        viewMode,
        toggleAuthMode,
        toggleViewMode,
        loginSchema,
    } = useLoginForm(onSuccess);
    
    const [captchaToken, setCaptchaToken] = useState<string>('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    
    const handleCaptchaSuccess = (token: string) => {
        setCaptchaToken(token);
    };
    
    const isSubmitDisabled = !captchaToken || (viewMode === AUTH_VIEW_MODES.REGISTER && !termsAccepted);

    return (
        <form
            autoComplete="off"
            onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isSubmitDisabled) {
                    form.handleSubmit();
                }
            }}
        >
            {/* ... существующие поля формы ... */}
            
            {/* Cloudflare Turnstile CAPTCHA */}
            <Flex justify="center" my="4">
                <Turnstile
                    siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                    onSuccess={handleCaptchaSuccess}
                    options={{
                        theme: 'auto',
                        language: 'ru',
                    }}
                />
            </Flex>
            
            {/* Чекбокс принятия правил (для регистрации) */}
            {viewMode === AUTH_VIEW_MODES.REGISTER && (
                <Flex align="center" gap="2" my="3">
                    <Checkbox
                        id="terms"
                        checked={termsAccepted}
                        onCheckedChange={setTermsAccepted}
                    />
                    <label htmlFor="terms" className={styles.termsLabel}>
                        {t('auth.termsAccept')}
                        <a href="/terms" target="_blank" rel="noopener noreferrer">
                            {t('auth.termsLink')}
                        </a>
                    </label>
                </Flex>
            )}
            
            <Button 
                type="submit" 
                disabled={!form.state.canSubmit || isSubmitDisabled}
                variant="solid"
                size="md"
            >
                {form.state.isSubmitting
                    ? t("auth.sending")
                    : viewMode === AUTH_VIEW_MODES.LOGIN
                      ? t("auth.loginAction")
                      : t("auth.registerAction")}
            </Button>
        </form>
    );
}
```

#### 3.3: Создание Edge Function для валидации

Создать файл `/app/supabase/functions/verify-turnstile/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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
    const { token } = await req.json();
    
    if (!token) {
      throw new Error('Missing token');
    }
    
    // Верификация токена через Cloudflare
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: Deno.env.get('TURNSTILE_SECRET_KEY'),
          response: token,
        }),
      }
    );
    
    const result = await response.json();
    
    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: 'CAPTCHA verification failed' }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
```

#### 3.4: Обновление useLoginForm хука

Отредактировать `/app/src/features/auth/hooks/useLoginForm.ts`:

```typescript
import { useForm } from "@tanstack/react-form";
import { type MouseEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAuthErrorMessage } from "@/features/auth/utils/auth-errors";
import { useRateLimiter } from "@/hooks/useRateLimiter";
import { AUTH_MODES, AUTH_VIEW_MODES } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { loginSchema } from "@/lib/schemas/auth";
import { supabase } from "@/lib/supabase";
import type { AuthMode, AuthViewMode } from "@/lib/types/auth";

export function useLoginForm(onSuccess: () => void) {
    const { t } = useTranslation();
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [authMode, setAuthMode] = useState<AuthMode>(AUTH_MODES.MAGIC_LINK);
    const [viewMode, setViewMode] = useState<AuthViewMode>(AUTH_VIEW_MODES.LOGIN);

    const { isBlocked, secondsLeft, recordAttempt, resetAttempts } =
        useRateLimiter({
            maxAttempts: 5,
            blockDurationSeconds: 60,
        });

    const form = useForm({
        defaultValues: {
            email: "",
            password: "",
        },
        onSubmit: async ({ value, formApi }) => {
            setSubmitError(null);

            if (isBlocked) {
                setSubmitError(
                    t("auth.errors.rateLimitError", { seconds: secondsLeft }),
                );
                return;
            }

            // Верификация CAPTCHA
            const captchaToken = formApi.getFieldValue('captchaToken');
            if (captchaToken) {
                try {
                    const { data, error } = await supabase.functions.invoke(
                        'verify-turnstile',
                        { body: { token: captchaToken } }
                    );
                    
                    if (error || !data?.success) {
                        throw new Error(t('auth.errors.captchaFailed'));
                    }
                } catch (err) {
                    setSubmitError(t('auth.errors.captchaFailed'));
                    return;
                }
            }

            try {
                if (authMode === AUTH_MODES.MAGIC_LINK) {
                    logger.info("Attempting magic link login", {
                        email: value.email,
                        type: viewMode,
                    });
                    const { error } = await supabase.auth.signInWithOtp({
                        email: value.email,
                        options: {
                            emailRedirectTo: window.location.origin,
                        },
                    });

                    if (error) {
                        throw error;
                    }

                    logger.info("Magic link sent successfully");
                    resetAttempts();
                    onSuccess();
                } else {
                    const isRegister = viewMode === AUTH_VIEW_MODES.REGISTER;

                    if (isRegister) {
                        const { error } = await supabase.auth.signUp({
                            email: value.email,
                            password: value.password || "",
                        });
                        if (error) {
                            throw error;
                        }
                        logger.info("Password registration successful");
                        resetAttempts();
                        onSuccess();
                    } else {
                        const { error } = await supabase.auth.signInWithPassword({
                            email: value.email,
                            password: value.password || "",
                        });
                        if (error) {
                            throw error;
                        }
                        logger.info("Password login successful");
                        resetAttempts();
                    }
                }
            } catch (err) {
                logger.error("Login exception", err);
                recordAttempt();
                setSubmitError(getAuthErrorMessage(err));
            }
        },
    });

    // ... существующие функции ...
    
    return {
        form,
        submitError,
        authMode,
        viewMode,
        toggleAuthMode,
        toggleViewMode,
        loginSchema,
    };
}
```

---

### Этап 4: Ознакомление с правилами (2-3 часа)

#### 4.1: Создание страницы с правилами

Создать файл `/app/src/routes/terms.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { Box } from '@/components/layout/Box';
import { Flex } from '@/components/layout/Flex';
import { Heading } from '@/components/ui/Heading';
import { Text } from '@/components/ui/Text';
import styles from './terms.module.css';

export function TermsPage() {
  const { t } = useTranslation();
  
  return (
    <Flex justify="center" p="6">
      <Box className={styles.container} maxWidth="800px">
        <Heading as="h1" size="lg" mb="4">
          {t('terms.title', 'Правила использования PrivMessenger')}
        </Heading>
        
        <section className={styles.section}>
          <Heading as="h2" size="md" mb="2">
            {t('terms.section1', '1. Общие положения')}
          </Heading>
          <Text>
            {t('terms.section1Text', '1.1. PrivMessenger — это мессенджер с фокусом на приватность и безопасность.\n1.2. Используя приложение, вы соглашаетесь с этими правилами.')}
          </Text>
        </section>
        
        <section className={styles.section}>
          <Heading as="h2" size="md" mb="2">
            {t('terms.section2', '2. Конфиденциальность')}
          </Heading>
          <Text>
            {t('terms.section2Text', '2.1. Мы не храним содержимое ваших сообщений (E2E шифрование).\n2.2. Мы собираем минимальные метаданные (email, дата регистрации).\n2.3. Мы не передаём данные третьим лицам.')}
          </Text>
        </section>
        
        <section className={styles.section}>
          <Heading as="h2" size="md" mb="2">
            {t('terms.section3', '3. Запрещённое использование')}
          </Heading>
          <Text>
            {t('terms.section3Text', '3.1. Запрещено использовать приложение для:\n- Спам и массовые рассылки\n- Мошенничество и обман\n- Распространение незаконного контента\n- Нарушение авторских прав')}
          </Text>
        </section>
        
        <section className={styles.section}>
          <Heading as="h2" size="md" mb="2">
            {t('terms.section4', '4. Ограничения')}
          </Heading>
          <Text>
            {t('terms.section4Text', '4.1. Мы не несём ответственности за содержимое ваших сообщений.\n4.2. Мы можем заблокировать аккаунт при нарушении правил.')}
          </Text>
        </section>
        
        <section className={styles.section}>
          <Heading as="h2" size="md" mb="2">
            {t('terms.section5', '5. Изменения')}
          </Heading>
          <Text>
            {t('terms.section5Text', '5.1. Мы можем обновлять правила с уведомлением пользователей.')}
          </Text>
        </section>
      </Box>
    </Flex>
  );
}
```

#### 4.2: Обновление локализации

Добавить в `/app/src/locales/ru/auth.ts`:

```typescript
export const auth = {
  // ... существующие ключи
  termsAccept: "Я прочитал и принимаю",
  termsLink: "Правила использования",
  termsRequired: "Необходимо принять правила использования",
};
```

---

### Этап 5: Форма обратной связи (3-4 часа)

#### 5.1: Создание таблицы в Supabase

Создать файл `/infra/migrations/create_feedback_table.sql`:

```sql
-- Таблица для обратной связи
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  email TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  admin_response TEXT,
  responded_at TIMESTAMPTZ
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

-- RLS Policies
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Пользователи видят только свои feedback
CREATE POLICY "Users can view own feedback"
  ON feedback
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create feedback"
  ON feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Админы видят всё
CREATE POLICY "Admins can view all feedback"
  ON feedback
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );
```

#### 5.2: Edge Function для отправки уведомлений

Создать файл `/app/supabase/functions/send-feedback/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  };
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const { email, subject, message, userId } = await req.json();
    
    // Создать Supabase клиент
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Сохранить в БД
    const { error: dbError } = await supabase
      .from('feedback')
      .insert({ 
        user_id: userId, 
        email, 
        subject, 
        message 
      });
    
    if (dbError) throw dbError;
    
    // Отправить email администратору через Brevo
    const emailResponse = await fetch(
      'https://api.brevo.com/v3/smtp/email',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': Deno.env.get('BREVO_API_KEY')!,
        },
        body: JSON.stringify({
          sender: { 
            email: 'noreply@yourdomain.com', 
            name: 'PrivMessenger Feedback' 
          },
          to: [{ email: Deno.env.get('ADMIN_EMAIL')! }],
          subject: `[Feedback] ${subject}`,
          htmlContent: `
            <h2>Новое сообщение от пользователя</h2>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>User ID:</strong> ${userId || 'Anonymous'}</p>
            <p><strong>Тема:</strong> ${subject}</p>
            <p><strong>Сообщение:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
          `,
        }),
      }
    );
    
    if (!emailResponse.ok) {
      console.error('Failed to send email:', await emailResponse.text());
    }
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
```

#### 5.3: Компонент формы обратной связи

Создать файл `/app/src/features/feedback/FeedbackForm/index.tsx`:

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from '@tanstack/react-form';
import { Box } from '@/components/layout/Box';
import { Flex } from '@/components/layout/Flex';
import { Heading } from '@/components/ui/Heading';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth/authStore';

export function FeedbackForm() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  const form = useForm({
    defaultValues: {
      email: user?.email ?? '',
      subject: '',
      message: '',
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      setSubmitError(null);
      
      try {
        const { error } = await supabase.functions.invoke('send-feedback', {
          body: { 
            ...value, 
            userId: user?.id 
          },
        });
        
        if (error) throw error;
        
        setSubmitSuccess(true);
        form.reset();
      } catch (err) {
        setSubmitError(t('feedback.errors.submitFailed'));
      } finally {
        setIsSubmitting(false);
      }
    },
  });
  
  return (
    <Box p="4">
      <Heading as="h2" size="md" mb="4">
        {t('feedback.title', 'Обратная связь')}
      </Heading>
      
      {submitSuccess ? (
        <Alert variant="success">
          <AlertTitle>{t('feedback.success')}</AlertTitle>
          <AlertDescription>
            {t('feedback.successDescription', 'Спасибо! Ваше сообщение отправлено.')}
          </AlertDescription>
        </Alert>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <form.Field
            name="email"
            validators={{
              onChange: ({ value }) => {
                if (!value) return t('common.required');
                if (!/^\S+@\S+$/.test(value)) return t('common.invalidEmail');
                return undefined;
              },
            }}
          >
            {(field) => (
              <Flex direction="column" gap="2" mb="4">
                <label htmlFor={field.name}>{t('common.email')}</label>
                <TextField
                  id={field.name}
                  name={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="name@example.com"
                />
              </Flex>
            )}
          </form.Field>
          
          <form.Field
            name="subject"
            validators={{
              onChange: ({ value }) => !value ? t('common.required') : undefined,
            }}
          >
            {(field) => (
              <Flex direction="column" gap="2" mb="4">
                <label htmlFor={field.name}>{t('feedback.subject')}</label>
                <TextField
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={t('feedback.subjectPlaceholder', 'Тема сообщения')}
                />
              </Flex>
            )}
          </form.Field>
          
          <form.Field
            name="message"
            validators={{
              onChange: ({ value }) => !value ? t('common.required') : undefined,
            }}
          >
            {(field) => (
              <Flex direction="column" gap="2" mb="4">
                <label htmlFor={field.name}>{t('feedback.message')}</label>
                <TextField
                  id={field.name}
                  name={field.name}
                  multiline
                  rows={5}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={t('feedback.messagePlaceholder', 'Ваше сообщение...')}
                />
              </Flex>
            )}
          </form.Field>
          
          {submitError && (
            <Alert variant="danger" mb="4">
              <AlertTitle>{t('auth.error')}</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
          
          <Button 
            type="submit" 
            disabled={isSubmitting}
            variant="solid"
            size="md"
          >
            {isSubmitting ? t('common.sending') : t('feedback.submit', 'Отправить')}
          </Button>
        </form>
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
VITE_SUPABASE_URL=https://yourdomain.com
VITE_SUPABASE_ANON_KEY=ey...
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA

# .env (Supabase)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-login
SMTP_PASS=your-brevo-password
SMTP_SENDER_NAME=Knock-Knock
SMTP_ADMIN_EMAIL=noreply@yourdomain.com

SITE_URL=https://yourdomain.com
API_EXTERNAL_URL=https://yourdomain.com

# .env (Edge Functions)
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
BREVO_API_KEY=xapi-...
ADMIN_EMAIL=admin@yourdomain.com

# Режим регистрации
VITE_REGISTRATION_MODE="open"
VITE_INVITE_CODE_REQUIRED=false
INVITE_CODE_SECRET_KEY=your-secret-key
MAX_INVITES_PER_USER=5
```

---

### B. Проверка работоспособности

```bash
# 1. Проверить отправку email через Brevo
curl -X POST 'https://yourdomain.com/auth/v1/signup' \
  -H 'apikey: <anon-key>' \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@yourdomain.com","password":"test123"}'

# 2. Проверить логи Postfix
sudo tail -f /var/log/mail.log

# 3. Проверить работу CAPTCHA
# Открыть форму регистрации и убедиться, что Turnstile загружается

# 4. Проверить Edge Function
curl -X POST 'https://yourdomain.com/functions/v1/verify-turnstile' \
  -H 'Authorization: Bearer <anon-key>' \
  -H 'Content-Type: application/json' \
  -d '{"token":"test-token"}'
```

---

### C. Тестовые сценарии

```typescript
// E2E тесты (Playwright)
describe('Регистрация', () => {
  it('должен зарегистрировать пользователя с email подтверждением', async ({ page }) => {
    // Тест
  });
  
  it('должен пройти CAPTCHA', async ({ page }) => {
    // Тест
  });
  
  it('должен потребовать принятия правил', async ({ page }) => {
    // Тест
  });
});

describe('Обратная связь', () => {
  it('должен отправить сообщение администратору', async ({ page }) => {
    // Тест
  });
});
```

---

## Следующие шаги

1. ✅ **Инфраструктура готова:**
   - Домен зарегистрирован
   - DNS записи настроены
   - Brevo аккаунт создан
   - Cloudflare Turnstile ключи получены

2. 🚀 **Начать реализацию:**
   - Этап 0: Подготовка (2-3 часа)
   - Этап 1: Настройка SMTP (2-3 часа)
   - Этап 2: Страница подтверждения (2-3 часа)
   - Этап 3: Защита от ботов (3-4 часа)
   - Этап 4: Правила использования (2-3 часа)
   - Этап 5: Форма обратной связи (3-4 часа)

**Общее время реализации MVP:** 14-20 часов

---

**Документ будет обновляться по мере реализации.**
