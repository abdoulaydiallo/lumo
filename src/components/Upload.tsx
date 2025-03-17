// @/components/Upload.tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Upload as UploadIcon, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { MessageAlert } from "@/components/MessageAlert";
import Image from "next/image";

interface UploadProps {
  onChange: (urls: string[]) => void;
  value?: string[];
  maxSize?: number;
  maxFiles?: number;
  className?: string;
}

export function Upload({
  onChange,
  value = [],
  maxSize = 5,
  maxFiles = 5,
  className,
}: UploadProps) {
  const [open, setOpen] = useState(false);
  const [previews, setPreviews] = useState<{ url: string; file: File }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList) => {
      const fileArray = Array.from(files);
      if (fileArray.length + previews.length + value.length > maxFiles) {
        setMessage({
          text: `Vous ne pouvez uploader que ${maxFiles} images maximum`,
          type: "error",
        });
        return;
      }

      const invalidFiles = fileArray.filter(
        (file) => !file.type.startsWith("image/")
      );
      if (invalidFiles.length > 0) {
        setMessage({ text: "Seules les images sont acceptées", type: "error" });
        return;
      }

      const oversizedFiles = fileArray.filter(
        (file) => file.size / 1024 / 1024 > maxSize
      );
      if (oversizedFiles.length > 0) {
        setMessage({
          text: `Certains fichiers dépassent la limite de ${maxSize} Mo`,
          type: "error",
        });
        return;
      }

      const newPreviews = fileArray.map((file) => ({
        url: URL.createObjectURL(file),
        file,
      }));
      setPreviews((prev) => [...prev, ...newPreviews]);
      setMessage(null);
    },
    [maxSize, maxFiles, previews.length, value.length]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleFiles(files);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) handleFiles(files);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const uploadFiles = async () => {
    if (previews.length === 0) {
      setMessage({ text: "Aucune image à uploader", type: "error" });
      return;
    }

    setIsUploading(true);
    try {
      const uploadPromises = previews.map(async ({ file }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "marketplace_preset");

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: "POST", body: formData }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error.message);
        }

        const data = await response.json();
        return data.secure_url;
      });

      const urls = await Promise.all(uploadPromises);
      onChange([...value, ...urls]);
      setPreviews([]);
      setMessage({ text: "Images uploadées avec succès", type: "success" });
      setTimeout(() => setOpen(false), 1000);
    } catch (error) {
      setMessage({
        text:
          error instanceof Error ? error.message : "Erreur lors de l'upload",
        type: "error",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    if (previews.length > 0 && index >= value.length) {
      const previewIndex = index - value.length;
      URL.revokeObjectURL(previews[previewIndex].url);
      const newPreviews = previews.filter((_, i) => i !== previewIndex);
      setPreviews(newPreviews);
    } else {
      const newValue = value.filter((_, i) => i !== index);
      onChange(newValue);
    }
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full" onClick={handleOpen}>
            {value.length > 0
              ? "Ajouter/Changer des images"
              : "Uploader des images"}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Uploader des images</DialogTitle>
          </DialogHeader>
          <Card
            className={cn(
              "p-4 border-2 border-dashed rounded-lg",
              isUploading
                ? "opacity-50"
                : "bg-background/50 hover:border-primary"
            )}
            onDrop={onDrop}
            onDragOver={onDragOver}
          >
            <div className="flex flex-col items-center space-y-3 text-center">
              <UploadIcon className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Glissez-déposez ou cliquez pour sélectionner des images
              </p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onFileChange}
                disabled={isUploading}
                className="hidden"
                ref={fileInputRef}
              />
              <Button
                variant="outline"
                disabled={isUploading}
                className="cursor-pointer"
                onClick={handleButtonClick}
              >
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Choisir des images"
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                {maxSize} Mo max par fichier, {maxFiles} fichiers max
              </p>
            </div>
          </Card>

          {(previews.length > 0 || value.length > 0) && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              {[...value, ...previews.map((p) => p.url)].map((src, index) => (
                <Card
                  key={index}
                  className="relative w-full h-24 rounded-lg overflow-hidden"
                >
                  <Image
                    src={src}
                    alt={`Image ${index + 1}`}
                    className="w-full h-full object-contain"
                    height={96}
                    width={50}
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 rounded-full"
                    onClick={() => removeImage(index)}
                    disabled={isUploading}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Card>
              ))}
            </div>
          )}

          {message && (
            <MessageAlert message={message.text} type={message.type} />
          )}

          {previews.length > 0 && (
            <Button
              className="w-full mt-4"
              onClick={uploadFiles}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Valider l'upload"
              )}
            </Button>
          )}
        </DialogContent>
      </Dialog>

      {value.length > 0 && !open && (
        <div className="flex gap-2 mt-2">
          {value.map((src, index) => (
            <Image
              key={index}
              src={src}
              alt={`Image ${index + 1}`}
              className="w-24 h-24 object-contain rounded"
              width={96}
              height={96}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Upload;
