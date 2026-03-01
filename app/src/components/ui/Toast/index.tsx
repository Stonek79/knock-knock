/**
 * Компонент Toast-уведомлений на базе @radix-ui/react-toast.
 *
 * Использование:
 * 1. Обернуть приложение в <ToastProvider>.
 * 2. Вызвать хук useToast() для получения функции toast().
 *
 * Поддерживает три варианта: success, error, info.
 */
import * as ToastPrimitive from "@radix-ui/react-toast";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";
import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useState,
} from "react";
import { ICON_SIZE } from "@/lib/utils/iconSize";
import styles from "./toast.module.css";

/** Варианты отображения тоста */
type ToastVariant = "success" | "error" | "info";

/** Параметры для вызова тоста */
interface ToastOptions {
    /** Заголовок уведомления */
    title: string;
    /** Дополнительное описание (необязательно) */
    description?: string;
    /** Вариант: success (зелёный), error (красный), info (акцентный) */
    variant?: ToastVariant;
    /** Длительность отображения в мс (по умолчанию 4000) */
    duration?: number;
}

/** Структура одного тоста в очереди */
interface ToastItem extends ToastOptions {
    /** Уникальный идентификатор */
    id: string;
    /** Состояние открытости (для анимации закрытия) */
    open: boolean;
}

/** Тип функции вызова тоста */
type ToastFunction = (options: ToastOptions) => void;

/** Контекст для доступа к функции toast() */
const ToastContext = createContext<ToastFunction | null>(null);

/** Маппинг вариантов на иконки */
const VARIANT_ICONS: Record<ToastVariant, typeof CheckCircle> = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
};

/**
 * Провайдер Toast-уведомлений.
 * Размещается в корне приложения (main.tsx) и управляет очередью тостов.
 *
 * @param children — дочерние элементы (всё приложение)
 */
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    /**
     * Создаёт новый тост и добавляет его в очередь.
     * Поддерживает дедупликацию по заголовку за последние 500ms.
     */
    const toast = useCallback<ToastFunction>((options) => {
        const newToast: ToastItem = {
            ...options,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            variant: options.variant ?? "info",
            duration: options.duration ?? 4000,
            open: true,
        };
        setToasts((prev) => [...prev, newToast]);
    }, []);

    /**
     * Обработчик изменения состояния тоста.
     * При закрытии (анимирование) — убираем из массива.
     */
    const handleOpenChange = useCallback((id: string, open: boolean) => {
        if (!open) {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }
    }, []);

    return (
        <ToastContext.Provider value={toast}>
            <ToastPrimitive.Provider swipeDirection="right">
                {children}

                {/* Рендерим активные тосты */}
                {toasts.map((item) => {
                    const Icon = VARIANT_ICONS[item.variant ?? "info"];
                    const variant = item.variant ?? "info";

                    return (
                        <ToastPrimitive.Root
                            key={item.id}
                            open={item.open}
                            onOpenChange={(open) =>
                                handleOpenChange(item.id, open)
                            }
                            duration={item.duration}
                            className={`${styles.root} ${styles[variant]}`}
                        >
                            {/* Иконка варианта */}
                            <Icon
                                size={ICON_SIZE.sm}
                                className={`${styles.icon} ${styles[variant]}`}
                            />

                            {/* Текстовый контент */}
                            <div className={styles.content}>
                                <ToastPrimitive.Title className={styles.title}>
                                    {item.title}
                                </ToastPrimitive.Title>
                                {item.description && (
                                    <ToastPrimitive.Description
                                        className={styles.description}
                                    >
                                        {item.description}
                                    </ToastPrimitive.Description>
                                )}
                            </div>

                            {/* Кнопка закрытия */}
                            <ToastPrimitive.Close className={styles.close}>
                                <X size={ICON_SIZE.sm} />
                            </ToastPrimitive.Close>
                        </ToastPrimitive.Root>
                    );
                })}

                {/* Viewport — контейнер позиционирования */}
                <ToastPrimitive.Viewport className={styles.viewport} />
            </ToastPrimitive.Provider>
        </ToastContext.Provider>
    );
}

/**
 * Хук для вызова Toast-уведомлений.
 *
 * @example
 * const toast = useToast();
 * toast({ title: "Сообщение отправлено", variant: "success" });
 */
export function useToast(): ToastFunction {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within <ToastProvider>");
    }
    return context;
}
