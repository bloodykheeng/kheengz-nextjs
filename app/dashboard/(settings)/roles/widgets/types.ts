import { z } from "zod";

export const PermissionSchema = z.object({
  name: z.string(),
  value: z.boolean(),
});

export const RoleSchema = z.object({
  role: z.string(),
  permissions: z.array(PermissionSchema),
});

export const RolesSubmissionSchema = z.object({
  roles: z.array(RoleSchema),
});

export type Permission = z.infer<typeof PermissionSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type RolesSubmission = z.infer<typeof RolesSubmissionSchema>;
