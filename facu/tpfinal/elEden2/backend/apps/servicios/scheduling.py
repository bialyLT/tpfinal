from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, time, timedelta

from django.utils import timezone


WORK_WINDOWS = (
    (time(8, 0), time(12, 0)),
    (time(16, 0), time(20, 0)),
)


@dataclass(frozen=True)
class WorkScheduleResult:
    start_local: datetime
    end_local: datetime
    duration_hours: int


def ceil_hours_from_minutes(total_minutes: int) -> int:
    if total_minutes <= 0:
        return 0
    return int(math.ceil(total_minutes / 60.0))


def _ceil_to_next_hour(dt_local: datetime) -> datetime:
    if dt_local.minute == 0 and dt_local.second == 0 and dt_local.microsecond == 0:
        return dt_local
    dt_local = dt_local.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    return dt_local


def _is_within_windows(dt_local: datetime) -> bool:
    t = dt_local.timetz().replace(tzinfo=None)
    return any(start <= t < end for start, end in WORK_WINDOWS)


def normalize_start_to_working_time(dt_aware: datetime) -> datetime:
    """Normalize an aware datetime to the next available working hour.

    - Works in project local timezone.
    - Rounds up to the next hour.
    - Moves to next window start if outside working hours.
    """

    if timezone.is_naive(dt_aware):
        dt_aware = timezone.make_aware(dt_aware, timezone.get_current_timezone())

    dt_local = timezone.localtime(dt_aware)
    dt_local = _ceil_to_next_hour(dt_local)

    while not _is_within_windows(dt_local):
        t = dt_local.timetz().replace(tzinfo=None)

        if t < time(8, 0):
            dt_local = dt_local.replace(hour=8, minute=0, second=0, microsecond=0)
        elif time(12, 0) <= t < time(16, 0):
            dt_local = dt_local.replace(hour=16, minute=0, second=0, microsecond=0)
        elif t >= time(20, 0):
            next_day = (dt_local + timedelta(days=1)).date()
            dt_local = dt_local.replace(
                year=next_day.year,
                month=next_day.month,
                day=next_day.day,
                hour=8,
                minute=0,
                second=0,
                microsecond=0,
            )
        else:
            # Between windows but not caught above (defensive)
            dt_local = _ceil_to_next_hour(dt_local)

    return dt_local


def add_working_hours(start_local: datetime, hours: int) -> datetime:
    """Add whole hours across working windows, skipping non-working time."""

    current = start_local
    remaining = int(hours)

    if remaining <= 0:
        return current

    current = normalize_start_to_working_time(current)

    while remaining > 0:
        if not _is_within_windows(current):
            current = normalize_start_to_working_time(current)
            continue

        t = current.timetz().replace(tzinfo=None)
        if time(8, 0) <= t < time(12, 0):
            window_end = current.replace(hour=12, minute=0, second=0, microsecond=0)
        else:
            window_end = current.replace(hour=20, minute=0, second=0, microsecond=0)

        available_hours = int((window_end - current).total_seconds() // 3600)
        if available_hours <= 0:
            current = normalize_start_to_working_time(current + timedelta(hours=1))
            continue

        step = min(available_hours, remaining)
        current = current + timedelta(hours=step)
        remaining -= step

        if remaining > 0:
            current = normalize_start_to_working_time(current)

    return current


def compute_work_schedule(start_dt: datetime | None, duration_minutes: int) -> WorkScheduleResult:
    """Compute start/end schedule given a start datetime and duration (minutes).

    Returns localized datetimes in project timezone.
    """

    start_dt = start_dt or timezone.now()

    if timezone.is_naive(start_dt):
        start_dt = timezone.make_aware(start_dt, timezone.get_current_timezone())

    duration_hours = ceil_hours_from_minutes(int(duration_minutes))
    start_local = normalize_start_to_working_time(start_dt)
    end_local = add_working_hours(start_local, duration_hours)

    return WorkScheduleResult(start_local=start_local, end_local=end_local, duration_hours=duration_hours)
