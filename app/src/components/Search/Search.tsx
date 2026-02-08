import { Box, TextField } from '@radix-ui/themes';
import { Search as SearchIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './search.module.css';

interface SearchProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
}

export function Search({ value, onChange, placeholder }: SearchProps) {
    const { t } = useTranslation();

    return (
        <Box className={styles.searchWrapper}>
            <TextField.Root
                size="2"
                variant="surface"
                placeholder={placeholder || t('common.search', 'Поиск...')}
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                className={styles.textField}
            >
                <TextField.Slot>
                    <SearchIcon size={16} />
                </TextField.Slot>
            </TextField.Root>
        </Box>
    );
}
