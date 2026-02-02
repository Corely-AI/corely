export function RequireTenant() {
  return function (constructor: new (...args: any[]) => any) {
    Object.defineProperty(constructor.prototype, "requiresTenant", {
      get() {
        return true;
      },
      enumerable: true,
      configurable: true,
    });
  };
}
