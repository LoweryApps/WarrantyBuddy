import { Barcode, Camera, PenLine, Receipt } from "lucide-react";
import type { InputMethod } from "@/components/products/types";

const METHODS: {
  id: InputMethod;
  icon: typeof Barcode;
  name: string;
  description: string;
}[] = [
  {
    id: "barcode",
    icon: Barcode,
    name: "Scan barcode",
    description: "Point at the product barcode — Buddy finds it instantly",
  },
  {
    id: "label",
    icon: Camera,
    name: "Label photo",
    description: "Snap the label on the back or bottom of the product",
  },
  {
    id: "receipt",
    icon: Receipt,
    name: "Receipt photo",
    description: "Photograph your paper or printed receipt",
  },
  {
    id: "manual",
    icon: PenLine,
    name: "Enter manually",
    description: "Type in the product name, model, and details",
  },
];

export function ChooseMethod({ onSelect }: { onSelect: (method: InputMethod) => void }) {
  return (
    <div className="p-4">
      <div className="mb-2.5 text-[10px] tracking-wide text-ink uppercase">
        How do you want to add it?
      </div>
      <div className="flex flex-col gap-2.5">
        {METHODS.map(({ id, icon: Icon, name, description }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className="flex items-center gap-3 rounded-xl border border-border bg-white p-3.5 text-left transition-colors hover:border-teal"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-teal/10 text-teal">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[13px] font-medium text-navy">{name}</div>
              <div className="mt-0.5 text-[11px] leading-snug text-ink">{description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
