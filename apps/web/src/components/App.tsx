import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type Role = "User" | "Admin" | "Configurator";

type User = {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  createdAt: string;
};

type PersonDetails = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  notes: string;
};

type PersonRecord = User & PersonDetails;

type StickyNote = {
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

type LoginResponse = {
  token: string;
  user: User;
};

type WorkspaceTab = "users" | "createUser" | "person" | "notes" | "archive" | "noteAssignments" | "statistics";

const workspaceTabLabels: Record<WorkspaceTab, string> = {
  users: "Users",
  createUser: "Create User",
  person: "Person",
  noteAssignments: "Note Assignments",
  statistics: "Statistics",
  archive: "Archive",
  notes: "Sticky Notes"
};

const roleOptions: Role[] = ["User", "Admin", "Configurator"];
const stickyNoteColors = ["#19352a", "#26482d", "#3b5c29", "#4d5b1f", "#3f2a4c"] as const;
const maxStickyNotes = 10;
const apiUrl = import.meta.env.PUBLIC_API_URL ?? "http://localhost:4000";
const tokenStorageKey = "qa-upskill-token";
const emptyPersonDetails: PersonDetails = {
  addressLine1: "",
  addressLine2: "",
  city: "",
  postalCode: "",
  country: "",
  phone: "",
  notes: ""
};

const getErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.clone().json()) as { message?: string };
    return payload.message ?? "Request failed.";
  } catch {
    try {
      const fallbackText = await response.text();

      if (fallbackText.trim()) {
        return fallbackText.trim();
      }
    } catch {
      // Ignore secondary parse failures and fall through to HTTP status message.
    }

    return `HTTP ${response.status} ${response.statusText || "Request failed"}`;
  }
};

const request = async <T,>(path: string, init: RequestInit = {}, token?: string): Promise<T> => {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...init,
      headers
    });
  } catch {
    throw new Error(`Could not reach API server at ${apiUrl}.`);
  }

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

const toPersonDetails = (record: PersonRecord): PersonDetails => ({
  addressLine1: record.addressLine1,
  addressLine2: record.addressLine2,
  city: record.city,
  postalCode: record.postalCode,
  country: record.country,
  phone: record.phone,
  notes: record.notes
});

