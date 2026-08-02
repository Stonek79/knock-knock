import { useTranslation } from "react-i18next";
import { Dialog } from "@/components/ui/Dialog";
import { CREATE_GROUP_STEPS } from "@/lib/constants";
import { useCreateGroup } from "../../hooks/useCreateGroup";
import { ResultView } from "./ResultView";
import { SettingsView } from "./SettingsView";

interface CreateGroupDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateGroupDialog({
    open,
    onOpenChange,
}: CreateGroupDialogProps) {
    const { t } = useTranslation();

    const state = useCreateGroup({ onOpenChange });

    return (
        <Dialog.Root open={open} onOpenChange={state.handleOpenChange}>
            <Dialog.Content>
                <Dialog.Title>
                    {state.step === CREATE_GROUP_STEPS.SETTINGS
                        ? t("chat.newGroup", "Новая группа")
                        : t("chat.groupCreated", "Группа создана")}
                </Dialog.Title>

                {state.step === CREATE_GROUP_STEPS.SETTINGS ? (
                    <SettingsView state={state} />
                ) : (
                    <ResultView state={state} />
                )}
            </Dialog.Content>
        </Dialog.Root>
    );
}
