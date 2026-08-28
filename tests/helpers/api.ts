import {
  type APIRequestContext,
  type APIResponse,
} from '@playwright/test';

export const API_BASE_URL =
  process.env.API_BASE_URL ?? 'http://localhost:4000';

export const ADMIN_CREDENTIALS = {
  email: process.env.ADMIN_EMAIL ?? 'admin@qaupskill.local',
  password: process.env.ADMIN_PASSWORD ?? 'Admin123!',
};

export type PersonRole = 'User' | 'Admin' | 'Configurator';

export type CreatePersonInput = {
  fullName: string;
  email: string;
  password: string;
  role: PersonRole;
};

export type PersonResponse = {
  id: number;
  fullName: string;
  email: string;
  role: PersonRole;
  createdAt: string;
};

type LoginResponse = {
  token: string;
  user: PersonResponse;
};

const requireStatus = async (
  response: APIResponse,
  expectedStatus: number,
  operation: string,
): Promise<void> => {
  if (response.status() === expectedStatus) {
    return;
  }

  const responseBody = await response.text();

  throw new Error(
    `${operation} failed: expected HTTP ${expectedStatus}, received ${response.status()}. Response: ${responseBody || '<empty>'}`,
  );
};

export const authenticateAdmin = async (
  request: APIRequestContext,
): Promise<string> => {
  const response = await request.post(
    new URL('/auth/login', API_BASE_URL).toString(),
    {
      data: ADMIN_CREDENTIALS,
    },
  );

  await requireStatus(response, 200, 'Bootstrap Admin authentication');

  const login: LoginResponse = await response.json();

  if (!login.token) {
    throw new Error('Bootstrap Admin authentication returned no token.');
  }

  if (login.user?.role !== 'Admin') {
    throw new Error(
      `Bootstrap Admin authentication returned role ${login.user?.role ?? '<missing>'}.`,
    );
  }

  return login.token;
};

export const createPerson = async (
  request: APIRequestContext,
  adminToken: string,
  person: CreatePersonInput,
): Promise<PersonResponse> => {
  const response = await request.post(
    new URL('/people', API_BASE_URL).toString(),
    {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      data: person,
    },
  );

  await requireStatus(response, 201, `Create person ${person.email}`);

  return response.json();
};

export const deletePerson = (
  request: APIRequestContext,
  adminToken: string,
  personId: number,
): Promise<APIResponse> =>
  request.delete(new URL(`/people/${personId}`, API_BASE_URL).toString(), {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
