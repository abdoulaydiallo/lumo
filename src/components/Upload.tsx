"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Upload as UploadIcon, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageAlert } from "@/components/MessageAlert";

/**
 * Props pour le composant Upload.
 */
interface UploadProps {
  onUpload: (urls: string[]) => void;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number;
  className?: string;
}

/**
 * Composant Upload avec bouton fonctionnel et design affiné.
 * @param {UploadProps} props - Propriétés du composant.
 * @returns {JSX.Element} - Interface d'upload moderne.
 */
export function Upload({
  onUpload,
  multiple = false,
  maxFiles = multiple ? 5 : 1,
  maxSize = 5,
  className,
}: UploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const handleFiles = useCallback(
    (newFiles: File[]) => {
      const validFiles: File[] = [];
      const newPreviews: string[] = [];

      for (const file of newFiles) {
        if (!file.type.startsWith("image/")) {
          setMessage({
            text: `${file.name} n'est pas une image`,
            type: "error",
          });
          continue;
        }

        const sizeInMb = file.size / 1024 / 1024;
        if (sizeInMb > maxSize) {
          setMessage({
            text: `${file.name} dépasse ${maxSize} Mo`,
            type: "error",
          });
          continue;
        }

        if (validFiles.length + files.length >= maxFiles) {
          setMessage({
            text: `Limite de ${maxFiles} fichier(s) atteinte`,
            type: "error",
          });
          break;
        }

        validFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      }

      setFiles((prev) => [...prev, ...validFiles]);
      setPreviews((prev) => [...prev, ...newPreviews]);
    },
    [files, maxFiles, maxSize]
  );

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File input changed"); // Log pour déboguer
    const selectedFiles = Array.from(e.target.files || []);
    console.log("Selected files:", selectedFiles); // Vérifier les fichiers
    if (selectedFiles.length > 0) {
      handleFiles(selectedFiles);
    }
    e.target.value = ""; // Réinitialiser
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(previews[index]);
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      setMessage({ text: "Aucun fichier à uploader", type: "error" });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "marketplace_preset");

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            `Échec de l'upload pour ${file.name}: ${errorData.error.message}`
          );
        }

        const data = await response.json();
        return data.secure_url;
      });

      const urls = await Promise.all(uploadPromises);
      onUpload(urls);
      setMessage({
        text: `${urls.length} image(s) uploadée(s) avec succès`,
        type: "success",
      });
      setFiles([]);
      setPreviews([]);
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "Erreur inattendue",
        type: "error",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Card
        className={cn(
          "p-6 border-2 border-dashed rounded-xl bg-background/50 shadow-sm transition-all duration-300",
          isDragging
            ? "border-primary bg-primary/10 scale-105"
            : "border-muted hover:border-muted-foreground/50"
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="flex flex-col items-center justify-center space-y-3 text-center">
          <UploadIcon className="h-10 w-10 text-muted-foreground transition-transform duration-300 group-hover:scale-110" />
          <p className="text-sm font-medium text-muted-foreground">
            {isDragging
              ? "Déposez vos images ici"
              : "Glissez-déposez ou cliquez pour ajouter des images"}
          </p>
          <input
            type="file"
            accept="image/*"
            multiple={multiple}
            onChange={onFileChange}
            className="hidden"
            id="file-upload"
            disabled={isUploading}
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Button
              variant="outline"
              className="group transition-all duration-200 hover:bg-primary hover:text-primary-foreground"
              disabled={isUploading}
              asChild
            >
              <span>Choisir des fichiers</span>
            </Button>
          </label>
          <p className="text-xs text-muted-foreground/80">
            {multiple ? `Jusqu'à ${maxFiles} fichiers, ` : "1 fichier, "}{" "}
            {maxSize} Mo max par fichier
          </p>
        </div>
      </Card>

      {previews.length > 0 && (
        <div className="flex overflow-x-auto gap-4 pb-2 snap-x snap-mandatory">
          {previews.map((preview, index) => (
            <Card
              key={index}
              className="relative flex-shrink-0 w-32 h-32 sm:w-40 sm:h-40 rounded-lg shadow-md overflow-hidden group snap-center"
            >
              <img
                src={preview}
                alt={`Prévisualisation ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                onClick={() => removeFile(index)}
                disabled={isUploading}
              >
                <X className="h-3 w-3" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      {previews.length > 0 && (
        <Button
          onClick={uploadFiles}
          disabled={isUploading}
          className="w-full rounded-lg py-2 transition-all duration-200 hover:shadow-md"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Upload en cours...
            </>
          ) : (
            `Uploader ${previews.length} image${previews.length > 1 ? "s" : ""}`
          )}
        </Button>
      )}

      {message && <MessageAlert message={message.text} type={message.type} />}
    </div>
  );
}

export default Upload;
