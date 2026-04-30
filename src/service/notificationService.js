import { adminMessaging } from "../config/firebaseAdmin.js";

// Sends a real-time push notification to a specific device.
export const sendDisasterAlert = async (token, title, message) => {
    const payload = {
        notification: {
            title: title,
            body: message,
        },

        data: {
            click_action: "FLUTTER_NOTIFICATION_CLICK", // For mobile apps
            type: "DISASTER_ALERT"
        },
        token: token 
    };

    try {
        const response = await adminMessaging.send(payload);
        return response;
    } catch (error) {

        // If the token is invalid or expired, we will handle it here.
        console.error("FCM Delivery Error:", error.message);
        return null;
    }
};