function SafeNoteContent({ html }: { html: string }) {
  const sanitizedHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '');
  
  return <p dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [directoryUsers, setDirectoryUsers] = useState<User[]>([]);
  const [personRecords, setPersonRecords] = useState<PersonRecord[]>([]);
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [userPendingDelete, setUserPendingDelete] = useState<User | null>(null);
  const [deleteUserError, setDeleteUserError] = useState("");
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingPersonRecords, setLoadingPersonRecords] = useState(false);
  const [loadingStickyNotes, setLoadingStickyNotes] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [userNotice, setUserNotice] = useState("");
  const [personNotice, setPersonNotice] = useState("");
  const [notesNotice, setNotesNotice] = useState("");
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("users");
  const [loginState, setLoginState] = useState({
    email: "admin@qaupskill.local",
    password: "Admin123!"
  });
  const [createState, setCreateState] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "User" as Role
  });
  const [noteCreateState, setNoteCreateState] = useState({
    title: "",
    content: "",
    color: stickyNoteColors[0],
    assignedUserId: ""
  });
  const [personState, setPersonState] = useState<PersonDetails>(emptyPersonDetails);

  const isAdmin = currentUser?.role === "Admin";
  const canManagePerson = currentUser?.role === "Admin" || currentUser?.role === "Configurator";
  const selectedPerson = personRecords.find((record) => record.id === selectedPersonId) ?? null;
  const activeStickyNotes = stickyNotes.filter((note) => !note.isDone);
  const archivedStickyNotes = stickyNotes.filter((note) => note.isDone);
  const configuratorUserIds = new Set(
    directoryUsers.filter((user) => user.role === "Configurator").map((user) => user.id)
  );
  const statisticsStickyNotes = stickyNotes.filter((note) => !configuratorUserIds.has(note.createdByUserId));
  const statisticsActiveStickyNotes = statisticsStickyNotes.filter((note) => !note.isDone);
  const statisticsArchivedStickyNotes = statisticsStickyNotes.filter((note) => note.isDone);
  const stickyNotesLimitReached = activeStickyNotes.length > maxStickyNotes;
  const doneStickyNotesCount = archivedStickyNotes.length;
  const openStickyNotesCount = activeStickyNotes.length;
  const stickyNotesCompletionRate =
    stickyNotes.length === 0 ? 0 : Math.round((doneStickyNotesCount / stickyNotes.length) * 100);
  const statisticsDoneStickyNotesCount = statisticsArchivedStickyNotes.length;
  const statisticsOpenStickyNotesCount = statisticsActiveStickyNotes.length;
  const statisticsCompletionRate =
    statisticsStickyNotes.length === 0 ? 0 : Math.round((statisticsDoneStickyNotesCount / statisticsStickyNotes.length) * 100);
  const canManageStickyNote = (note: StickyNote) =>
    currentUser?.role === "Admin" || currentUser?.role === "Configurator" || currentUser?.id === note.createdByUserId;
  const canMarkStickyNoteDone = Boolean(currentUser);
  const canViewArchive = currentUser?.role === "Admin" || currentUser?.role === "Configurator";
  const availableTabs: WorkspaceTab[] = [
    ...(isAdmin ? (["users", "createUser"] as WorkspaceTab[]) : []),
    ...(canManagePerson ? (["person"] as WorkspaceTab[]) : []),
    "noteAssignments",
    "statistics",
    ...(canViewArchive ? (["archive"] as WorkspaceTab[]) : []),
    "notes"
  ];
  const availableTabsKey = availableTabs.join("|");
  const assignedNotesByUserId = activeStickyNotes.reduce<Record<number, number>>((counts, note) => {
    if (note.assignedPersonId !== null) {
      counts[note.assignedPersonId] = (counts[note.assignedPersonId] ?? 0) + 1;
    }

    return counts;
  }, {});
  const assignmentRows = directoryUsers
    .map((person) => ({
      id: person.id,
      fullName: person.fullName,
      role: person.role,
      noteCount: assignedNotesByUserId[person.id] ?? 0
    }))
    .filter((person) => person.noteCount > 0)
    .sort((left, right) => right.noteCount - left.noteCount || left.fullName.localeCompare(right.fullName));

  useEffect(() => {
    const storedToken = window.localStorage.getItem(tokenStorageKey);

    if (!storedToken) {
      setLoadingSession(false);
      return;
    }

    void (async () => {
      try {
        const user = await request<User>("/auth/me", {}, storedToken);
        setToken(storedToken);
        setCurrentUser(user);
      } catch {
        window.localStorage.removeItem(tokenStorageKey);
      } finally {
        setLoadingSession(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!currentUser || availableTabs.length === 0) {
      return;
    }

    if (!availableTabs.includes(workspaceTab)) {
      setWorkspaceTab(availableTabs[0]);
    }
  }, [currentUser, workspaceTab, availableTabsKey]);

  useEffect(() => {
    if (!token) {
      setDirectoryUsers([]);
      setStickyNotes([]);
      return;
    }
  }, [token]);

  useEffect(() => {
    if (!token || !isAdmin) {
      setUsers([]);
      return;
    }
  }, [token, isAdmin]);

  useEffect(() => {
    if (!token || !canManagePerson) {
      setPersonRecords([]);
      setSelectedPersonId(null);
      setIsPersonModalOpen(false);
      setPersonState(emptyPersonDetails);
      return;
    }
  }, [token, canManagePerson]);

  useEffect(() => {
    if (!token) {
      return;
    }

    if (workspaceTab === "users" && isAdmin) {
      void loadUsers(token);
      return;
    }

    if (workspaceTab === "person" && canManagePerson) {
      void loadPersonRecords(token);
      return;
    }

    if (
      workspaceTab === "notes" ||
      workspaceTab === "archive" ||
      workspaceTab === "noteAssignments" ||
      workspaceTab === "statistics"
    ) {
      if (stickyNotes.length === 0) {
        void loadStickyNotes(token);
      }

      void loadDirectoryUsers(token);
    }
  }, [workspaceTab, token, isAdmin, canManagePerson, stickyNotes.length]);

  useEffect(() => {
    if (!selectedPersonId) {
      return;
    }

    const nextSelectedPerson = personRecords.find((record) => record.id === selectedPersonId);

    if (!nextSelectedPerson) {
      setSelectedPersonId(null);
      setIsPersonModalOpen(false);
      setPersonState(emptyPersonDetails);
      return;
    }

    if (isPersonModalOpen) {
      setPersonState(toPersonDetails(nextSelectedPerson));
    }
  }, [personRecords, selectedPersonId, isPersonModalOpen]);

  const loadUsers = async (activeToken: string) => {
    setLoadingUsers(true);

    try {
      const data = await request<User[]>("/people", {}, activeToken);
      setUsers(data);
    } catch (error) {
      setUserNotice(error instanceof Error ? error.message : "Could not load users.");
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadDirectoryUsers = async (activeToken: string) => {
    try {
      const data = await request<User[]>("/people-directory", {}, activeToken);
      setDirectoryUsers(data);
    } catch (error) {
      setNotesNotice(error instanceof Error ? error.message : "Could not load people directory.");
    }
  };

  const loadPersonRecords = async (activeToken: string) => {
    setLoadingPersonRecords(true);

    try {
      const data = await request<PersonRecord[]>("/person-records", {}, activeToken);
      setPersonRecords(data);
    } catch (error) {
      setPersonNotice(error instanceof Error ? error.message : "Could not load person records.");
    } finally {
      setLoadingPersonRecords(false);
    }
  };

  const loadStickyNotes = async (activeToken: string) => {
    setLoadingStickyNotes(true);

    try {
      const data = await request<StickyNote[]>("/notes", {}, activeToken);
      setStickyNotes(data);
    } catch (error) {
      setNotesNotice(error instanceof Error ? error.message : "Could not load sticky notes.");
    } finally {
      setLoadingStickyNotes(false);
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");
    setUserNotice("");
    setPersonNotice("");
    setNotesNotice("");

    try {
      const result = await request<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(loginState)
      });

      window.localStorage.setItem(tokenStorageKey, result.token);
      setToken(result.token);
      setCurrentUser(result.user);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Login failed.");
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem(tokenStorageKey);
    setToken(null);
    setCurrentUser(null);
    setUsers([]);
    setDirectoryUsers([]);
    setPersonRecords([]);
    setStickyNotes([]);
    setSelectedPersonId(null);
    setIsPersonModalOpen(false);
    setUserPendingDelete(null);
    setPersonState(emptyPersonDetails);
    setUserNotice("");
    setPersonNotice("");
    setNotesNotice("");
    setWorkspaceTab("users");
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      return;
    }

    setUserNotice("");

    try {
      const user = await request<User>(
        "/people",
        {
          method: "POST",
          body: JSON.stringify(createState)
        },
        token
      );

      setUsers((current) => [user, ...current]);
      setCreateState({
        fullName: "",
        email: "",
        password: "",
        role: "User"
      });
      setUserNotice(`Created user ${user.fullName}.`);
      setWorkspaceTab("users");

      if (canManagePerson) {
        void loadPersonRecords(token);
      }

      void loadDirectoryUsers(token);
    } catch (error) {
      setUserNotice(error instanceof Error ? error.message : "Could not create user.");
    }
  };

  const handleRoleUpdate = async (userId: number, role: Role) => {
    if (!token) {
      return;
    }

    setUserNotice("");

    try {
      const updated = await request<User>(
        `/people/${userId}/role`,
        {
          method: "PATCH",
          body: JSON.stringify({ role })
        },
        token
      );

      setUsers((current) => current.map((user) => (user.id === userId ? updated : user)));
      setPersonRecords((current) =>
        current.map((record) => (record.id === userId ? { ...record, role: updated.role } : record))
      );
      setUserNotice(`Updated role for ${updated.fullName}.`);
    } catch (error) {
      setUserNotice(error instanceof Error ? error.message : "Could not update role.");
    }
  };

  const handleOpenDeleteUserModal = (user: User) => {
    if (currentUser?.id === user.id) {
      return;
    }

    setUserPendingDelete(user);
    setDeleteUserError("");
    setUserNotice("");
  };

  const handleCloseDeleteUserModal = () => {
    setUserPendingDelete(null);
    setDeleteUserError("");
  };

  const handleDeleteUser = async () => {
    if (!token || !userPendingDelete || currentUser?.id === userPendingDelete.id) {
      return;
    }

    const { id: userId, fullName } = userPendingDelete;

    setUserNotice("");

    try {
      await request<void>(
        `/people/${userId}`,
        {
          method: "DELETE"
        },
        token
      );

      setUsers((current) => current.filter((user) => user.id !== userId));
      setPersonRecords((current) => current.filter((record) => record.id !== userId));
      setDirectoryUsers((current) => current.filter((user) => user.id !== userId));

      if (selectedPersonId === userId) {
        setSelectedPersonId(null);
        setIsPersonModalOpen(false);
        setPersonState(emptyPersonDetails);
      }

      setUserPendingDelete(null);
      setUserNotice(`Deleted user ${fullName}.`);

      if (canManagePerson) {
        void loadPersonRecords(token);
      }

      void loadDirectoryUsers(token);
      void loadStickyNotes(token);
    } catch (error) {
      setDeleteUserError(error instanceof Error ? error.message : "Could not delete user.");
    }
  };

  const handleSelectPerson = (personId: number) => {
    const record = personRecords.find((item) => item.id === personId);

    if (!record) {
      return;
    }

    setSelectedPersonId(personId);
    setPersonState(toPersonDetails(record));
    setPersonNotice("");
    setIsPersonModalOpen(true);
  };

  const handleClosePersonModal = () => {
    setIsPersonModalOpen(false);
  };

  const handleSavePerson = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token || selectedPersonId === null) {
      return;
    }

    setPersonNotice("");

    try {
      const updated = await request<PersonRecord>(
        `/person-records/${selectedPersonId}`,
        {
          method: "PUT",
          body: JSON.stringify(personState)
        },
        token
      );

      setPersonRecords((current) =>
        current.map((record) => (record.id === selectedPersonId ? updated : record))
      );
      setPersonNotice(`Saved person details for ${updated.fullName}.`);
      setIsPersonModalOpen(false);
    } catch (error) {
      setPersonNotice(error instanceof Error ? error.message : "Could not save person details.");
    }
  };

  const handleCreateStickyNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token || stickyNotesLimitReached) {
      return;
    }

    setNotesNotice("");

    try {
      const stickyNote = await request<StickyNote>(
        "/notes",
        {
          method: "POST",
          body: JSON.stringify({
            title: noteCreateState.title,
            content: noteCreateState.content,
            color: noteCreateState.color,
            assignedUserId: noteCreateState.assignedUserId ? Number(noteCreateState.assignedUserId) : null
          })
        },
        token
      );

      setStickyNotes((current) => [stickyNote, ...current]);
      setNoteCreateState({
        title: "",
        content: "",
        color: stickyNoteColors[0],
        assignedUserId: ""
      });
      setNotesNotice(`Created sticky note ${stickyNote.title}.`);
      setWorkspaceTab("notes");
    } catch (error) {
      setNotesNotice(error instanceof Error ? error.message : "Could not create sticky note.");
    }
  };

  const handleDeleteStickyNote = async (noteId: number) => {
    if (!token) {
      return;
    }

    setNotesNotice("");

    try {
      await request<void>(
        `/notes/${noteId}`,
        {
          method: "DELETE"
        },
        token
      );

      setStickyNotes((current) => current.filter((note) => note.id !== noteId));
      setNotesNotice("Sticky note deleted.");
    } catch (error) {
      setNotesNotice(error instanceof Error ? error.message : "Could not delete sticky note.");
    }
  };

  const handleMarkStickyNoteDone = async (noteId: number) => {
    if (!token) {
      return;
    }

    setNotesNotice("");

    try {
      const updated = await request<StickyNote>(
        `/notes/${noteId}/done`,
        {
          method: "PATCH",
          body: JSON.stringify({ done: true })
        },
        token
      );

      setStickyNotes((current) => current.map((note) => (note.id === noteId ? updated : note)));
      setNotesNotice(`Marked ${updated.title} as done.`);
    } catch (error) {
      setNotesNotice(error instanceof Error ? error.message : "Could not update sticky note.");
    }
  };

  if (loadingSession) {
    return <main className="shell"><section className="panel">Restoring session...</section></main>;
  }

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">QA Upskill</p>
        <h1>Workspace for QA.</h1>
        <div className="hero-links">
          <a href={`${apiUrl}/docs`} target="_blank" rel="noreferrer">
            Open Swagger
          </a>
          <a href="https://astro.build/404" target="_blank" rel="noreferrer">
            Astro
          </a>
        </div>
      </section>

      {!token || !currentUser ? (
        <section className="panel auth-panel">
          <div>
            <p className="section-label">Login</p>
            <h2>Sign in with a bearer-token account</h2>
            <p className="muted">Default bootstrap admin credentials are prefilled for first local access.</p>
          </div>

          <form className="stack" onSubmit={handleLogin}>
            <label>
              <span>Email</span>
              <input
                type="email"
                required
                value={loginState.email}
                onChange={(event) => setLoginState((current) => ({ ...current, email: event.target.value }))}
              />
            </label>

            <label>
              <span>Password</span>
              <input
                type="password"
                required
                minLength={8}
                value={loginState.password}
                onChange={(event) => setLoginState((current) => ({ ...current, password: event.target.value }))}
              />
            </label>

            {loginError ? <p className="notice error">{loginError}</p> : null}

            <button type="submit">Login</button>
          </form>
        </section>
      ) : (
        <section className="dashboard">
          <div className="panel dashboard-header">
            <div>
              <p className="section-label">Authenticated</p>
              <h2>{currentUser.fullName}</h2>
              <p className="muted">
                {currentUser.email} <span className="role-chip">{currentUser.role}</span>
              </p>
            </div>

            <button className="ghost-button" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>

	          <section className="panel">
	            <div className="tabs" role="tablist" aria-label="Workspace tabs">
	              {availableTabs.map((tab) => (
	                <button
	                  key={tab}
	                  type="button"
	                  className={`tab-button ${workspaceTab === tab ? "active" : ""}`}
	                  onClick={() => setWorkspaceTab(tab)}
	                >
	                  {workspaceTabLabels[tab]}
	                </button>
	              ))}
	            </div>

              {isAdmin && workspaceTab === "users" ? (
                <>
                  <div className="section-row">
                    <div>
                      <p className="section-label">Users</p>
                      <h3>Manage existing user accounts</h3>
                    </div>
                    <button className="ghost-button" type="button" onClick={() => token && void loadUsers(token)}>
                      Refresh
                    </button>
                  </div>

                  {userNotice ? <p className="notice">{userNotice}</p> : null}

                  <div className="people-list">
                    {loadingUsers ? <p className="muted">Loading users...</p> : null}

                    {users.map((user) => (
	                      <article className="person-card" key={user.id}>
	                        <div>
	                          <h4>{user.fullName}</h4>
	                          <p className="muted">{user.email}</p>
	                        </div>

	                        <div className="person-actions stack">
	                          <select
	                            value={user.role}
	                            onChange={(event) => void handleRoleUpdate(user.id, event.target.value as Role)}
	                          >
	                            {roleOptions.map((role) => (
                              <option key={role} value={role}>
                                {role}
	                              </option>
	                            ))}
	                          </select>

	                          <button
	                            type="button"
	                            className="ghost-button"
	                            disabled={currentUser?.id === user.id}
	                            onClick={() => handleOpenDeleteUserModal(user)}
	                          >
	                            Delete User
	                          </button>
	                        </div>
	                      </article>
	                    ))}

                    {!loadingUsers && users.length === 0 ? (
                      <p className="muted">No users have been created yet.</p>
                    ) : null}
                  </div>
                </>
              ) : null}

              {isAdmin && workspaceTab === "createUser" ? (
                <>
                  <p className="section-label">Create User</p>
                  <h3>Add a user who can log in</h3>

                  {userNotice ? <p className="notice">{userNotice}</p> : null}

                  <form className="stack" onSubmit={handleCreateUser}>
                    <label>
                      <span>Full name</span>
                      <input
                        type="text"
                        required
                        value={createState.fullName}
                        onChange={(event) =>
                          setCreateState((current) => ({ ...current, fullName: event.target.value }))
                        }
                      />
                    </label>

                    <label>
                      <span>Email</span>
                      <input
                        type="email"
                        required
                        value={createState.email}
                        onChange={(event) => setCreateState((current) => ({ ...current, email: event.target.value }))}
                      />
                    </label>

                    <label>
                      <span>Password</span>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={createState.password}
                        onChange={(event) =>
                          setCreateState((current) => ({ ...current, password: event.target.value }))
                        }
                      />
                    </label>

                    <label>
                      <span>Role</span>
                      <select
                        value={createState.role}
                        onChange={(event) =>
                          setCreateState((current) => ({ ...current, role: event.target.value as Role }))
                        }
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button type="submit">Create User</button>
                  </form>
                </>
              ) : null}

              {canManagePerson && workspaceTab === "person" ? (
                <>
                  <div className="section-row">
                    <div>
                      <p className="section-label">Person</p>
                      <h3>Add address and profile data to a user</h3>
                    </div>
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => token && void loadPersonRecords(token)}
                    >
                      Refresh
                    </button>
                  </div>

                  {personNotice ? <p className="notice">{personNotice}</p> : null}

                  <div className="person-grid">
                    {loadingPersonRecords ? <p className="muted">Loading person records...</p> : null}

                    {personRecords.map((record) => (
                      <article className="person-summary-card" key={record.id}>
                        <div className="person-summary-head">
                          <div>
                            <h4>{record.fullName}</h4>
                            <p className="muted">{record.email}</p>
                          </div>
                          <span className="role-chip">{record.role}</span>
                        </div>

                        <div className="person-address-preview">
                          <p>{record.addressLine1 || "No address line 1"}</p>
                          <p>{record.addressLine2 || "No address line 2"}</p>
                          <p>
                            {[record.city, record.postalCode].filter(Boolean).join(", ") || "No city or postal code"}
                          </p>
                          <p>{record.country || "No country"}</p>
                          <p>{record.phone || "No phone"}</p>
                        </div>

                        <button type="button" onClick={() => handleSelectPerson(record.id)}>
                          Edit Address
                        </button>
                      </article>
                    ))}

                    {!loadingPersonRecords && personRecords.length === 0 ? (
                      <p className="muted">No person records are available yet.</p>
                    ) : null}
                  </div>

	                  {isPersonModalOpen && selectedPerson ? (
	                    <div className="modal-backdrop" onClick={handleClosePersonModal}>
                      <div
                        className="modal-card"
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="person-modal-title"
                      >
                        <div className="modal-header">
                          <div>
                            <p className="section-label">Update Address</p>
                            <h3 id="person-modal-title">{selectedPerson.fullName}</h3>
                            <p className="muted">{selectedPerson.email}</p>
                          </div>
                          <button className="ghost-button modal-close" type="button" onClick={handleClosePersonModal}>
                            Close
                          </button>
                        </div>

                        <form className="stack" onSubmit={handleSavePerson}>
                          <div className="form-grid">
                            <label>
                              <span>Address line 1</span>
                              <input
                                type="text"
                                value={personState.addressLine1}
                                onChange={(event) =>
                                  setPersonState((current) => ({ ...current, addressLine1: event.target.value }))
                                }
                              />
                            </label>

                            <label>
                              <span>Address line 2</span>
                              <input
                                type="text"
                                value={personState.addressLine2}
                                onChange={(event) =>
                                  setPersonState((current) => ({ ...current, addressLine2: event.target.value }))
                                }
                              />
                            </label>

                            <label>
                              <span>City</span>
                              <input
                                type="text"
                                value={personState.city}
                                onChange={(event) =>
                                  setPersonState((current) => ({ ...current, city: event.target.value }))
                                }
                              />
                            </label>

                            <label>
                              <span>Postal code</span>
                              <input
                                type="text"
                                value={personState.postalCode}
                                onChange={(event) =>
                                  setPersonState((current) => ({ ...current, postalCode: event.target.value }))
                                }
                              />
                            </label>

                            <label>
                              <span>Country</span>
                              <input
                                type="text"
                                value={personState.country}
                                onChange={(event) =>
                                  setPersonState((current) => ({ ...current, country: event.target.value }))
                                }
                              />
                            </label>

                            <label>
                              <span>Phone</span>
                              <input
                                type="text"
                                value={personState.phone}
                                onChange={(event) =>
                                  setPersonState((current) => ({ ...current, phone: event.target.value }))
                                }
                              />
                            </label>
                          </div>

                          <label>
                            <span>Notes</span>
                            <textarea
                              rows={5}
                              value={personState.notes}
                              onChange={(event) =>
                                setPersonState((current) => ({ ...current, notes: event.target.value }))
                              }
                            />
                          </label>

                          <div className="modal-actions">
                            <button className="ghost-button" type="button" onClick={handleClosePersonModal}>
                              Cancel
                            </button>
                            <button type="submit">Save Person Data</button>
                          </div>
                        </form>
                      </div>
	                    </div>
	                  ) : null}

	                </>
	              ) : null}

              {workspaceTab === "notes" ? (
                <>
                  <div className="section-row">
                    <div>
                      <p className="section-label">Sticky Notes</p>
                      <h3>Create notes and assign people to them</h3>
                    </div>
                    <div className="notes-toolbar">
                      <div className="notes-counter">{activeStickyNotes.length}/{maxStickyNotes}</div>
                      <button className="ghost-button" type="button" onClick={() => token && void loadStickyNotes(token)}>
                        Refresh
                      </button>
                    </div>
                  </div>

                  {notesNotice ? <p className="notice">{notesNotice}</p> : null}

                  <div className="notes-layout">
                    <section className="note-create-card">
                      <form className="stack" onSubmit={handleCreateStickyNote}>
                        <label>
                          <span>Title</span>
                          <input
                            type="text"
                            required
                            minLength={2}
                            maxLength={80}
                            value={noteCreateState.title}
                            onChange={(event) =>
                              setNoteCreateState((current) => ({ ...current, title: event.target.value }))
                            }
                          />
                        </label>

                        <label>
                          <span>Content</span>
                          <textarea
                            rows={5}
                            required
                            minLength={2}
                            maxLength={600}
                            value={noteCreateState.content}
                            onChange={(event) =>
                              setNoteCreateState((current) => ({ ...current, content: event.target.value }))
                            }
                          />
                        </label>

                        <label>
                          <span>Assign person</span>
                          <select
                            value={noteCreateState.assignedUserId}
                            onChange={(event) =>
                              setNoteCreateState((current) => ({ ...current, assignedUserId: event.target.value }))
                            }
                          >
                            <option value="">Unassigned</option>
                            {directoryUsers.map((person) => (
                              <option key={person.id} value={person.id}>
                                {person.fullName}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          <span>Color</span>
                          <div className="color-picker">
                            {stickyNoteColors.map((color) => (
                              <button
                                key={color}
                                type="button"
                                className={`color-swatch ${noteCreateState.color === color ? "active" : ""}`}
                                style={{ background: color }}
                                onClick={() => setNoteCreateState((current) => ({ ...current, color }))}
                                aria-label={`Select color ${color}`}
                              />
                            ))}
                          </div>
                        </label>

                        <button type="submit" disabled={stickyNotesLimitReached}>
                          Create Sticky Note
                        </button>
                        {stickyNotesLimitReached ? (
                          <p className="muted">Sticky note limit reached. Delete one to create another.</p>
                        ) : null}
                      </form>
                    </section>

                    <section className="notes-board">
                      {loadingStickyNotes ? <p className="muted">Loading sticky notes...</p> : null}

                      {!loadingStickyNotes && activeStickyNotes.length === 0 ? (
                        <div className="notes-empty-state">
                          <p className="section-label">No Open Notes</p>
                          <h3>The active board is clear right now.</h3>
                          <p className="muted">
                            Create a new sticky note to add work back to the board, or review completed items in the archive.
                          </p>
                        </div>
                      ) : (
                        <div className="notes-grid">
                          {activeStickyNotes.map((note) => (
                            <article
                              className="sticky-note-card"
                              key={note.id}
                              style={{ background: note.color }}
                            >
                              <div className="sticky-note-meta">
                                <span>{note.assignedPersonName ?? "Unassigned"}</span>
                                <span>{note.createdByUserName}</span>
                              </div>
                              {note.isDone ? <div className="done-badge">Done</div> : null}
                              <h4>{note.title}</h4>
                              <SafeNoteContent html={note.content} />
                              <div className="sticky-note-footer">
                                <span className="sticky-note-time">{new Date(note.updatedAt).toLocaleDateString()}</span>
                                {canMarkStickyNoteDone || canManageStickyNote(note) ? (
                                  <div className="note-card-actions">
                                    {canMarkStickyNoteDone ? (
                                      <button
                                        type="button"
                                        className="note-done-button"
                                        onClick={() => void handleMarkStickyNoteDone(note.id)}
                                      >
                                        Done
                                      </button>
                                    ) : null}
                                    {canManageStickyNote(note) ? (
                                      <button
                                        type="button"
                                        className="note-delete-button"
                                        onClick={() => void handleDeleteStickyNote(note.id)}
                                      >
                                        Delete
                                      </button>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                </>
              ) : null}

              {workspaceTab === "archive" ? (
                <>
                  <div className="section-row">
                    <div>
                      <p className="section-label">Archive</p>
                      <h3>Completed sticky notes moved out of the active board</h3>
                    </div>
                    <div className="notes-toolbar">
                      <div className="notes-counter" style={{ color: "#fff", background: "#555" }}>{archivedStickyNotes.length}</div>
                      <button className="ghost-button" type="button" aria-label="Refresh archived notes" onClick={() => token && void loadStickyNotes(token)}>
                        Refresh
                      </button>
                    </div>
                  </div>

                  {!loadingStickyNotes && archivedStickyNotes.length === 0 ? (
                    <div className="notes-empty-state">
                      <p className="section-label">Archive Empty</p>
                      <h3>No sticky notes have been completed yet.</h3>
                      <p className="muted">
                        When a sticky note is marked as done, it will disappear from the active board and show up here.
                      </p>
                    </div>
                  ) : (
                    <div className="notes-grid" role="list" aria-label="Archived sticky notes">
                      {archivedStickyNotes.map((note) => (
                        <article className="sticky-note-card done" key={note.id} style={{ background: note.color }} role="listitem" tabIndex={0}>
                          <div className="sticky-note-meta">
                            <span>{note.assignedPersonName ?? "Unassigned"}</span>
                            <span>{note.createdByUserName}</span>
                          </div>
                          <div className="done-badge">Done</div>
                          <h4>{note.title}</h4>
                          <SafeNoteContent html={note.content} />
                          <div className="sticky-note-footer">
                            <span className="sticky-note-time">{new Date(note.updatedAt).toLocaleDateString()}</span>
                            {canManageStickyNote(note) ? (
                              <div className="note-card-actions">
                                <button
                                  type="button"
                                  className="note-delete-button"
                                  aria-label={`Delete note: ${note.title}`}
                                  onClick={() => void handleDeleteStickyNote(note.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              ) : null}

              {workspaceTab === "noteAssignments" ? (
                <>
                  <div className="section-row">
                    <div>
                      <p className="section-label">Note Assignments</p>
                      <h3>See how many sticky notes are assigned to each person</h3>
                    </div>
                    <div className="notes-toolbar">
                      <div className="notes-counter">{activeStickyNotes.length}</div>
                      <button className="ghost-button" type="button" onClick={() => token && void loadStickyNotes(token)}>
                        Refresh
                      </button>
                    </div>
                  </div>

                  <div className="assignment-grid">
                    {assignmentRows.map((person) => (
                      <article className="assignment-summary-card" key={person.id}>
                        <p className="section-label">{person.role}</p>
                        <h3>{person.fullName}</h3>
                        <div className="assignment-count">{person.noteCount}</div>
                        <p className="muted">
                          {person.noteCount === 1 ? "sticky note assigned" : "sticky notes assigned"}
                        </p>
                      </article>
                    ))}
                  </div>

                  {stickyNotes.length === 0 ? (
                    <div className="notes-empty-state assignments-empty-state">
                      <p className="section-label">Nothing Assigned Yet</p>
                      <h3>Create sticky notes to see assignment totals here.</h3>
                      <p className="muted">
                        As soon as notes are assigned to people, this tab will show the load per user.
                      </p>
                    </div>
                  ) : null}
                </>
              ) : null}

              {workspaceTab === "statistics" ? (
                <>
                  <div className="section-row">
                    <div>
                      <p className="section-label">Statistics</p>
                      <h3>Track sticky note progress across the workspace</h3>
                    </div>
                    <div className="notes-toolbar">
                      <div className="notes-counter">{statisticsDoneStickyNotesCount}/{statisticsStickyNotes.length || 0}</div>
                      <button className="ghost-button" type="button" onClick={() => token && void loadStickyNotes(token)}>
                        Refresh
                      </button>
                    </div>
                  </div>

                  {statisticsStickyNotes.length === 0 ? (
                    <div className="notes-empty-state assignments-empty-state">
                      <p className="section-label">No Statistics Yet</p>
                      <h3>Create sticky notes to populate this dashboard.</h3>
                      <p className="muted">
                        Once notes exist, this tab will show how many are done, still open, and the completion rate.
                      </p>
                    </div>
                  ) : (
                    <div className="stats-grid">
                      <article className="stat-card">
                        <p className="section-label">Total</p>
                        <div className="stat-value">{statisticsStickyNotes.length}</div>
                        <p className="muted">sticky notes created</p>
                      </article>

                      <article className="stat-card">
                        <p className="section-label">Done</p>
                        <div className="stat-value">{statisticsDoneStickyNotesCount}</div>
                        <p className="muted">sticky notes completed</p>
                      </article>

                      <article className="stat-card">
                        <p className="section-label">Open</p>
                        <div className="stat-value">{statisticsOpenStickyNotesCount}</div>
                        <p className="muted">sticky notes still in progress</p>
                      </article>

                      <article className="stat-card">
                        <p className="section-label">Completion</p>
                        <div className="stat-value">{statisticsCompletionRate}%</div>
                        <p className="muted">completion rate across all notes</p>
                      </article>
                    </div>
                  )}
                </>
              ) : null}
            </section>

          {userPendingDelete ? (
            <div className="modal-backdrop" onClick={handleCloseDeleteUserModal}>
              <div
                className="modal-card delete-modal-card"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-user-modal-title"
              >
                <div className="modal-header">
                  <div>
                    <p className="section-label danger-label">Delete User</p>
                    <h3 id="delete-user-modal-title">{userPendingDelete.fullName}</h3>
                    <p className="muted">{userPendingDelete.email}</p>
                  </div>
                  <button
                    className="ghost-button modal-close"
                    type="button"
                    onClick={handleCloseDeleteUserModal}
                  >
                    Close
                  </button>
                </div>

                <div className="delete-modal-body">
                  <p className="delete-modal-lead">
                    This action permanently removes the user account from the workspace.
                  </p>
                  <div className="delete-impact-card">
                    <p>Deleting this user will also:</p>
                    <ul className="delete-impact-list">
                      <li>remove sticky notes created by this user</li>
                      <li>unassign sticky notes currently assigned to this user</li>
                      <li>remove the user from the People and Person views</li>
                    </ul>
                  </div>
                </div>

                {deleteUserError ? <p className="notice error">{deleteUserError}</p> : null}

                <div className="modal-actions">
                  <button className="ghost-button" type="button" onClick={handleCloseDeleteUserModal}>
                    Cancel
                  </button>
                  <button className="danger-button" type="button" onClick={() => void handleDeleteUser()}>
                    Delete User
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      )}

      <style>{`
        .shell {
          width: min(1180px, calc(100vw - 2rem));
          margin: 0 auto;
          padding: 3rem 0 4rem;
        }

        .hero {
          padding: 1rem 0 2.5rem;
        }

        .eyebrow,
        .section-label {
          margin: 0 0 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          color: var(--brand);
          font-size: 0.78rem;
        }

        h1,
        h2,
        h3,
        h4,
        p {
          margin: 0;
        }

        h1 {
          max-width: 11ch;
          font-size: clamp(3rem, 7vw, 5.4rem);
          line-height: 0.95;
        }

        h2 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        h3 {
          font-size: 1.35rem;
          margin-bottom: 1.2rem;
        }

        h4 {
          font-size: 1.1rem;
          margin-bottom: 0.35rem;
        }

        .muted {
          color: var(--text-soft);
        }

        .hero-links {
          display: flex;
          gap: 1rem;
          margin-top: 1.6rem;
        }

        .panel {
          border: 1px solid var(--line);
          background: linear-gradient(180deg, rgba(16, 34, 24, 0.94), rgba(9, 19, 14, 0.96));
          border-radius: 28px;
          padding: 1.5rem;
          box-shadow: var(--shadow);
          backdrop-filter: blur(18px);
        }

        .auth-panel {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 2rem;
        }

        .dashboard {
          display: grid;
          gap: 1.5rem;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stack {
          display: grid;
          gap: 1rem;
        }

        .tabs {
          display: inline-flex;
          gap: 0.6rem;
          padding: 0.35rem;
          margin-bottom: 1.4rem;
          border-radius: 18px;
          border: 1px solid var(--line);
          background: rgba(6, 14, 10, 0.76);
        }

        .tab-button {
          background: transparent;
          color: var(--text-soft);
          padding: 0.75rem 1rem;
          border: 1px solid transparent;
        }

        .tab-button.active {
          color: var(--text);
          background: rgba(99, 242, 159, 0.14);
          border-color: var(--line-strong);
        }

        .section-row {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: center;
          margin-bottom: 1rem;
        }

        label {
          display: grid;
          gap: 0.45rem;
        }

        label span {
          color: var(--text-soft);
          font-size: 0.95rem;
        }

        input,
        select,
        textarea {
          width: 100%;
          border-radius: 16px;
          border: 1px solid var(--line);
          background: rgba(5, 13, 9, 0.9);
          padding: 0.95rem 1rem;
          color: var(--text);
          transition: border-color 0.2s ease, transform 0.2s ease;
        }

        textarea {
          resize: vertical;
          min-height: 120px;
        }

        input:focus,
        select:focus,
        textarea:focus {
          outline: none;
          border-color: var(--brand-strong);
          transform: translateY(-1px);
        }

        button {
          border: 0;
          border-radius: 16px;
          background: linear-gradient(135deg, var(--brand-strong), var(--brand));
          color: #041008;
          padding: 0.95rem 1.15rem;
          font-weight: 700;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .ghost-button {
          background: transparent;
          color: var(--text);
          border: 1px solid var(--line-strong);
        }

        .notice {
          margin: 0 0 1rem;
          padding: 0.9rem 1rem;
          border-radius: 14px;
          background: rgba(47, 95, 66, 0.28);
          color: var(--text);
        }

        .error {
          background: rgba(122, 33, 38, 0.45);
          color: #ffd7d9;
        }

        .role-chip {
          display: inline-flex;
          align-items: center;
          padding: 0.2rem 0.55rem;
          margin-left: 0.45rem;
          border-radius: 999px;
          background: rgba(99, 242, 159, 0.14);
          color: var(--brand);
          border: 1px solid var(--line);
        }

        .people-list {
          display: grid;
          gap: 0.9rem;
        }

        .person-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-radius: 18px;
          border: 1px solid rgba(107, 255, 173, 0.1);
          background: rgba(8, 16, 12, 0.84);
        }

        .person-actions {
          width: min(200px, 100%);
        }

        .person-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.25rem;
        }

        .notes-layout {
          display: grid;
          grid-template-columns: minmax(300px, 360px) 1fr;
          gap: 1.25rem;
        }

        .note-create-card {
          border: 1px solid rgba(107, 255, 173, 0.1);
          border-radius: 22px;
          background: rgba(8, 16, 12, 0.84);
          padding: 1rem;
        }

        .notes-board {
          display: grid;
          gap: 1rem;
        }

        .notes-toolbar {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .notes-counter {
          min-width: 72px;
          text-align: center;
          padding: 0.75rem 0.95rem;
          border-radius: 16px;
          border: 1px solid var(--line-strong);
          background: rgba(8, 16, 12, 0.84);
          color: var(--brand);
          font-weight: 700;
        }

        .notes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
        }

        .sticky-note-card {
          min-height: 220px;
          border-radius: 22px;
          padding: 1rem;
          color: #f3f8ef;
          box-shadow: 0 24px 45px rgba(0, 0, 0, 0.25);
          display: grid;
          align-content: start;
          gap: 0.8rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          transform: rotate(-1.2deg);
        }

        .sticky-note-card.done {
          opacity: 0.78;
          filter: saturate(0.7);
        }

        .sticky-note-card:nth-child(even) {
          transform: rotate(1.1deg);
        }

        .sticky-note-card p {
          white-space: pre-wrap;
        }

        .sticky-note-footer {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
        }

        .sticky-note-time {
          font-size: 0.8rem;
          color: rgba(243, 248, 239, 0.82);
        }

        .note-card-actions {
          display: flex;
          gap: 0.6rem;
          align-items: center;
        }

        .note-done-button,
        .note-delete-button {
          padding: 0.7rem 0.9rem;
        }

        .note-done-button {
          background: rgba(99, 242, 159, 0.2);
          color: #f3f8ef;
          border: 1px solid rgba(255, 255, 255, 0.18);
        }

        .note-delete-button {
          background: rgba(4, 10, 7, 0.4);
          color: #f3f8ef;
          border: 1px solid rgba(255, 255, 255, 0.18);
        }

        .done-badge {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          padding: 0.35rem 0.65rem;
          border-radius: 999px;
          background: rgba(243, 248, 239, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #f3f8ef;
          font-size: 0.8rem;
          font-weight: 700;
        }

        .sticky-note-meta {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          font-size: 0.82rem;
          color: rgba(243, 248, 239, 0.82);
        }

        .color-picker {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
        }

        .color-swatch {
          width: 42px;
          height: 42px;
          padding: 0;
          border-radius: 14px;
          border: 2px solid transparent;
        }

        .color-swatch.active {
          border-color: #eefcf3;
          box-shadow: 0 0 0 3px rgba(99, 242, 159, 0.18);
        }

        .notes-empty-state {
          min-height: 320px;
          display: grid;
          align-content: center;
          justify-items: start;
          gap: 0.85rem;
          padding: 2rem;
          border-radius: 28px;
          border: 1px dashed var(--line-strong);
          background:
            radial-gradient(circle at top left, rgba(99, 242, 159, 0.12), transparent 28%),
            linear-gradient(180deg, rgba(11, 22, 16, 0.94), rgba(6, 13, 10, 0.96));
        }

        .assignment-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
        }

        .assignment-summary-card {
          border: 1px solid rgba(107, 255, 173, 0.1);
          border-radius: 22px;
          background:
            radial-gradient(circle at top right, rgba(99, 242, 159, 0.08), transparent 28%),
            rgba(8, 16, 12, 0.84);
          padding: 1rem;
          display: grid;
          gap: 0.75rem;
        }

        .stat-card {
          border: 1px solid rgba(107, 255, 173, 0.1);
          border-radius: 22px;
          background:
            radial-gradient(circle at top right, rgba(99, 242, 159, 0.08), transparent 28%),
            rgba(8, 16, 12, 0.84);
          padding: 1rem;
          display: grid;
          gap: 0.75rem;
        }

        .assignment-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 72px;
          height: 72px;
          border-radius: 20px;
          background: rgba(99, 242, 159, 0.14);
          color: var(--brand);
          font-size: 1.8rem;
          font-weight: 700;
          border: 1px solid var(--line-strong);
        }

        .stat-value {
          font-size: 2.6rem;
          line-height: 1;
          color: var(--brand);
          font-weight: 700;
        }

        .assignments-empty-state {
          margin-top: 1rem;
          min-height: 220px;
        }

        .person-summary-card {
          border: 1px solid rgba(107, 255, 173, 0.1);
          border-radius: 22px;
          background: rgba(8, 16, 12, 0.84);
          padding: 1rem;
          display: grid;
          gap: 1rem;
        }

        .person-summary-head {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: flex-start;
        }

        .person-address-preview {
          display: grid;
          gap: 0.2rem;
          color: var(--text-soft);
          min-height: 7.5rem;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(1, 6, 3, 0.72);
          display: grid;
          place-items: center;
          padding: 1.5rem;
          z-index: 50;
          backdrop-filter: blur(10px);
        }

	        .modal-card {
	          width: min(820px, 100%);
          max-height: min(90vh, 920px);
          overflow: auto;
          border: 1px solid var(--line-strong);
          border-radius: 28px;
          background: linear-gradient(180deg, rgba(16, 34, 24, 0.98), rgba(7, 15, 11, 0.98));
          box-shadow: var(--shadow);
	          padding: 1.5rem;
	        }

	        .delete-modal-card {
	          width: min(560px, 100%);
	        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .modal-close {
          padding: 0.8rem 1rem;
        }

	        .modal-actions {
	          display: flex;
	          justify-content: flex-end;
	          gap: 0.8rem;
	        }

	        .danger-label {
	          color: #ff9b9f;
	        }

	        .delete-modal-body {
	          display: grid;
	          gap: 1rem;
	          margin-bottom: 1.25rem;
	        }

	        .delete-modal-lead {
	          color: var(--text);
	          font-size: 1.02rem;
	        }

	        .delete-impact-card {
	          display: grid;
	          gap: 0.75rem;
	          padding: 1rem;
	          border-radius: 20px;
	          border: 1px solid rgba(255, 123, 129, 0.2);
	          background: linear-gradient(180deg, rgba(62, 18, 21, 0.46), rgba(25, 9, 11, 0.58));
	        }

	        .delete-impact-list {
	          margin: 0;
	          padding-left: 1.1rem;
	          color: #ffd7d9;
	        }

	        .delete-impact-list li + li {
	          margin-top: 0.45rem;
	        }

	        .danger-button {
	          background: linear-gradient(135deg, #ff868c, #ff6a72);
	          color: #210507;
	        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }

        @media (max-width: 900px) {
          .auth-panel,
          .form-grid,
          .notes-layout {
            grid-template-columns: 1fr;
          }

          .dashboard-header,
          .person-card,
          .section-row,
          .person-summary-head,
          .modal-header,
          .modal-actions,
          .notes-toolbar,
          .sticky-note-footer,
          .note-card-actions {
            align-items: flex-start;
            flex-direction: column;
          }

          .tabs {
            width: 100%;
            display: grid;
          }

          .shell {
            padding-top: 2rem;
          }
        }
      `}</style>
    </main>
  );
}
