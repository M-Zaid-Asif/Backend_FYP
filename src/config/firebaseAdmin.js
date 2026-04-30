import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import serviceAccount from "./firebase-service-account.json" with { type: "json" };

// Initializing the Admin SDK
const app = initializeApp({
  credential: cert(serviceAccount)
});

// Export the messaging service for use in controllers
export const adminMessaging = getMessaging(app);

export default app;