export const auth = {
    loginTitle: "Вход",
    registerTitle: "Создание аккаунта",
    loginAction: "Войти",
    registerAction: "Создать аккаунт",
    noAccount: "Нет аккаунта?",
    hasAccount: "Уже есть аккаунт?",
    toRegister: "Зарегистрироваться",
    toLogin: "Войти",
    emailPlaceholder: "name@example.com",
    passwordPlaceholder: "••••••••",
    signInToAccount: "Войдите в свой аккаунт",
    inviteCode: "Код приглашения",
    inviteCodePlaceholder: "Вставьте код (напр. kk-...)",
    inviteTooltip:
        "Для защиты от спама регистрация требует код приглашения. Получите его у действующего участника.",
    usernameRequired: "Обязательное поле",
    usernameTooShort: "Слишком короткий",
    usernameTooLong: "Слишком длинный",
    usernameInvalid: "Только английские буквы, цифры и _",
    inviteCodeTooShort: "Код слишком короткий",
    sending: "Отправка...",
    signOut: "Выйти",
    error: "Ошибка авторизации",
    errors: {
        serverUnreachable:
            "Сервер недоступен. Проверьте ваше интернет-соединение или VPN.",
        invalidCredentials:
            "Неверная почта или пароль. Пожалуйста, проверьте данные и попробуйте снова.",
        sendEmailFailed:
            "Не удалось отправить письмо. Проверьте адрес почты или попробуйте позже.",
        rateLimitError:
            "Слишком много попыток входа. Попробуйте через {{seconds}} сек.",
        unauthorized: "Доступ запрещен. Пожалуйста, войдите в систему.",
        configError:
            "Ошибка конфигурации сервера (ANON_KEY). Обратитесь в поддержку.",
        unknown: "Произошла ошибка при входе. Попробуйте обновить страницу.",
        loginAfterRegisterFailed:
            "Не удалось войти после регистрации. Попробуйте войти вручную.",
        registerFailed: "Ошибка регистрации. Попробуйте позже.",
    },
    emailInvalid: "Неверный формат email",
    passwordTooShort: "Минимум 8 символов",
    passwordLatinOnly: "Только латинские буквы и цифры",
    passwordNeedLetter: "Нужна буква (A-Z)",
    passwordNeedNumber: "Нужна цифра (0-9)",
    displayNameTooShort: "Минимум 2 символа",
    displayNameTooLong: "Максимум 50 символов",
    mustAgreeToTerms: "Примите условия",
    passwordsNotMatch: "Пароли не совпадают",
    required: "Обязательное поле",
    usernameMin: "Минимум {{min}} символов",
    iAgreeToTerms: "Я принимаю условия использования",
    displayNameHint: "Имя, которое увидят другие пользователи в чатах.",
    usernamePlaceholder: "Ваш уникальный логин",
    usernameTooltip:
        "Ваш уникальный идентификатор в системе (логин). По нему вас смогут найти другие пользователи.",
    displayNameTooltip:
        "Ваше публичное имя, которое будут видеть все в чатах. Можно использовать любые символы, включая пробелы.",
    verificationRequired:
        "Пожалуйста, подтвердите ваш email для полного доступа.",
    verificationTitle: "Верификация аккаунта",
    verificationProcessing: "Проверяем ваш токен...",
    verificationSuccess: "Аккаунт успешно подтвержден!",
    verificationError:
        "Ошибка верификации. Ссылка устарела или недействительна.",
    backToLogin: "Вернуться ко входу",
    goToChat: "Перейти в чат",
    welcomeTitle: "Добро пожаловать!",
    welcomeDesc: "Давайте настроим ваш профиль, чтобы друзья могли вас найти.",
    onboardingComplete: "К общению!",
} as const;
