import { Injectable } from '@nestjs/common';
import {
  CalendarDayResponseDto,
  ScheduleExceptionResponseDto,
  WorkingHoursResponseDto,
} from '../dto/schedule-response.dto';
import {
  formatMinutesToTime,
  nullableMinutesToTime,
} from '../helpers/schedule-time.helper';
import { parseBreaksJson } from '../helpers/working-hours-validation.helper';
import {
  RawClinicScheduleException,
  RawClinicWorkingHours,
} from '../selectors/clinic-schedule.select';

@Injectable()
export class ClinicScheduleAdapter {
  adaptWorkingHours(raw: RawClinicWorkingHours): WorkingHoursResponseDto {
    return new WorkingHoursResponseDto({
      id: raw.id,
      dayOfWeek: raw.dayOfWeek,
      isWorkingDay: raw.isWorkingDay,
      startTime: nullableMinutesToTime(raw.startMinute),
      endTime: nullableMinutesToTime(raw.endMinute),
      breaks: parseBreaksJson(raw.breaks).map((item) => ({
        startTime: formatMinutesToTime(item.startMinute),
        endTime: formatMinutesToTime(item.endMinute),
      })),
      updatedAt: raw.updatedAt,
    });
  }

  fromWorkingHoursArray(
    raws: RawClinicWorkingHours[],
  ): WorkingHoursResponseDto[] {
    return raws.map((raw) => this.adaptWorkingHours(raw));
  }

  adaptException(raw: RawClinicScheduleException): ScheduleExceptionResponseDto {
    return new ScheduleExceptionResponseDto({
      id: raw.id,
      date: raw.date.toISOString().slice(0, 10),
      isWorkingDay: raw.isWorkingDay,
      startTime: nullableMinutesToTime(raw.startMinute),
      endTime: nullableMinutesToTime(raw.endMinute),
      breaks: parseBreaksJson(raw.breaks).map((item) => ({
        startTime: formatMinutesToTime(item.startMinute),
        endTime: formatMinutesToTime(item.endMinute),
      })),
      reason: raw.reason,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  fromExceptionsArray(
    raws: RawClinicScheduleException[],
  ): ScheduleExceptionResponseDto[] {
    return raws.map((raw) => this.adaptException(raw));
  }

  adaptCalendarDay(input: {
    date: string;
    isWorkingDay: boolean;
    isBookable: boolean;
  }): CalendarDayResponseDto {
    return new CalendarDayResponseDto(input);
  }
}
