import { Flex } from "@/components/layout/Flex";
import { Spinner } from "@/components/ui/Spinner";
import styles from "./section-loader.module.css";

/**
 * Лёгкий инлайновый лоадер для секций.
 * Используется как fallback в Suspense и pendingComponent TanStack Router.
 * В отличие от GlobalLoader НЕ перекрывает весь экран.
 */
export function SectionLoader() {
    return (
        <Flex
            align="center"
            justify="center"
            className={styles.loaderContainer}
        >
            <Spinner size="md" />
        </Flex>
    );
}
