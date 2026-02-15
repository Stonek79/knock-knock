import { Flex, Spinner } from "@radix-ui/themes";

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
            style={{
                width: "100%",
                height: "100%",
                minHeight: "200px",
            }}
        >
            <Spinner size="3" />
        </Flex>
    );
}
