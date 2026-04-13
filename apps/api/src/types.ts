export const roles = ["User", "Admin", "Configurator"] as const;

export type Role = (typeof roles)[number];

export type PublicUser = {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  createdAt: string;
};

export type PersonDetails = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  notes: string;
};

export type PersonRecord = PublicUser & PersonDetails;

export type StickyNote = {
  id: number;
  title: string;
  content: string;
  color: string;
  isDone: boolean;
  assignedPersonId: number | null;
  assignedPersonName: string | null;
  createdByUserId: number;
  createdByUserName: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthUser = PublicUser;
