import { fireEvent, render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ACTIVE_CALL_STATUS, CALL_TYPE } from "@/lib/constants";
import { CallRoom } from "./CallRoom";

const callStoreState = vi.hoisted(() => ({
    activeSession: null as unknown,
    endCall: vi.fn(),
    toggleMute: vi.fn(),
    toggleVideoMuted: vi.fn(),
    toggleScreenSharing: vi.fn(),
}));

vi.mock("../../store", () => ({
    useCallStore: (selector: (state: typeof callStoreState) => unknown) =>
        selector(callStoreState),
}));

vi.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (_key: string, fallback: string) => fallback,
    }),
}));

vi.mock("@/hooks/useMediaQuery", () => ({
    BREAKPOINTS: { MOBILE: "(max-width: 768px)" },
    useMediaQuery: () => false,
}));

vi.mock("@/components/ui/IconButton", () => ({
    IconButton: ({
        children,
        tooltip,
        onClick,
    }: PropsWithChildren<{ tooltip?: string; onClick?: () => void }>) => (
        <button type="button" title={tooltip} onClick={onClick}>
            {children}
        </button>
    ),
}));

vi.mock("@livekit/components-react", () => ({
    LiveKitRoom: ({ children }: PropsWithChildren) => (
        <div data-testid="livekit-room">{children}</div>
    ),
    RoomAudioRenderer: () => null,
    VideoTrack: () => null,
    useLocalParticipant: () => ({
        isCameraEnabled: false,
        localParticipant: {
            setMicrophoneEnabled: vi.fn().mockResolvedValue(undefined),
            setCameraEnabled: vi.fn().mockResolvedValue(undefined),
            setScreenShareEnabled: vi.fn().mockResolvedValue(undefined),
        },
    }),
    useTracks: () => [],
}));

function setOutgoingCall(endCall = vi.fn(), displayName = "Собеседник") {
    callStoreState.activeSession = {
        status: ACTIVE_CALL_STATUS.CALLING,
        type: CALL_TYPE.AUDIO,
        isInitiator: true,
        roomName: "room-id",
        displayName,
        avatarUrl: null,
        token: "livekit-token",
        serverUrl: "wss://example.test/livekit/",
        callLogId: "call-id",
        isMuted: false,
        isVideoMuted: true,
        isScreenSharing: false,
    };
    callStoreState.endCall = endCall;
}

afterEach(() => {
    callStoreState.activeSession = null;
    vi.clearAllMocks();
});

describe("CallRoom", () => {
    it("подключает инициатора к LiveKit уже в статусе CALLING", () => {
        setOutgoingCall();

        render(<CallRoom />);

        expect(screen.getByTestId("livekit-room")).toBeInTheDocument();
        expect(screen.getByText("Собеседник")).toBeInTheDocument();
    });

    it("вызывает завершение звонка из панели управления", () => {
        const endCall = vi.fn();
        setOutgoingCall(endCall);

        render(<CallRoom />);
        fireEvent.click(screen.getByTitle("Завершить"));

        expect(endCall).toHaveBeenCalledOnce();
    });

    it("не показывает технический roomId без безопасного имени", () => {
        setOutgoingCall(vi.fn(), "");

        render(<CallRoom />);

        expect(screen.getByText("Анонимный собеседник")).toBeInTheDocument();
        expect(screen.queryByText("room-id")).not.toBeInTheDocument();
    });
});
