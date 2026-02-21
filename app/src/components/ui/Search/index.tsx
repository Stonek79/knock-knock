import { Search as SearchIcon } from "lucide-react";
import { type InputHTMLAttributes, useId } from "react";
import { useTranslation } from "react-i18next";
import styles from "./search.module.css";

/**
 * Пропсы компонента Search.
 */
export interface SearchProps
    extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
    /** Текущее значение */
    value?: string;
    /** Обработчик изменения значения */
    onChange?: (value: string) => void;
}

/**
 * UI-компонент строки поиска.
 * Нативный input с иконкой, стилизованный через дизайн-систему.
 * Иконка задаётся через CSS (width/height), а не SVG-атрибут size.
 *
 * @example
 * <Search value={query} onChange={setQuery} />
 * <Search placeholder="Найти контакт..." />
 */
export function Search({
    value,
    onChange,
    placeholder,
    className,
    id: externalId,
    ...props
}: SearchProps) {
    const { t } = useTranslation();
    const generatedId = useId();
    const inputId = externalId ?? generatedId;

    return (
        <div
            className={`${styles.searchWrapper}${className ? ` ${className}` : ""}`}
        >
            <label htmlFor={inputId} className={styles.searchField}>
                {/* Иконка через CSS-класс, не через SVG size-атрибут */}
                <SearchIcon className={styles.searchIcon} />
                <input
                    id={inputId}
                    type="search"
                    className={styles.searchInput}
                    value={value}
                    onChange={(e) => onChange?.(e.target.value)}
                    placeholder={placeholder ?? t("common.search", "Поиск")}
                    {...props}
                />
            </label>
        </div>
    );
}
