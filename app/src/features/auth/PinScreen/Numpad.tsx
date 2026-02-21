/**
 * Компонент цифровой клавиатуры PIN-кода.
 *
 * Отображает сетку 3×4 с цифрами 0-9, кнопкой удаления и пустой ячейкой.
 * Использует наш кастомный IconButton вместо Radix IconButton.
 */

import { Delete } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Box } from "@/components/layout/Box";
import { Grid } from "@/components/layout/Grid";
import { IconButton } from "@/components/ui/IconButton";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import { NUMPAD_KEYS } from "./pin.constants";
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

                /* Кнопка удаления — наш кастомный IconButton */
                if (keyDef.type === "action") {
                    return (
                        <IconButton
                            key={keyDef.id}
                            variant="ghost"
                            shape="round"
                            size="lg"
                            className={`${styles.numpadKey} ${styles.deleteKey}`}
                            onClick={onDelete}
                            disabled={disabled}
                            aria-label={t("ghost.delete", "Удалить")}
                        >
                            <Delete size={ICON_SIZE.md} />
                        </IconButton>
                    );
                }

                /* Цифровая кнопка */
                return (
                    <IconButton
                        key={keyDef.id}
                        variant="ghost"
                        shape="round"
                        size="lg"
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
