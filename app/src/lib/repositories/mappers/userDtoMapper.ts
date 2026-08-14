import { DB_TABLES, PROFILE_TYPE, USER_FIELDS } from "../../constants";
import { pb } from "../../pocketbase";
import type {
    AdminUserDto,
    ContactProfileDto,
    Profile,
    ProfileSecurityKeyDto,
    PublicProfileSearchDto,
    UserSecurityKeys,
} from "../../types";
import { isRecord } from "../../utils/guards";

const ANONYMOUS_DISPLAY_NAME = "Anonymous";

const parseArray = <T>(
    value: unknown,
    isItem: (item: unknown) => item is T,
    message: string,
): T[] => {
    if (!Array.isArray(value) || !value.every(isItem)) {
        throw new Error(message);
    }
    return value;
};

export const isPublicProfileSearchDto = (
    value: unknown,
): value is PublicProfileSearchDto =>
    isRecord(value) &&
    typeof value.id === "string" &&
    value.profile_type === PROFILE_TYPE.PUBLIC &&
    typeof value.username === "string" &&
    typeof value.display_name === "string" &&
    typeof value.avatar === "string";

export const isContactProfileDto = (
    value: unknown,
): value is ContactProfileDto => {
    if (!isRecord(value) || typeof value.id !== "string") {
        return false;
    }

    if (value.profile_type === PROFILE_TYPE.PRIVATE) {
        return true;
    }

    return (
        value.profile_type === PROFILE_TYPE.PUBLIC &&
        typeof value.username === "string" &&
        typeof value.display_name === "string" &&
        typeof value.avatar === "string" &&
        typeof value.status === "string" &&
        typeof value.last_seen === "string"
    );
};

export const isAdminUserDto = (value: unknown): value is AdminUserDto =>
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.profile_type === PROFILE_TYPE.PUBLIC ||
        value.profile_type === PROFILE_TYPE.PRIVATE) &&
    typeof value.username === "string" &&
    typeof value.display_name === "string" &&
    typeof value.created === "string" &&
    (value.banned_until === null || typeof value.banned_until === "string");

export const parseSecurityKeyResponse = (
    value: unknown,
): ProfileSecurityKeyDto[] =>
    parseArray(
        value,
        (entry): entry is ProfileSecurityKeyDto => {
            return (
                isRecord(entry) &&
                typeof entry.id === "string" &&
                typeof entry.public_key_x25519 === "string" &&
                typeof entry.public_key_signing === "string" &&
                entry.public_key_x25519.trim().length > 0 &&
                entry.public_key_signing.trim().length > 0
            );
        },
        "Invalid users keys DTO",
    ).map((entry) => ({
        ...entry,
        public_key_x25519: entry.public_key_x25519.trim(),
        public_key_signing: entry.public_key_signing.trim(),
    }));

export const parsePublicProfileSearchResponse = (value: unknown) =>
    parseArray(
        value,
        isPublicProfileSearchDto,
        "Некорректный ответ поиска пользователей",
    );

export const parseContactProfileResponse = (value: unknown) =>
    parseArray(value, isContactProfileDto, "Некорректный ответ контактов");

export const parseAdminUserResponse = (value: unknown) =>
    parseArray(
        value,
        isAdminUserDto,
        "Некорректный ответ списка пользователей",
    );

export const parseOwnSecurityKeyState = (value: unknown): UserSecurityKeys => {
    if (!isRecord(value)) {
        throw new Error("Некорректный ответ собственного состояния ключей");
    }

    const x25519 = value[USER_FIELDS.PUBLIC_KEY_X25519];
    const signing = value[USER_FIELDS.PUBLIC_KEY_SIGNING];
    if (
        (x25519 !== undefined && typeof x25519 !== "string") ||
        (signing !== undefined && typeof signing !== "string")
    ) {
        throw new Error("Некорректный ответ собственного состояния ключей");
    }

    return {
        [USER_FIELDS.PUBLIC_KEY_X25519]: x25519 ?? "",
        [USER_FIELDS.PUBLIC_KEY_SIGNING]: signing ?? "",
    };
};

const toAvatarUrl = (id: string, avatar: string): string | null => {
    if (!avatar) {
        return null;
    }

    return pb.files.getURL(
        {
            collectionName: DB_TABLES.USERS,
            id,
        },
        avatar,
    );
};

const profileBase = (
    id: string,
    profileType: Profile["profile_type"],
): Pick<
    Profile,
    "id" | "email" | "profile_type" | "is_agreed_to_rules" | "settings"
> => ({
    id,
    email: null,
    profile_type: profileType,
    is_agreed_to_rules: false,
    settings: undefined,
});

export const UserDtoMapper = {
    toPublicProfile: (value: PublicProfileSearchDto): Profile => ({
        ...profileBase(value.id, value.profile_type),
        username: value.username,
        display_name:
            value.display_name || value.username || ANONYMOUS_DISPLAY_NAME,
        avatar_url: toAvatarUrl(value.id, value.avatar),
        status: undefined,
        last_seen: undefined,
        banned_until: null,
        created_at: undefined,
    }),

    toContactProfile: (value: ContactProfileDto): Profile => {
        if (value.profile_type === PROFILE_TYPE.PRIVATE) {
            return {
                ...profileBase(value.id, value.profile_type),
                username: "",
                display_name: ANONYMOUS_DISPLAY_NAME,
                avatar_url: null,
                status: undefined,
                last_seen: undefined,
                banned_until: null,
                created_at: undefined,
            };
        }

        return {
            ...profileBase(value.id, value.profile_type),
            username: value.username,
            display_name:
                value.display_name || value.username || ANONYMOUS_DISPLAY_NAME,
            avatar_url: toAvatarUrl(value.id, value.avatar),
            status: value.status,
            last_seen: value.last_seen,
            banned_until: null,
            created_at: undefined,
        };
    },

    toAdminProfile: (value: AdminUserDto): Profile => ({
        ...profileBase(value.id, value.profile_type),
        username: value.username,
        display_name:
            value.display_name || value.username || ANONYMOUS_DISPLAY_NAME,
        avatar_url: null,
        status: undefined,
        last_seen: undefined,
        banned_until: value.banned_until,
        created_at: value.created,
    }),
};
