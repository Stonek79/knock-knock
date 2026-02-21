/**
 * Компонент точек ввода PIN-кода.
 *
 * Отображает ряд точек, заполняющихся по мере ввода цифр.
 * Поддерживает состояние ошибки (красные точки + анимация тряски).
 */
import { Box } from "@/components/layout/Box";
import { Flex } from "@/components/layout/Flex";
import { PIN_DOTS } from "./pin.constants";
import styles from "./pin.module.css";

interface PinDotsProps {
    /** Количество заполненных точек (0..PIN_LENGTH) */
    filledCount: number;
    /** Флаг ошибки — все точки красные + тряска */
    hasError: boolean;
}

/**
 * Визуализация прогресса ввода PIN.
 * Итерация по PIN_DOTS (объект с уникальными id) — без использования индексов массива.
 */
export function PinDots({ filledCount, hasError }: PinDotsProps) {
    return (
        <Flex
            gap="4"
            justify="center"
            className={`${styles.dotsContainer} ${hasError ? styles.error : ""}`}
        >
            {PIN_DOTS.map((dot) => (
                <Box
                    key={dot.id}
                    className={`${styles.dot} ${
                        dot.position < filledCount ? styles.filled : ""
                    } ${hasError ? styles.error : ""}`}
                />
            ))}
        </Flex>
    );
}
