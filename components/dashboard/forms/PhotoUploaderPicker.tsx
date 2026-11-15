"use client";

import React, { useState, useRef, useMemo } from "react";
import { FileUpload, type FileUploadSelectEvent } from "primereact/fileupload";
import { Button } from "primereact/button";
import { Image } from "primereact/image";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";

/**
 * A single-image picker with a live preview.
 *
 * The value it writes into the form is a small envelope rather than a bare File, because
 * the dialog has to tell three cases apart when it builds the request:
 *
 *   { status: "new", file } to upload it
 *   { status: "existing" } to the saved photo, untouched: send nothing
 *   null to the user removed it: send `remove_photo`
 *
 * Without the middle case an edit that never touched the photo looks identical to one that
 * cleared it, and saving any other field would silently drop the picture.
 */
export interface UploadedPhoto {
  file?: File;
  previewUrl: string;
  status: "new" | "existing";
}

interface PhotoUploaderPickerProps {
  /**
   * Hands the picked photo to the form: `(v) => setValue("photo", v)`. A callback rather than
   * react-hook-form's `setValue` itself, whose type depends on each form's shape.
   */
  onChange: (value: UploadedPhoto | null) => void;
  photo?: UploadedPhoto | null;
  /** The stored photo URL when editing. */
  existingPhoto?: string | null;
  label?: string;
}

const MAX_BYTES = 5 * 1024 * 1024;

const PhotoUploaderPicker: React.FC<PhotoUploaderPickerProps> = ({
  onChange,
  photo = null,
  existingPhoto = null,
  label = "Photo",
}) => {
  const initialPhoto: UploadedPhoto | null = useMemo(() => {
    if (photo) return photo;
    if (existingPhoto) return { previewUrl: existingPhoto, status: "existing" };
    return null;
  }, [photo, existingPhoto]);

  const [currentPhoto, setCurrentPhoto] = useState<UploadedPhoto | null>(
    initialPhoto,
  );
  const fileUploadRef = useRef<FileUpload | null>(null);
  const toast = usePrimeReactToast();

  const handleFileSelect = (event: FileUploadSelectEvent) => {
    const selectedFiles = event.files as File[];

    if (selectedFiles.length === 0) {
      toast.error("No file selected", "Please select an image file.");
      fileUploadRef.current?.clear();
      return;
    }

    const file = selectedFiles[0];

    if (file.size > MAX_BYTES) {
      toast.error("File too large", "Image must be 5MB or smaller.");
      fileUploadRef.current?.clear();
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

    // Phones shoot HEIC by default and the backend's `image` rule rejects it, so say so
    // here rather than letting the upload fail with a generic validation error.
    if (["heic", "heif"].includes(ext)) {
      toast.error(
        "Unsupported format",
        "HEIC images are not supported. Please upload a JPG or PNG.",
      );
      fileUploadRef.current?.clear();
      return;
    }

    const allowedExt = ["jpg", "jpeg", "png", "gif", "webp"];
    const allowedType = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    if (!allowedType.includes(file.type) && !allowedExt.includes(ext)) {
      toast.error(
        "Unsupported format",
        "Please upload a JPG, PNG, GIF or WebP image.",
      );
      fileUploadRef.current?.clear();
      return;
    }

    const newPhoto: UploadedPhoto = {
      file,
      previewUrl: URL.createObjectURL(file),
      status: "new",
    };

    setCurrentPhoto(newPhoto);
    onChange(newPhoto);
    fileUploadRef.current?.clear();
  };

  const removePhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentPhoto(null);
    // Explicitly null, not undefined, the dialog reads null as "clear the stored photo".
    onChange(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="block text-sm font-medium text-(--text-primary)">
        {label}
      </label>

      {currentPhoto && (
        <div className="rounded-lg border border-(--border-color) p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-(--text-secondary)">
              {currentPhoto.status === "existing"
                ? "Current photo"
                : "New photo"}
            </span>
            <Button
              type="button"
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              onClick={removePhoto}
              tooltip="Remove photo"
            />
          </div>
          <div className="flex justify-center">
            <Image
              src={currentPhoto.previewUrl}
              alt="Photo preview"
              width="180"
              preview
              pt={{
                image: {
                  className: "rounded-lg border border-(--border-color)",
                },
              }}
            />
          </div>
          {currentPhoto.file && (
            <div className="mt-2 text-xs text-(--text-muted)">
              {currentPhoto.file.name} (
              {(currentPhoto.file.size / (1024 * 1024)).toFixed(2)} MB)
            </div>
          )}
        </div>
      )}

      <FileUpload
        ref={fileUploadRef}
        mode="basic"
        name="photo"
        accept="image/jpeg,image/png,image/gif,image/webp"
        maxFileSize={MAX_BYTES}
        customUpload
        auto
        chooseLabel={
          currentPhoto
            ? `Change ${label.toLowerCase()}`
            : `Upload ${label.toLowerCase()}`
        }
        className="w-full"
        onSelect={handleFileSelect}
      />

      <small className="text-(--text-muted)">
        Max 5MB. JPG, PNG, GIF or WebP.
      </small>
    </div>
  );
};

export default PhotoUploaderPicker;
