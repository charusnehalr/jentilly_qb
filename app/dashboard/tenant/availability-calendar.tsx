"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import type { MaintenanceRequest } from "@/lib/types";

const timeSlots = ["09:00", "10:00", "11:00", "12:30", "14:00", "15:30", "17:00"];

export function AvailabilityCalendar({
  busyRequests,
  onChange,
  value
}: {
  busyRequests: MaintenanceRequest[];
  onChange: (value: string) => void;
  value: string;
}) {
  const today = startOfDay(new Date());
  const selected = value ? new Date(value) : null;
  const displayMonth = selected ?? today;
  const days = buildMonthDays(displayMonth);
  const selectedDateKey = selected ? dateKey(selected) : "";
  const busyKeys = new Set(
    busyRequests
      .filter((request) => request.assigned_to === "maintenance-1" && request.status !== "completed")
      .map((request) => request.availability_window)
      .filter(Boolean)
      .map((item) => slotKey(new Date(item!)))
  );

  function chooseDate(day: Date) {
    const firstAvailable = timeSlots.find((slot) => !busyKeys.has(`${dateKey(day)}T${slot}`));
    if (firstAvailable) {
      onChange(`${dateKey(day)}T${firstAvailable}`);
    }
  }

  function chooseTime(slot: string) {
    const base = selected ?? today;
    onChange(`${dateKey(base)}T${slot}`);
  }

  return (
    <div className="availability-picker">
      <div className="availability-header">
        <div>
          <h3>Calendar</h3>
          <p>Select a date and time you can be home</p>
        </div>
        <div className="availability-mode">
          <CalendarDays size={16} />
          Month view
        </div>
      </div>

      <div className="availability-body">
        <div className="availability-month">
          <div className="month-nav">
            <button aria-label="Previous month" disabled type="button">
              <ChevronLeft size={18} />
            </button>
            <strong>
              {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(displayMonth)}
            </strong>
            <button aria-label="Next month" disabled type="button">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="weekday-row">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="month-grid">
            {days.map((day) => {
              const isPast = startOfDay(day).getTime() < today.getTime();
              const isSelected = dateKey(day) === selectedDateKey;
              const isToday = dateKey(day) === dateKey(today);

              return (
                <button
                  className={[
                    "date-cell",
                    isSelected ? "selected" : "",
                    isToday ? "today" : "",
                    isPast ? "disabled" : ""
                  ].join(" ")}
                  disabled={isPast}
                  key={day.toISOString()}
                  onClick={() => chooseDate(day)}
                  type="button"
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <button className="today-button" onClick={() => chooseDate(today)} type="button">
            Today
          </button>
        </div>

        <div className="availability-times">
          <div>
            <p className="eyebrow">Available times</p>
            <h3>{selected ? formatDate(selected) : "No date selected"}</h3>
          </div>
          <div className="time-slot-list">
            {timeSlots.map((slot) => {
              const base = selected ?? today;
              const disabled = busyKeys.has(`${dateKey(base)}T${slot}`);
              const active = value === `${dateKey(base)}T${slot}`;

              return (
                <button
                  className={active ? "time-slot active" : "time-slot"}
                  disabled={disabled}
                  key={slot}
                  onClick={() => chooseTime(slot)}
                  type="button"
                >
                  <span>{formatSlot(slot)}</span>
                  <small>{disabled ? "Unavailable" : "Available"}</small>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function buildMonthDays(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);

  return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function slotKey(date: Date) {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${dateKey(date)}T${hour}:${minute}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function formatSlot(slot: string) {
  const [hour, minute] = slot.split(":").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(2026, 0, 1, hour, minute));
}

