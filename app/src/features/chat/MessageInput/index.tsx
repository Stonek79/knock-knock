/**
 * Компонент ввода сообщения.
 * Оптимизирован для мобильных устройств и десктопа.
 */
import { IconButton, TextArea } from "@radix-ui/themes";
import { Mic, Paperclip, SendHorizontal, Smile } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMessageInput } from "@/features/chat/hooks/useMessageInput";
import styles from "./message-input.module.css";

interface MessageInputProps {
	/** Коллбэк отправки сообщения */
	onSend: (text: string) => Promise<void>;
	/** Коллбэк отмены (Escape) */
	onCancel?: () => void;
	/** Флаг блокировки ввода */
	disabled?: boolean;
	/** Начальное значение (для редактирования) */
	initialValue?: string | null;
	/** Коллбэк при изменении ввода (для скролла) */
	onInputChange?: () => void;
}

export function MessageInput({
	onSend,
	onCancel,
	disabled,
	initialValue,
	onInputChange,
}: MessageInputProps) {
	const { t } = useTranslation();

	const {
		message,
		setMessage,
		sending,
		textareaRef,
		hasText,
		handleSend,
		handleKeyDown,
	} = useMessageInput({
		onSend,
		onCancel,
		disabled,
		initialValue: initialValue ?? undefined,
	});

	return (
		<div className={styles.inputWrapper}>
			{/* Кнопка эмодзи */}
			<IconButton
				variant="ghost"
				color="gray"
				radius="full"
				disabled={disabled}
				type="button"
				size="3"
				className={styles.actionButton}
			>
				<Smile size={20} />
			</IconButton>

			{/* Кнопка вложения */}
			<IconButton
				variant="ghost"
				color="gray"
				radius="full"
				disabled={disabled}
				type="button"
				size="3"
				className={styles.actionButton}
			>
				<Paperclip size={20} />
			</IconButton>

			{/* Поле ввода */}
			<div className={styles.textAreaContainer}>
				<TextArea
					ref={textareaRef}
					placeholder={t("chat.typeMessage", "Сообщение")}
					value={message}
					onChange={(e) => {
						setMessage(e.target.value);
						onInputChange?.();
					}}
					onKeyDown={handleKeyDown}
					disabled={disabled || sending}
					className={styles.textArea}
					size="3"
					variant="soft"
				/>
			</div>

			{/* Кнопка отправки / микрофон */}
			{hasText ? (
				<IconButton
					size="3"
					radius="full"
					variant="ghost" // Unify style
					onClick={handleSend}
					disabled={disabled || sending}
					className={styles.actionButton}
					aria-label={t("chat.send", "Отправить")}
					color="blue"
				>
					<SendHorizontal size={20} />
				</IconButton>
			) : (
				<IconButton
					variant="ghost"
					color="gray"
					radius="full"
					disabled={disabled}
					type="button"
					size="3"
					className={styles.actionButton}
				>
					<Mic size={22} />
				</IconButton>
			)}
		</div>
	);
}
