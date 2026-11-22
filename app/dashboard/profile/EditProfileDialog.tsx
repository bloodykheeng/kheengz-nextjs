"use client";

import React from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "@/components/common/Dialog";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { InputSwitch } from "primereact/inputswitch";
import { Button } from "primereact/button";

import PhoneField from "@/components/dashboard/forms/PhoneField";
import PhotoUploaderPicker, {
  type UploadedPhoto,
} from "@/components/dashboard/forms/PhotoUploaderPicker";
import { isValidPhone, PHONE_HINT } from "@/lib/phone";
import { IMAGE_LINK } from "@/lib/photos";
import { applyServerErrors } from "@/lib/validation";
import { usePrimeReactToast } from "@/contexts/PrimeReactToastContext";
import { updateAuthProfile } from "@/services/auth/auth-service";
import type { UserFields } from "@/services/types/auth";
import { confirmSubmit } from "@/components/dashboard/ConfirmAction";


const schema = z
  .object({
    name: z.string().trim().min(1, "Your name is required"),
    // Any of the three is enough to reach and sign in a person; that at
    // least one remains is checked below, the same rule the API holds.
    email: z.string().trim().email("Enter a valid email address").optional().nullable().or(z.literal("")),
    username: z.string().trim().optional().nullable(),
    phone: z.string().trim().optional().nullable(),
    allow_notifications: z.boolean(),
    // The API re-checks this against the stored hash; requiring it here just
    // saves a round trip for the obvious empty case.
    current_password: z
      .string()
      .min(1, "Enter your current password to save changes"),
    new_password: z.string().trim().optional().nullable(),
    new_password_confirmation: z.string().trim().optional().nullable(),
    // Size and format are checked in the picker and again by the API.
    photo: z.any().optional(),
    // Or an image link: the API downloads it once and keeps its own copy (docs/photos-from-links.md).
    photo_link: z.string().trim().max(2048).optional().nullable(),
  })
  .refine((d) => !!(d.email || d.phone || d.username), {
    message: "Keep an email, a phone number or a username: at least one is needed.",
    path: ["email"],
  })
  .refine((d) => !d.phone || isValidPhone(d.phone), {
    message: PHONE_HINT,
    path: ["phone"],
  })
  .refine((d) => !d.new_password || d.new_password.length >= 8, {
    message: "New password must be at least 8 characters",
    path: ["new_password"],
  })
  .refine((d) => !d.new_password || d.new_password === d.new_password_confirmation, {
    message: "Passwords do not match",
    path: ["new_password_confirmation"],
  })
  .refine((d) => !d.photo_link || IMAGE_LINK.test(d.photo_link), {
    message: "Paste the full image link, starting with https://",
    path: ["photo_link"],
  });

type ProfileFormValues = z.infer<typeof schema>;

/**
 * Builds the request body. Every optional text field is sent on every save,
 * because the API reads an absent `username` / `phone` as "clear
 * it" rather than "unchanged". Multipart only when a photo is actually in
 * play, so the common save stays a plain JSON post.
 */
function buildPayload(data: ProfileFormValues): FormData | Record<string, unknown> {
  const fields: Record<string, unknown> = {
    name: data.name,
    email: data.email || null,
    username: data.username || null,
    phone: data.phone || null,
    allow_notifications: data.allow_notifications,
    current_password: data.current_password,
  };

  if (data.new_password) {
    fields.new_password = data.new_password;
    fields.new_password_confirmation = data.new_password_confirmation ?? "";
  }

  const photo = data.photo as UploadedPhoto | null | undefined;
  const hasNewPhoto = photo?.status === "new" && photo.file instanceof File;
  const photoRemoved = photo === null;

  // A pasted link travels as plain JSON; a picked file wins over it.
  if (!hasNewPhoto && data.photo_link) fields.photo_link = data.photo_link;

  if (!hasNewPhoto && !photoRemoved) {
    return fields;
  }

  const formData = new FormData();

  Object.entries(fields).forEach(([key, value]) => {
    // A null in multipart would arrive as the string "null"; omit it instead.
    // Booleans become 1/0 so PHP's boolean validation accepts them.
    if (value === null || value === undefined) return;
    formData.append(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value));
  });

  if (hasNewPhoto) {
    formData.append("photo[file_path]", photo!.file as File);
  } else if (photoRemoved) {
    formData.append("remove_photo", "1");
  }

  return formData;
}

