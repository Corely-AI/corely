import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { getPosDatabase } from "@/lib/pos-db";
import { PosLocalService } from "@/services/posLocalService";
import { getWebPosLocalService } from "@/services/posLocalServiceWeb";

let posLocalServiceInstance: PosLocalService | null = null;
let posLocalServiceWebInstance: PosLocalService | null = null;

export function usePosLocalService() {
  if (Platform.OS === "web" && !posLocalServiceWebInstance) {
    posLocalServiceWebInstance = getWebPosLocalService() as unknown as PosLocalService;
  }

  const [initialized, setInitialized] = useState(
    Platform.OS === "web" ? Boolean(posLocalServiceWebInstance) : false
  );

  useEffect(() => {
    void initialize();
  }, []);

  const initialize = async () => {
    if (Platform.OS === "web") {
      setInitialized(true);
      return;
    }

    if (posLocalServiceInstance) {
      setInitialized(true);
      return;
    }

    const db = await getPosDatabase();
    posLocalServiceInstance = new PosLocalService(db);
    setInitialized(true);
  };

  return {
    initialized: Platform.OS === "web" ? true : initialized,
    service: Platform.OS === "web" ? posLocalServiceWebInstance : posLocalServiceInstance,
  };
}

export async function getPosLocalService(): Promise<PosLocalService> {
  if (Platform.OS === "web") {
    if (!posLocalServiceWebInstance) {
      posLocalServiceWebInstance = getWebPosLocalService() as unknown as PosLocalService;
    }
    return posLocalServiceWebInstance;
  }

  if (posLocalServiceInstance) {
    return posLocalServiceInstance;
  }
  const db = await getPosDatabase();
  posLocalServiceInstance = new PosLocalService(db);
  return posLocalServiceInstance;
}
