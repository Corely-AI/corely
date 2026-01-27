import { Injectable } from "@nestjs/common";
import { ReportStrategy } from "./report-strategy.interface";
import { TaxReportType } from "@corely/contracts";

@Injectable()
export class ReportRegistry {
  private strategies: ReportStrategy[] = [];

  register(strategy: ReportStrategy) {
    this.strategies.push(strategy);
  }

  getStrategy(type: TaxReportType, country: string): ReportStrategy {
    const strategy = this.strategies.find((s) => s.type === type && s.countryCode === country);
    if (!strategy) {
      throw new Error(`No report strategy found for type ${type} in country ${country}`);
    }
    return strategy;
  }

  getStrategiesForCountry(country: string): ReportStrategy[] {
    return this.strategies.filter((s) => s.countryCode === country);
  }
}
