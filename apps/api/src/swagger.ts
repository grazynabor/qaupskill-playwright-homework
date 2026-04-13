export const createOpenApiSpec = () => ({
  openapi: "3.0.3",
  info: {
    title: "QA Upskill API",
    version: "1.0.0",
    description: "Bearer-token authenticated REST API for QA Upskill user and role management."
  },
  servers: [
    {
      url: "http://localhost:4000",
      description: "Local API server"
    }
  ],
  tags: [
    { name: "Auth" },
    { name: "People" },
    { name: "Person Records" },
    { name: "Sticky Notes" }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    },
    schemas: {
      Role: {
        type: "string",
        enum: ["User", "Admin", "Configurator"]
      },
      Person: {
        type: "object",
        required: ["id", "fullName", "email", "role", "createdAt"],
        properties: {
          id: { type: "integer", example: 1 },
          fullName: { type: "string", example: "Jane Admin" },
          email: { type: "string", format: "email", example: "jane@example.com" },
          role: { $ref: "#/components/schemas/Role" },
          createdAt: { type: "string", format: "date-time" }
        }
      },
      PersonDetails: {
        type: "object",
        required: ["addressLine1", "addressLine2", "city", "postalCode", "country", "phone", "notes"],
        properties: {
          addressLine1: { type: "string", example: "221B Baker Street" },
          addressLine2: { type: "string", example: "Apartment 3" },
          city: { type: "string", example: "London" },
          postalCode: { type: "string", example: "NW1" },
          country: { type: "string", example: "United Kingdom" },
          phone: { type: "string", example: "+44 20 0000 0000" },
          notes: { type: "string", example: "QA training profile." }
        }
      },
      PersonRecord: {
        allOf: [
          { $ref: "#/components/schemas/Person" },
          { $ref: "#/components/schemas/PersonDetails" }
        ]
      },
      StickyNote: {
        type: "object",
        required: [
          "id",
          "title",
          "content",
          "color",
          "isDone",
          "assignedPersonId",
          "assignedPersonName",
          "createdByUserId",
          "createdByUserName",
          "createdAt",
          "updatedAt"
        ],
        properties: {
          id: { type: "integer", example: 1 },
          title: { type: "string", example: "Regression reminder" },
          content: { type: "string", example: "Check the checkout flow after the next deploy." },
          color: { type: "string", example: "#26482d" },
          isDone: { type: "boolean", example: false },
          assignedPersonId: { type: "integer", nullable: true, example: 2 },
          assignedPersonName: { type: "string", nullable: true, example: "Alex Tester" },
          createdByUserId: { type: "integer", example: 1 },
          createdByUserName: { type: "string", example: "QA Admin" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        }
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", format: "password", minLength: 8 }
        }
      },
      LoginResponse: {
        type: "object",
        required: ["token", "user"],
        properties: {
          token: { type: "string" },
          user: { $ref: "#/components/schemas/Person" }
        }
      },
      CreatePersonRequest: {
        type: "object",
        required: ["fullName", "email", "password", "role"],
        properties: {
          fullName: { type: "string", example: "Alex Tester" },
          email: { type: "string", format: "email" },
          password: { type: "string", format: "password", minLength: 8 },
          role: { $ref: "#/components/schemas/Role" }
        }
      },
      UpdateRoleRequest: {
        type: "object",
        required: ["role"],
        properties: {
          role: { $ref: "#/components/schemas/Role" }
        }
      },
      UpdatePersonDetailsRequest: {
        allOf: [{ $ref: "#/components/schemas/PersonDetails" }]
      },
      CreateStickyNoteRequest: {
        type: "object",
        required: ["title", "content", "color", "assignedUserId"],
        properties: {
          title: { type: "string", example: "Login checklist" },
          content: { type: "string", example: "Validate bearer token expiry in the QA environment." },
          color: { type: "string", enum: ["#19352a", "#26482d", "#3b5c29", "#4d5b1f", "#3f2a4c"] },
          assignedUserId: { type: "integer", nullable: true, example: 2 }
        }
      },
      UpdateStickyNoteDoneRequest: {
        type: "object",
        required: ["done"],
        properties: {
          done: { type: "boolean", example: true }
        }
      },
      ErrorResponse: {
        type: "object",
        required: ["message"],
        properties: {
          message: { type: "string" }
        }
      }
    }
  },
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: {
          "200": {
            description: "API is running"
          }
        }
      }
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in with email and password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Authenticated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" }
              }
            }
          },
          "401": {
            description: "Invalid credentials",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" }
              }
            }
          }
        }
      }
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Return the authenticated user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Current user",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Person" }
              }
            }
          },
          "401": {
            description: "Unauthorized"
          }
        }
      }
    },
    "/people": {
      get: {
        tags: ["People"],
        summary: "List all people",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "People list",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Person" }
                }
              }
            }
          },
          "403": {
            description: "Admin role required"
          }
        }
      },
      post: {
        tags: ["People"],
        summary: "Create a new person",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreatePersonRequest" }
            }
          }
        },
        responses: {
          "201": {
            description: "Person created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Person" }
              }
            }
          },
          "409": {
            description: "Email already exists"
          }
        }
      }
    },
    "/people-directory": {
      get: {
        tags: ["People"],
        summary: "List assignable people for authenticated users",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Directory of users",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Person" }
                }
              }
            }
          }
        }
      }
    },
    "/people/{id}/role": {
      patch: {
        tags: ["People"],
        summary: "Update an existing person's role",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "integer" }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateRoleRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Role updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Person" }
              }
            }
          },
          "404": {
            description: "Person not found"
          }
        }
      }
    },
    "/people/{id}": {
      delete: {
        tags: ["People"],
        summary: "Delete an existing person",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "integer" }
          }
        ],
        responses: {
          "204": {
            description: "Person deleted"
          },
          "404": {
            description: "Person not found"
          },
          "409": {
            description: "Admin cannot delete the currently authenticated account"
          },
          "403": {
            description: "Admin role required"
          }
        }
      }
    },
    "/notes": {
      get: {
        tags: ["Sticky Notes"],
        summary: "List sticky notes for authenticated users",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Sticky notes",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/StickyNote" }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ["Sticky Notes"],
        summary: "Create a sticky note and optionally assign a person",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateStickyNoteRequest" }
            }
          }
        },
        responses: {
          "201": {
            description: "Sticky note created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StickyNote" }
              }
            }
          },
          "404": {
            description: "Assigned person not found"
          },
          "409": {
            description: "Sticky note limit reached"
          }
        }
      }
    },
    "/notes/{id}": {
      delete: {
        tags: ["Sticky Notes"],
        summary: "Delete a sticky note",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "integer" }
          }
        ],
        responses: {
          "204": {
            description: "Sticky note deleted"
          },
          "404": {
            description: "Sticky note not found"
          },
          "403": {
            description: "Only the note creator, Admin, or Configurator can delete a sticky note"
          }
        }
      }
    },
    "/notes/{id}/done": {
      patch: {
        tags: ["Sticky Notes"],
        summary: "Update sticky note done status",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "integer" }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateStickyNoteDoneRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Sticky note updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StickyNote" }
              }
            }
          },
          "404": {
            description: "Sticky note not found"
          },
          "403": {
            description: "Only the note creator, Admin, or Configurator can update sticky note status"
          }
        }
      }
    },
    "/person-records": {
      get: {
        tags: ["Person Records"],
        summary: "List person records with detailed profile data",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Person records",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/PersonRecord" }
                }
              }
            }
          },
          "403": {
            description: "Admin or Configurator role required"
          }
        }
      }
    },
    "/person-records/{id}": {
      put: {
        tags: ["Person Records"],
        summary: "Update a person's detailed profile data",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "integer" }
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdatePersonDetailsRequest" }
            }
          }
        },
        responses: {
          "200": {
            description: "Person details updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PersonRecord" }
              }
            }
          },
          "404": {
            description: "Person not found"
          }
        }
      }
    }
  }
});
