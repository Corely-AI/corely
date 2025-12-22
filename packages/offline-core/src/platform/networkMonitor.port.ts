export type NetworkStatus = "ONLINE" | "OFFLINE";

export type NetworkSubscription = () => void;

export interface NetworkMonitor {
  getCurrent(): Promise<NetworkStatus>;
  subscribe(cb: (status: NetworkStatus) => void): NetworkSubscription;
}
