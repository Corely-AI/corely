import configPlugins from "@expo/config-plugins";
const { withPlugins } = configPlugins;

/**
 * Stub config plugin for @corely/pos-hardware.
 * Keeps Expo managed workflow intact while enabling custom dev client builds.
 */
export default function withCorelyPosHardware(config) {
  return withPlugins(config, []);
}