interface EditProfileDialogProps {
  visible: boolean;
  onHide: () => void;
  attributes: UserFields;
}

const EditProfileDialog: React.FC<EditProfileDialogProps> = ({
  visible,
  onHide,
  attributes,
}) => {
  const toast = usePrimeReactToast();
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: attributes.name ?? "",
      email: attributes.email ?? "",
      username: attributes.username ?? "",
      phone: attributes.phone ?? "",
      allow_notifications: !!attributes.allow_notifications,
      current_password: "",
      new_password: "",
      new_password_confirmation: "",
      photo: undefined,
      photo_link: "",
    },
  });

  const photo = useWatch({ control, name: "photo" }) as UploadedPhoto | null | undefined;

  const closeAndReset = () => {
    reset();
    onHide();
  };

  const mutation = useMutation({
    // Handled here so the field-level message ("current password is incorrect")
    // reaches the user instead of the generic toast from TanstackContext.
    meta: { skipGlobalError: true },
    mutationFn: (data: ProfileFormValues) => updateAuthProfile(buildPayload(data)),
    onSuccess: async (res) => {
      toast.success(
        "Profile updated",
        res.data?.message ?? "Your profile has been saved."
      );
      // Both the bootstrap profile (header avatar, permissions) and this page's
      // enriched copy key off "auth-profile". Awaited before the dialog closes,
      // or the officer is returned to a header still showing the name and photo
      // they have just changed.
      await queryClient.invalidateQueries({ queryKey: ["auth-profile"] });
      closeAndReset();
    },
    // The API answers { errors: { field: [message] } }: each lands on its field (red, with the message);
    // anything without a field here becomes the toast.
    onError: (err: unknown) => {
      const message = applyServerErrors(err, setError, ["name", "email", "username", "phone", "current_password", "new_password", "photo_link"]);
      if (message) toast.error("Update failed", message);
    },
  });

  return (
    <Dialog
      header={
        <div className="flex items-center gap-2">
          <span className="pi pi-user-edit text-lg text-(--brand-ink)" />
          <span>Edit profile</span>
        </div>
      }
      visible={visible}
      onHide={closeAndReset}
      style={{ width: "min(46rem, 95vw)" }}
      modal
      maximizable
    >
      <form
        onSubmit={handleSubmit((d) => confirmSubmit("your profile", () => mutation.mutateAsync(d)))}
        className="space-y-5 p-1"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-(--text-primary)">
              Full name <span className="text-red-500">*</span>
            </label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <InputText
                  {...field}
                  value={field.value ?? ""}
                  className={`w-full ${errors.name ? "p-invalid" : ""}`}
                />
              )}
            />
            {errors.name && (
              <small className="text-xs text-red-500">{errors.name.message}</small>
            )}
          </div>


          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-(--text-primary)">
              Email
            </label>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <InputText
                  {...field}
                  value={field.value ?? ""}
                  type="email"
                  className={`w-full ${errors.email ? "p-invalid" : ""}`}
                />
              )}
            />
            {errors.email && (
              <small className="text-xs text-red-500">{errors.email.message}</small>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-(--text-primary)">
              Username
            </label>
            <Controller
              name="username"
              control={control}
              render={({ field }) => (
                <InputText
                  {...field}
                  value={field.value ?? ""}
                  className={`w-full ${errors.username ? "p-invalid" : ""}`}
                />
              )}
            />
            {errors.username && (
              <small className="text-xs text-red-500">{errors.username.message}</small>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-(--text-primary)">
              Phone
            </label>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <PhoneField
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  invalid={!!errors.phone}
                />
              )}
            />
            {errors.phone && (
              <small className="text-xs text-red-500">{errors.phone.message}</small>
            )}
          </div>

          <div className="flex items-center gap-3 pt-6">
            <Controller
              name="allow_notifications"
              control={control}
              render={({ field }) => (
                <InputSwitch
                  checked={!!field.value}
                  onChange={(e) => field.onChange(e.value)}
                />
              )}
            />
            <span className="text-sm text-(--text-secondary)">
              Receive notifications (email, SMS and push)
            </span>
          </div>

          <div className="sm:col-span-2">
            <PhotoUploaderPicker
              onChange={(value) => setValue("photo", value)}
              photo={photo}
              existingPhoto={attributes.photo_url ?? null}
              label="Profile photo"
            />
            <Controller
              name="photo_link"
              control={control}
              render={({ field }) => (
                <InputText
                  {...field}
                  value={field.value ?? ""}
                  placeholder="Or paste an image link (https://…)"
                  inputMode="url"
                  aria-label="Profile photo link"
                  className={`mt-2 w-full text-sm ${errors.photo_link ? "p-invalid" : ""}`}
                />
              )}
            />
            {errors.photo_link ? (
              <small className="text-xs text-red-500">{errors.photo_link.message}</small>
            ) : (
              <small className="text-xs text-(--text-muted)">A link is downloaded once and kept as our copy.</small>
            )}
          </div>
        </div>

        {/* Grouped by a heading and a rule rather than a filled box: these are
            the same kind of fields as the ones above, so a panel implied a
            nesting that is not there. */}
        <section>
          <h3 className="border-b border-(--border-color) pb-2 text-[11px] font-semibold uppercase tracking-wider text-(--text-secondary)">
            Security
          </h3>
          <p className="mt-2 text-xs text-(--text-muted)">
            Your current password is required to save anything. Leave the new
            password fields blank to keep it.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-(--text-primary)">
                Current password <span className="text-red-500">*</span>
              </label>
              <Controller
                name="current_password"
                control={control}
                render={({ field }) => (
                  <Password
                    {...field}
                    value={field.value ?? ""}
                    feedback={false}
                    toggleMask
                    inputClassName="w-full"
                    className={`w-full ${errors.current_password ? "p-invalid" : ""}`}
                  />
                )}
              />
              {errors.current_password && (
                <small className="text-xs text-red-500">
                  {errors.current_password.message}
                </small>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-(--text-primary)">
                New password
              </label>
              <Controller
                name="new_password"
                control={control}
                render={({ field }) => (
                  <Password
                    {...field}
                    value={field.value ?? ""}
                    feedback={false}
                    toggleMask
                    inputClassName="w-full"
                    className={`w-full ${errors.new_password ? "p-invalid" : ""}`}
                  />
                )}
              />
              {errors.new_password && (
                <small className="text-xs text-red-500">
                  {errors.new_password.message}
                </small>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-(--text-primary)">
                Confirm new password
              </label>
              <Controller
                name="new_password_confirmation"
                control={control}
                render={({ field }) => (
                  <Password
                    {...field}
                    value={field.value ?? ""}
                    feedback={false}
                    toggleMask
                    inputClassName="w-full"
                    className={`w-full ${
                      errors.new_password_confirmation ? "p-invalid" : ""
                    }`}
                  />
                )}
              />
              {errors.new_password_confirmation && (
                <small className="text-xs text-red-500">
                  {errors.new_password_confirmation.message}
                </small>
              )}
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            label="Cancel"
            icon="pi pi-times"
            severity="secondary"
            outlined
            onClick={closeAndReset}
            disabled={mutation.isPending}
          />
          <Button
            type="submit"
            label={mutation.isPending ? "Saving..." : "Save changes"}
            icon={mutation.isPending ? "pi pi-spin pi-spinner" : "pi pi-check"}
            disabled={mutation.isPending}
          />
        </div>
      </form>
    </Dialog>
  );
};

export default EditProfileDialog;
