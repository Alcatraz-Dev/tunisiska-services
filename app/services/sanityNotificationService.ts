export const sanityNotificationService = {
  processNotification: async (documentId: string, document: any) => {
    try {
      const response = await fetch("https://your-server.com/sendNotification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(document),
      });

      const data = await response.json();
      return data;
    } catch (err: any) {
      console.error("Notification service error:", err);
      return { success: false, message: err.message };
    }
  },
};