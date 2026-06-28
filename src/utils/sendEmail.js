import { MailtrapClient } from "mailtrap";

export const sendEmail = async (options) => {
    // Initializing the client with the token securely saved in our environment variables
    const client = new MailtrapClient({
        token: process.env.MAILTRAP_TOKEN, 
    });

    const sender = {
        email: "hello@demomailtrap.co", 
        name: "FAEAS Security",
    };

    const recipients = [
        {
            email: options.email, // Dynamically set from the controller
        }
    ];

    // Executing the send method
    await client.send({
        from: sender,
        to: recipients,
        subject: options.subject,
        text: options.message,
        category: "Password Reset Request",
    });
};