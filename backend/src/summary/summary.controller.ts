import { Controller, Get, Query } from "@nestjs/common";
import { SummaryService } from "./summary.service";

@Controller("summary")
export class SummaryController {
  constructor(private readonly summary: SummaryService) {}

  @Get("dashboard")
  dashboard() {
    return this.summary.dashboard();
  }

  @Get("monthly")
  monthly(@Query("year") year?: string, @Query("month") month?: string) {
    return this.summary.monthly(year ? Number(year) : undefined, month ? Number(month) : undefined);
  }
}
