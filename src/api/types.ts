export type Capability = { capability: "rescuer" | "provider"; status: "pending" | "approved" | "rejected" };
export type Me = {
  account_id: string; account_type: "personal" | "shelter" | "admin";
  display_name: string; email: string; email_verified_at: string | null;
  phone: string | null; photo_url: string | null;
  capabilities: Capability[]; shelter: null; settings: Record<string, boolean>;
};
export type ApiError = { code: string; message: string; field?: string; details?: any };
