import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { getPosDatabase } from "@/lib/pos-db";
import { EngagementService } from "@/services/engagementService";

let engagementServiceInstance: EngagementService | null = null;

export function useEngagementService() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    void initializeService();
  }, []);

  const initializeService = async () => {
    if (Platform.OS === "web") {
      setInitialized(true);
      return;
    }

    if (engagementServiceInstance) {
      setInitialized(true);
      return;
    }

    try {
      const db = await getPosDatabase();
      engagementServiceInstance = new EngagementService(db);
      await engagementServiceInstance.initialize();
      setInitialized(true);
    } catch (error) {
      console.error("Failed to initialize engagement service:", error);
    }
  };

  return {
    engagementService: engagementServiceInstance,
    initialized,
  };
}
