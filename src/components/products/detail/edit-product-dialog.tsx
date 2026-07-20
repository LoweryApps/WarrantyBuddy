"use client";

import { useState } from "react";
import { AuthInput } from "@/components/auth/auth-input";
import { CategorySelect } from "@/components/products/category-select";
import type { ProductRecord } from "@/components/products/detail/types";
import { RoomLocationField } from "@/components/products/room-location-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function EditProductDialog({
  product,
  open,
  onOpenChange,
  onSaved,
}: {
  product: ProductRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(product.name);
  const [brand, setBrand] = useState(product.brand ?? "");
  const [modelNumber, setModelNumber] = useState(product.model_number ?? "");
  const [serialNumber, setSerialNumber] = useState(product.serial_number ?? "");
  const [category, setCategory] = useState(product.category);
  const [vin, setVin] = useState(product.vin ?? "");
  const [modelYear, setModelYear] = useState(
    product.model_year !== null ? String(product.model_year) : "",
  );
  const [roomLocation, setRoomLocation] = useState(product.room_location ?? "");
  const [quantity, setQuantity] = useState(String(product.quantity));
  const [purchaseDate, setPurchaseDate] = useState(product.purchase_date ?? "");
  const [purchasePrice, setPurchasePrice] = useState(
    product.purchase_price !== null ? String(product.purchase_price) : "",
  );
  const [retailer, setRetailer] = useState(product.retailer ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = name.trim() && brand.trim() && category;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("products")
      .update({
        name: name.trim(),
        brand: brand.trim(),
        model_number: modelNumber.trim() || null,
        serial_number: serialNumber.trim() || null,
        category,
        vin: category === "Vehicle" ? vin.trim() || null : null,
        model_year: category === "Vehicle" && modelYear ? Number(modelYear) : null,
        room_location: roomLocation.trim() || null,
        quantity: quantity ? Number(quantity) : 1,
        purchase_date: purchaseDate || null,
        purchase_price: purchasePrice ? Number(purchasePrice) : null,
        retailer: retailer.trim() || null,
      })
      .eq("id", product.id);

    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-base font-bold text-navy">
            Edit product
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3.5 py-1">
          {error ? (
            <Alert className="border-red/30 bg-red/5 text-red">
              <AlertDescription className="text-red">{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-ink">
              Product name <span className="text-red">*</span>
            </Label>
            <AuthInput value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-ink">
                {category === "Vehicle" ? "Make" : "Brand"} <span className="text-red">*</span>
              </Label>
              <AuthInput value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-ink">Model number</Label>
              <AuthInput value={modelNumber} onChange={(e) => setModelNumber(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-ink">Serial number</Label>
            <AuthInput value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-ink">
              Category <span className="text-red">*</span>
            </Label>
            <CategorySelect value={category} onChange={setCategory} />
          </div>

          {category === "Vehicle" ? (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-ink">VIN</Label>
                <AuthInput value={vin} onChange={(e) => setVin(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-ink">Model year</Label>
                <AuthInput
                  type="number"
                  inputMode="numeric"
                  value={modelYear}
                  onChange={(e) => setModelYear(e.target.value)}
                />
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-ink">Room / location</Label>
              <RoomLocationField value={roomLocation} onChange={setRoomLocation} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-ink">Quantity</Label>
              <AuthInput
                type="number"
                min={1}
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-ink">Purchase date</Label>
              <AuthInput
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-ink">Price paid</Label>
              <AuthInput
                type="number"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-ink">Retailer</Label>
            <AuthInput value={retailer} onChange={(e) => setRetailer(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={!canSave || saving}
            onClick={handleSave}
            className="h-11 w-full rounded-[10px] bg-teal font-semibold text-navy hover:bg-teal/90"
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
