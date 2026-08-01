"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}

export function VenueSelect({ name, defaultValue, options }: Props) {
  const [value, setValue] = useState(defaultValue);

  return (
    <Select name={name} value={value} onValueChange={setValue}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
