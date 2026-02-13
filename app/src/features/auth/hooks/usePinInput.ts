/**
 * Хук логики ввода PIN-кода.
 *
 * Инкапсулирует всё управление состоянием PIN:
 * - Добавление/удаление цифр
 * - Автопроверка при заполнении
 * - Обработка ошибок с анимацией
 * - Подписка на физическую клавиатуру
 * - Очистка таймеров через useRef (без утечек памяти)
 *
 * @param unlock — функция проверки PIN из useGhostStore
 * @param isActive — активен ли экран (status === "locked")
 */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ERROR_RESET_DELAY_MS,
    PIN_LENGTH,
    VERIFY_DELAY_MS,
} from "../PinScreen/pin.constants";

interface UsePinInputOptions {
    /** Функция разблокировки из ghost-стора */
    unlock: (pin: string) => Promise<boolean>;
    /** Экран активен (показан) — нужно подписываться на клавиатуру */
    isActive: boolean;
}

interface UsePinInputResult {
    /** Текущий введённый PIN (длина 0..PIN_LENGTH) */
    pin: string;
    /** Флаг ошибки (для анимации тряски) */
    hasError: boolean;
    /** Текст ошибки */
    errorMessage: string;
    /** Добавить цифру */
    addDigit: (digit: string) => void;
    /** Удалить последнюю цифру */
    removeLastDigit: () => void;
}

export function usePinInput({
    unlock,
    isActive,
}: UsePinInputOptions): UsePinInputResult {
    const { t } = useTranslation();
    const [pin, setPin] = useState("");
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    /**
     * Рефы для таймеров — гарантируют очистку при размонтировании.
     * Без них setTimeout может вызвать setState на размонтированном компоненте.
     */
    const verifyTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
    const resetTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

    /** Реф для актуального unlock (чтобы не пересоздавать эффект) */
    const unlockRef = useRef(unlock);
    unlockRef.current = unlock;

    /** Очистка всех таймеров при размонтировании */
    useEffect(() => {
        return () => {
            if (verifyTimerRef.current) {
                clearTimeout(verifyTimerRef.current);
            }

            if (resetTimerRef.current) {
                clearTimeout(resetTimerRef.current);
            }
        };
    }, []);

    /**
     * Добавить цифру к PIN.
     * При достижении PIN_LENGTH — автоматическая проверка через таймер.
     */
    const addDigit = (digit: string) => {
        if (pin.length >= PIN_LENGTH) {
            return;
        }

        setHasError(false);
        setErrorMessage("");

        const newPin = pin + digit;
        setPin(newPin);

        if (newPin.length === PIN_LENGTH) {
            // Очищаем предыдущий таймер проверки (если был)
            if (verifyTimerRef.current) {
                clearTimeout(verifyTimerRef.current);
            }

            verifyTimerRef.current = setTimeout(async () => {
                const success = await unlockRef.current(newPin);

                if (!success) {
                    setHasError(true);
                    setErrorMessage(t("ghost.wrongPin", "Неверный PIN-код"));

                    // Очищаем предыдущий таймер сброса
                    if (resetTimerRef.current) {
                        clearTimeout(resetTimerRef.current);
                    }

                    resetTimerRef.current = setTimeout(() => {
                        setPin("");
                        setHasError(false);
                    }, ERROR_RESET_DELAY_MS);
                }
            }, VERIFY_DELAY_MS);
        }
    };

    /** Удалить последнюю цифру */
    const removeLastDigit = () => {
        setPin((prev) => prev.slice(0, -1));
        setHasError(false);
        setErrorMessage("");
    };

    /**
     * Подписка на физическую клавиатуру.
     * Активна только когда экран показан (isActive === true).
     */
    useEffect(() => {
        if (!isActive) {
            return;
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key >= "0" && e.key <= "9") {
                addDigit(e.key);
            } else if (e.key === "Backspace" || e.key === "Delete") {
                removeLastDigit();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    });

    return { pin, hasError, errorMessage, addDigit, removeLastDigit };
}
