"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Camera, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PhotoCaptureArea({
  hint,
  onFileSelected,
  disabled,
}: {
  hint: string;
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    onFileSelected(file);
    e.target.value = "";
  }

  return (
    <div>
      <div className="relative mb-3.5 flex h-56 items-center justify-center overflow-hidden rounded-xl bg-navy">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt="Captured photo"
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="px-8 text-center text-xs leading-relaxed text-white/40">
            <Camera className="mx-auto mb-2 h-7 w-7 text-white/30" />
            {hint}
          </div>
        )}
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />

      <Button
        type="button"
        disabled={disabled}
        onClick={() => cameraInputRef.current?.click()}
        className="h-12 w-full rounded-xl bg-navy font-semibold text-white hover:bg-navy/90"
      >
        <Camera className="h-4 w-4" />
        Take photo
      </Button>
      <Button
        type="button"
        disabled={disabled}
        variant="outline"
        onClick={() => libraryInputRef.current?.click()}
        className="mt-2.5 h-11 w-full rounded-[10px] border-border bg-cloud text-ink hover:bg-cloud/70"
      >
        <ImageIcon className="h-4 w-4" />
        Choose from library
      </Button>
    </div>
  );
}
