import { Controller, Get } from "@nestjs/common";
import { CONTRACTS_HELLO, mockReceipts } from "@corely/contracts";

@Controller()
export class AppController {
  @Get("/health")
  health() {
    return { ok: true, service: "api", time: new Date().toISOString() };
  }

  @Get("/demo")
  demo() {
    const r = mockReceipts[0];
    const formatEUR = (cents: number, locale: string) =>
      new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(cents / 100);
    const vatCents = (totalCents: number, vatRate: number) =>
      Math.round(totalCents - totalCents / (1 + vatRate));
    return {
      contracts: CONTRACTS_HELLO,
      domain: "Corely domain loaded",
      sample: {
        merchant: r?.merchant ?? "N/A",
        total: formatEUR(r?.totalCents ?? 0, "de-DE"),
        vat: formatEUR(vatCents(r?.totalCents ?? 0, r?.vatRate ?? 0), "de-DE"),
      },
    };
  }
}
