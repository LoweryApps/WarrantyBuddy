"use client";

import { useState } from "react";
import { AuthInput } from "@/components/auth/auth-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRESET_ROOMS = ["Kitchen", "Living Room", "Garage", "Home Office", "Bedroom"];

export function RoomLocationField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [customMode, setCustomMode] = useState(!!value && !PRESET_ROOMS.includes(value));

  if (customMode) {
    return (
      <AuthInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Basement"
      />
    );
  }

  return (
    <Select
      value={value || null}
      onValueChange={(v) => {
        if (v === "Other") {
          setCustomMode(true);
          onChange("");
        } else {
          onChange(v ?? "");
        }
      }}
    >
      <SelectTrigger className="h-11 w-full rounded-[10px] border-border bg-white px-3 text-sm data-placeholder:text-muted-foreground">
        <SelectValue placeholder="Select a room (optional)" />
      </SelectTrigger>
      <SelectContent>
        {PRESET_ROOMS.map((room) => (
          <SelectItem key={room} value={room}>
            {room}
          </SelectItem>
        ))}
        <SelectItem value="Other">Other</SelectItem>
      </SelectContent>
    </Select>
  );
}
