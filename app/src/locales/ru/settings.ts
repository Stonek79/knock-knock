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
} as const;
