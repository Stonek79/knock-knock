/**
 * Экран ввода PIN-кода (Ghost Mode).
 *
 * Отображается при включённом Ghost Mode поверх всего приложения.
 * Является тонким контейнером, делегирующим логику в usePinInput,
 * а отображение — в PinDots и Numpad.
 *
 * Особенности:
 * - Скрытый `<input inputMode="numeric">` для вызова нативной клавиатуры на мобильных
 * - Декомпозиция: логика в хуке, UI в подкомпонентах
 * - Нет утечек памяти (таймеры очищаются в usePinInput)
 * - Все магические значения — в pin.constants.ts
 */
import { Flex, Text } from "@radix-ui/themes";
import { Lock } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useGhostStore } from "@/stores/ghost";
import { usePinInput } from "../hooks/usePinInput";
import { Numpad } from "./Numpad";
import { PinDots } from "./PinDots";
import { LOCK_ICON_SIZE, PIN_LENGTH } from "./pin.constants";
import styles from "./pin.module.css";

/**
 * Компонент экрана ввода PIN-кода.
 * Рендерится как полноэкранный оверлей.
 */
export function PinScreen() {
    const { t } = useTranslation();
    const { unlock, status } = useGhostStore();

    /**
     * Реф на скрытый input — при тапе на экран фокусируем его,
     * чтобы на мобильных устройствах появилась нативная цифровая клавиатура.
     */
    const hiddenInputRef = useRef<HTMLInputElement>(null);

    const { pin, hasError, errorMessage, addDigit, removeLastDigit } =
        usePinInput({
            unlock,
            isActive: status === "locked",
        });

    // Не показываем, если уже разблокирован или в режиме decoy
    if (status !== "locked") {
        return null;
    }

    /**
     * Фокус на скрытый input для вызова нативной клавиатуры.
     * Работает только на мобильных — на десктопе клавиатура и так доступна.
     */
    const focusHiddenInput = () => {
        hiddenInputRef.current?.focus();
    };

    return (
        <Flex
            direction="column"
            align="center"
            justify="center"
            className={styles.overlay}
            onClick={focusHiddenInput}
        >
            <Flex
                direction="column"
                align="center"
                gap="6"
                className={styles.container}
            >
                {/* Иконка замка */}
                <Lock size={LOCK_ICON_SIZE} className={styles.lockIcon} />

                {/* Заголовок */}
                <Text size="4" className={styles.title}>
                    {t("ghost.enterPin", "Введите PIN-код")}
                </Text>

                {/* Точки ввода */}
                <PinDots filledCount={pin.length} hasError={hasError} />

                {/* Сообщение об ошибке */}
                <Text className={styles.errorText}>{errorMessage}</Text>

                {/* Цифровая клавиатура */}
                <Numpad
                    onDigit={addDigit}
                    onDelete={removeLastDigit}
                    disabled={pin.length >= PIN_LENGTH}
                />

                {/*
                 * Скрытый input для нативной мобильной клавиатуры.
                 * inputMode="numeric" — вызывает цифровую раскладку на iOS/Android.
                 * autocomplete="one-time-code" — подсказка для автозаполнения.
                 */}
                <input
                    ref={hiddenInputRef}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    className={styles.hiddenInput}
                    maxLength={PIN_LENGTH}
                    aria-hidden="true"
                    tabIndex={-1}
                    value={pin}
                    onChange={(e) => {
                        const lastChar = e.target.value.slice(-1);
                        if (lastChar >= "0" && lastChar <= "9") {
                            addDigit(lastChar);
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Backspace") {
                            removeLastDigit();
                        }
                    }}
                />
            </Flex>
        </Flex>
    );
}
