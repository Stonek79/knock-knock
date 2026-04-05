import { authRepository } from "@/lib/repositories/auth.repository";
import { pushRepository } from "@/lib/repositories/push.repository";

export const pushService = {
    saveSubscription: async (subscription: PushSubscription) => {
        const user = authRepository.getCurrentUser();
        if (!user) {
            throw new Error("Пользователь не авторизован");
        }

        const subObj = subscription.toJSON();

        const data = {
            user_id: user.id,
            endpoint: subObj.endpoint || "",
            p256dh: subObj.keys?.p256dh || "",
            auth: subObj.keys?.auth || "",
        };

        const existingRes = await pushRepository.findByEndpoint(data.endpoint);

        if (existingRes.isOk() && existingRes.value) {
            return pushRepository.update(existingRes.value.id, data);
        } else {
            return pushRepository.create(data);
        }
    },

    deleteSubscription: async (endpoint: string) => {
        const existingRes = await pushRepository.findByEndpoint(endpoint);
        if (existingRes.isOk() && existingRes.value) {
            return pushRepository.delete(existingRes.value.id);
        }
        return existingRes;
    },
};
