export type ApplicationStatus = "pending" | "approved" | "cancelled";

export interface Application {
  id: string;
  class_id: string;
  applicant_id: string;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
}
