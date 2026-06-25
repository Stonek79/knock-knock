export const settings = {
    account: {
        account: "Аккаунт",
        identity: "Идентификация",
        security: "Безопасность",
        dangerZone: "Опасная зона",
        changePassword: "Изменить пароль",
        oldPassword: "Старый пароль",
        newPassword: "Новый пароль",
        confirmPassword: "Подтвердите пароль",
        passwordsNotMatch: "Пароли не совпадают",
        changeSuccess: "Пароль успешно изменен",
        passwordError: "Ошибка при смене пароля",
        deleteAccount: "Удалить аккаунт",
        deleteWarning:
            "Удаление невозвратное и все данные пользователя и информация о нем будут уничтожены и не подлежат восстановлению",
        enterPasswordToDelete: "Введите пароль для подтверждения",
        invites: "Приглашения",
        invitesDesc:
            "Сгенерируйте код или QR-код для приглашения друзей. Доступно 1 приглашение раз в 3 минуты.",
        generateInvite: "Создать приглашение",
        inviteReady:
            "Приглашение готово! Отсканируйте QR-код или скопируйте ссылку.",
    },
    appearance: {
        appearance: "Внешний вид",
        mode: "Режим",
    },
    privacy: {
        privacy: "Конфиденциальность",
        comingSoon: "Настройки конфиденциальности появятся скоро",
    },
    notifications: {
        notifications: "Уведомления",
        comingSoon: "Настройки уведомлений появятся скоро",
        pushToggle: "Web Push уведомления",
        unsupported: "Не поддерживается браузером",
        pushDesc:
            "Получайте уведомления о новых сообщениях, даже когда приложение закрыто. Полностью безопасно: мы используем E2E шифрование.",
        subscribedSuccess: "Уведомления успешно включены!",
        unsubscribedSuccess: "Уведомления отключены",
        errorSubscription: "Ошибка подписки",
        errorUnsubscription: "Ошибка отписки",
        requestDenied: "Вы отклонили запрос браузера на уведомления",
        configError: "Ошибка конфигурации. Проверьте настройки",
    },
    security: {
        security: "Безопасность",
    },
    profile: {
        profile: "Профиль",
        publicInfo: "Публичная информация",
    },
    storage: {
        storage: "Хранилище",
        deleteData: "Удалить данные",
        description:
            "Изображения и видео сохраняются на вашем устройстве для быстрой загрузки.",
        spaceUsed: "Занято места",
        spaceAvailable: "Доступно",
        deleteFiles: "Удалить файлы",
        clearWarningclearWarning:
            "Вы уверены, что хотите удалить все сохранённые изображения и голосовые сообщения с этого устройства? Они будут загружены снова при просмотре чатов.",
        clearTitle: "Очистка кэша",
        clearCache: "Очистить кэш",
    },
    broadcast: {
        title: "Глобальная рассылка",
        description:
            "Отправьте системное уведомление всем пользователям. Сообщение появится в их системном канале.",
        placeholder: "Введите текст уведомления...",
        send: "Отправить рассылку",
        success: "Рассылка успешно добавлена в очередь!",
        history: "История рассылок",
        mediaBroadcast: "Медиа-рассылка",
        deleteConfirm: "Удалить рассылку у всех пользователей?",
        deleteSuccess: "Рассылка успешно удалена",
        deleteError: "Ошибка при удалении",
    },
} as const;
