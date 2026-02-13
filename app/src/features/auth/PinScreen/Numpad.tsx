/**
 * Компонент цифровой клавиатуры PIN-кода.
 *
 * Отображает сетку 3×4 с цифрами 0-9, кнопкой удаления и пустой ячейкой.
 * Использует Radix UI Button/IconButton вместо нативных HTML-кнопок.
 */
import { Box, Grid, IconButton } from "@radix-ui/themes";
import { Delete } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DELETE_ICON_SIZE, NUMPAD_KEYS } from "./pin.constants";
import styles from "./pin.module.css";

interface NumpadProps {
    /** Обработчик нажатия цифры */
    onDigit: (digit: string) => void;
    /** Обработчик удаления последней цифры */
    onDelete: () => void;
    /** Блокировка ввода (при проверке PIN) */
    disabled?: boolean;
}

/**
 * Цифровая клавиатура (Numpad).
 * Итерирует по NUMPAD_KEYS из констант — каждая кнопка типизирована
 * и имеет уникальный id для React key.
 */
export function Numpad({ onDigit, onDelete, disabled }: NumpadProps) {
    const { t } = useTranslation();

    return (
        <Grid
            columns="3"
            gap="3"
            className={styles.numpad}
            role="group"
            aria-label={t("ghost.numpad", "Цифровая клавиатура")}
        >
            {NUMPAD_KEYS.map((keyDef) => {
                /* Пустая ячейка — невидимый placeholder для выравнивания сетки */
                if (keyDef.type === "empty") {
                    return <Box key={keyDef.id} className={styles.emptyCell} />;
                }

                /* Кнопка удаления */
                if (keyDef.type === "action") {
                    return (
                        <IconButton
                            key={keyDef.id}
                            variant="ghost"
                            radius="full"
                            size="4"
                            className={`${styles.numpadKey} ${styles.deleteKey}`}
                            onClick={onDelete}
                            disabled={disabled}
                            aria-label={t("ghost.delete", "Удалить")}
                        >
                            <Delete size={DELETE_ICON_SIZE} />
                        </IconButton>
                    );
                }

                /* Цифровая кнопка */
                return (
                    <IconButton
                        key={keyDef.id}
                        variant="ghost"
                        radius="full"
                        size="4"
                        className={styles.numpadKey}
                        onClick={() => onDigit(keyDef.value)}
                        disabled={disabled}
                        aria-label={keyDef.value}
                    >
                        {keyDef.value}
                    </IconButton>
                );
            })}
        </Grid>
    );
}
