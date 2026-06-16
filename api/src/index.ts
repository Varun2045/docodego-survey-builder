import type {
  DbQuestion,
  DbResponse,
  DbSurvey,
  DbUser,
  LogicRule,
  Question,
  QuestionType,
  Survey,
} from "@survey/types";
import { Hono } from "hono";
import type { Context, Next } from "hono";
import { cors } from "hono/cors";
import { sign, verify } from "hono/jwt";

// Define Cloudflare Workers bindings and Hono variables
type Bindings = {
  DB: D1Database;
  BUCKET?: R2Bucket;
};

type Variables = {
  userId: string;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Enable CORS for frontend integration
app.use("*", cors());

// JWT Secret Key (Use env variable if available, fallback for local dev)
const JWT_SECRET = "super-secret-key-change-me-in-production";

// PBKDF2 Password Hashing Helpers
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    passwordKey,
    256,
  );

  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${saltHex}:${hashHex}`;
}

async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(":");
  if (!saltHex || !hashHex) return false;

  const match = saltHex.match(/.{1,2}/g);
  if (!match) return false;
  const salt = new Uint8Array(match.map((byte) => Number.parseInt(byte, 16)));
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    passwordKey,
    256,
  );

  const hashHexToVerify = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashHexToVerify === hashHex;
}

// Authentication Middleware
const authMiddleware = async (
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next,
) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized: Missing or invalid token" }, 401);
  }

  const token = authHeader.substring(7);
  try {
    const payload = await verify(token, JWT_SECRET, "HS256");
    if (!payload.sub) {
      return c.json({ error: "Unauthorized: Invalid token payload" }, 401);
    }
    c.set("userId", payload.sub as string);
  } catch (err) {
    return c.json({ error: "Unauthorized: Invalid token" }, 401);
  }

  await next();
};

// Apply Auth Middleware to all survey endpoints, handling exceptions for public endpoints inside middleware.
app.use("/api/surveys/*", async (c, next) => {
  const method = c.req.method;
  const path = c.req.path;

  // GET /api/surveys/:id is public (to view questions for taking a survey)
  const isPublicSurveyDetails =
    method === "GET" && /^\/api\/surveys\/[^\/]+$/.test(path);

  // POST /api/surveys/:id/responses is public (to submit a response anonymously)
  const isPublicResponseSubmit =
    method === "POST" && /^\/api\/surveys\/[^\/]+\/responses$/.test(path);

  if (isPublicSurveyDetails || isPublicResponseSubmit) {
    return await next();
  }

  return authMiddleware(c, next);
});

// Explicitly protect the base surveys route (since /api/surveys doesn't match /api/surveys/*)
app.use("/api/surveys", authMiddleware);

// --- Auth Routes ---

// POST /api/auth/register
app.post("/api/auth/register", async (c) => {
  let body: { username?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { username, password } = body;

  if (!username || typeof username !== "string" || username.trim().length < 3) {
    return c.json(
      { error: "Username must be at least 3 characters long" },
      400,
    );
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return c.json(
      { error: "Password must be at least 6 characters long" },
      400,
    );
  }

  const normalizedUsername = username.trim().toLowerCase();

  try {
    // Check if user already exists
    const existingUser = await c.env.DB.prepare(
      "SELECT 1 FROM users WHERE username = ?",
    )
      .bind(normalizedUsername)
      .first();

    if (existingUser) {
      const suggestions = [
        `${normalizedUsername}_dev`,
        `${normalizedUsername}_built`,
        `${normalizedUsername}${Math.floor(100 + Math.random() * 900)}`,
      ];
      return c.json(
        {
          error: "Username is already taken",
          usernameTaken: true,
          suggestions,
        },
        400,
      );
    }

    // Hash the password and insert the new user
    const passwordHash = await hashPassword(password);
    const userId = crypto.randomUUID();

    await c.env.DB.prepare(
      "INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)",
    )
      .bind(userId, normalizedUsername, passwordHash)
      .run();

    // Generate JWT
    const token = await sign(
      {
        sub: userId,
        username: normalizedUsername,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
      },
      JWT_SECRET,
      "HS256",
    );

    return c.json(
      {
        token,
        user: {
          id: userId,
          username: normalizedUsername,
          created_at: new Date().toISOString(),
        },
      },
      201,
    );
  } catch (error) {
    console.error("Registration failed:", error);
    return c.json({ error: "Failed to register user" }, 500);
  }
});

// POST /api/auth/login
app.post("/api/auth/login", async (c) => {
  let body: { username?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { username, password } = body;

  if (
    !username ||
    typeof username !== "string" ||
    !password ||
    typeof password !== "string"
  ) {
    return c.json({ error: "Username and password are required" }, 400);
  }

  const normalizedUsername = username.trim().toLowerCase();

  try {
    // Retrieve user from DB
    const user = await c.env.DB.prepare(
      "SELECT * FROM users WHERE username = ?",
    )
      .bind(normalizedUsername)
      .first<DbUser>();

    if (!user) {
      return c.json({ error: "Invalid username or password" }, 401);
    }

    // Verify password
    const isPasswordCorrect = await verifyPassword(
      password,
      user.password_hash,
    );
    if (!isPasswordCorrect) {
      return c.json({ error: "Invalid username or password" }, 401);
    }

    // Generate JWT
    const token = await sign(
      {
        sub: user.id,
        username: user.username,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
      },
      JWT_SECRET,
      "HS256",
    );

    return c.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error("Login failed:", error);
    return c.json({ error: "Failed to log in" }, 500);
  }
});

// GET /api/surveys - Fetch all surveys for the current user
app.get("/api/surveys", async (c) => {
  const userId = c.get("userId");

  try {
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM surveys WHERE user_id = ? ORDER BY created_at DESC",
    )
      .bind(userId)
      .all<DbSurvey>();

    return c.json(results);
  } catch (error) {
    return c.json({ error: "Failed to fetch surveys" }, 500);
  }
});

// POST /api/surveys - Create a new survey
app.post("/api/surveys", async (c) => {
  const userId = c.get("userId");
  let body: { title?: string; primary_color?: string; logo_url?: string };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { title, primary_color, logo_url } = body;

  if (!title || typeof title !== "string" || title.trim() === "") {
    return c.json({ error: "Title is required" }, 400);
  }

  const id = crypto.randomUUID();

  try {
    await c.env.DB.prepare(
      "INSERT INTO surveys (id, user_id, title, primary_color, logo_url, is_open, font_family, bg_style) VALUES (?, ?, ?, ?, ?, 1, 'sans', 'tinted')",
    )
      .bind(
        id,
        userId,
        title.trim(),
        primary_color?.trim() || null,
        logo_url?.trim() || null,
      )
      .run();

    const newSurvey: Survey = {
      id,
      user_id: userId,
      title: title.trim(),
      primary_color: primary_color?.trim() || null,
      logo_url: logo_url?.trim() || null,
      is_open: 1,
      font_family: "sans",
      bg_style: "tinted",
      created_at: new Date().toISOString(), // D1 will write CURRENT_TIMESTAMP, but return matches type
    };

    return c.json(newSurvey, 201);
  } catch (error) {
    console.error("Failed to create survey:", error);
    return c.json({ error: "Failed to create survey" }, 500);
  }
});

// PUT /api/surveys/:id - Update survey branding and title
app.put("/api/surveys/:id", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  let body: {
    title?: string;
    primary_color?: string;
    logo_url?: string;
    is_open?: number;
    font_family?: string;
    bg_style?: string;
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  try {
    const currentSurvey = await c.env.DB.prepare(
      "SELECT * FROM surveys WHERE id = ? AND user_id = ?",
    )
      .bind(id, userId)
      .first<DbSurvey>();

    if (!currentSurvey) {
      return c.json({ error: "Survey not found or access denied" }, 404);
    }

    const { title, primary_color, logo_url, is_open, font_family, bg_style } =
      body;

    const newTitle =
      title !== undefined && title !== null
        ? title.trim()
        : currentSurvey.title;
    const newColor =
      primary_color !== undefined && primary_color !== null
        ? primary_color.trim()
        : primary_color === null
          ? null
          : currentSurvey.primary_color;
    const newLogo =
      logo_url !== undefined && logo_url !== null
        ? logo_url.trim()
        : logo_url === null
          ? null
          : currentSurvey.logo_url;
    const newIsOpen =
      is_open !== undefined && is_open !== null
        ? is_open
        : currentSurvey.is_open;
    const newFont =
      font_family !== undefined && font_family !== null
        ? font_family.trim()
        : currentSurvey.font_family;
    const newBgStyle =
      bg_style !== undefined && bg_style !== null
        ? bg_style.trim()
        : currentSurvey.bg_style;

    if (!newTitle) {
      return c.json({ error: "Title cannot be empty" }, 400);
    }

    await c.env.DB.prepare(
      "UPDATE surveys SET title = ?, primary_color = ?, logo_url = ?, is_open = ?, font_family = ?, bg_style = ? WHERE id = ? AND user_id = ?",
    )
      .bind(
        newTitle,
        newColor,
        newLogo,
        newIsOpen,
        newFont,
        newBgStyle,
        id,
        userId,
      )
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to update survey:", error);
    return c.json({ error: "Failed to update survey" }, 500);
  }
});

// DELETE /api/surveys/:id - Delete survey (Protected)
app.delete("/api/surveys/:id", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");

  try {
    // Verify survey exists and belongs to the active user
    const survey = await c.env.DB.prepare(
      "SELECT 1 FROM surveys WHERE id = ? AND user_id = ?",
    )
      .bind(id, userId)
      .first();

    if (!survey) {
      return c.json({ error: "Survey not found or access denied" }, 404);
    }

    await c.env.DB.prepare("DELETE FROM surveys WHERE id = ?").bind(id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to delete survey:", error);
    return c.json({ error: "Failed to delete survey" }, 500);
  }
});

// GET /api/surveys/:id - Fetch a survey by ID along with its sorted questions
app.get("/api/surveys/:id", async (c) => {
  const id = c.req.param("id");

  try {
    // 1. Fetch the survey
    const survey = await c.env.DB.prepare("SELECT * FROM surveys WHERE id = ?")
      .bind(id)
      .first<DbSurvey>();

    if (!survey) {
      return c.json({ error: "Survey not found" }, 404);
    }

    // 2. Fetch the questions sorted by order_index
    const { results: dbQuestions } = await c.env.DB.prepare(
      "SELECT * FROM questions WHERE survey_id = ? ORDER BY order_index ASC",
    )
      .bind(id)
      .all<DbQuestion>();

    // 3. Map questions to application type (parsing JSON options and logic_rule)
    const questions: Question[] = dbQuestions.map((q) => {
      let optionsArray: string[] | null = null;
      if (q.options) {
        try {
          optionsArray = JSON.parse(q.options);
        } catch {
          // Fallback if DB contains invalid JSON
          optionsArray = [];
        }
      }

      let parsedLogicRule = null;
      if (q.logic_rule) {
        try {
          parsedLogicRule = JSON.parse(q.logic_rule);
        } catch {
          parsedLogicRule = null;
        }
      }

      return {
        id: q.id,
        survey_id: q.survey_id,
        type: q.type,
        text: q.text,
        order_index: q.order_index,
        options: optionsArray,
        logic_rule: parsedLogicRule,
      };
    });

    return c.json({
      ...survey,
      questions,
    });
  } catch (error) {
    console.error("Failed to fetch survey details:", error);
    return c.json({ error: "Failed to fetch survey details" }, 500);
  }
});

// PUT /api/surveys/:id/questions - Bulk update questions for a survey
app.put("/api/surveys/:id/questions", async (c) => {
  const surveyId = c.req.param("id");
  const userId = c.get("userId");
  let body: {
    questions?: Array<{
      id?: string;
      type: QuestionType;
      text: string;
      order_index: number;
      options?: string[] | null;
      logic_rule?: LogicRule | null;
    }>;
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { questions } = body;

  if (!questions || !Array.isArray(questions)) {
    return c.json({ error: "Questions array is required" }, 400);
  }

  try {
    // Verify survey exists and belongs to active user before modifying questions
    const surveyExists = await c.env.DB.prepare(
      "SELECT 1 FROM surveys WHERE id = ? AND user_id = ?",
    )
      .bind(surveyId, userId)
      .first();

    if (!surveyExists) {
      return c.json({ error: "Survey not found or access denied" }, 404);
    }

    // Prepare batch operations
    const statements = [
      c.env.DB.prepare("DELETE FROM questions WHERE survey_id = ?").bind(
        surveyId,
      ),
    ];

    const updatedQuestions: Question[] = [];

    for (const q of questions) {
      if (!q.text || typeof q.text !== "string") {
        return c.json({ error: "Question text is required" }, 400);
      }
      if (
        !q.type ||
        ![
          "short_text",
          "long_text",
          "multiple_choice",
          "single_select",
          "rating",
          "matrix",
          "date",
        ].includes(q.type)
      ) {
        return c.json({ error: `Invalid question type: ${q.type}` }, 400);
      }

      const qId = q.id || crypto.randomUUID();
      const stringifiedOptions = q.options ? JSON.stringify(q.options) : null;
      const stringifiedLogic = q.logic_rule
        ? JSON.stringify(q.logic_rule)
        : null;

      statements.push(
        c.env.DB.prepare(
          "INSERT INTO questions (id, survey_id, type, text, order_index, options, logic_rule) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ).bind(
          qId,
          surveyId,
          q.type,
          q.text,
          q.order_index,
          stringifiedOptions,
          stringifiedLogic,
        ),
      );

      updatedQuestions.push({
        id: qId,
        survey_id: surveyId,
        type: q.type,
        text: q.text,
        order_index: q.order_index,
        options: q.options || null,
        logic_rule: q.logic_rule || null,
      });
    }

    // Execute in a single transactional batch
    await c.env.DB.batch(statements);

    return c.json({ questions: updatedQuestions });
  } catch (error) {
    console.error("Failed to update questions:", error);
    return c.json({ error: "Failed to update questions" }, 500);
  }
});

// POST /api/surveys/:id/responses - Submit response anonymously (Public)
app.post("/api/surveys/:id/responses", async (c) => {
  const surveyId = c.req.param("id");
  let body: { answers?: Record<string, string | number | string[]> };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { answers } = body;

  if (!answers || typeof answers !== "object") {
    return c.json({ error: "Answers object is required" }, 400);
  }

  try {
    const survey = await c.env.DB.prepare(
      "SELECT is_open FROM surveys WHERE id = ?",
    )
      .bind(surveyId)
      .first<DbSurvey>();

    if (!survey) {
      return c.json({ error: "Survey not found" }, 404);
    }

    if (survey.is_open === 0) {
      return c.json(
        {
          error: "This survey is currently closed and not accepting responses",
        },
        400,
      );
    }

    const id = crypto.randomUUID();
    const stringifiedAnswers = JSON.stringify(answers);

    await c.env.DB.prepare(
      "INSERT INTO responses (id, survey_id, answers) VALUES (?, ?, ?)",
    )
      .bind(id, surveyId, stringifiedAnswers)
      .run();

    return c.json({ success: true, id }, 201);
  } catch (error) {
    console.error("Failed to submit response:", error);
    return c.json({ error: "Failed to submit response" }, 500);
  }
});

// GET /api/surveys/:id/responses - Retrieve responses (Protected)
app.get("/api/surveys/:id/responses", async (c) => {
  const surveyId = c.req.param("id");
  const userId = c.get("userId");

  try {
    // Verify survey exists and belongs to the active user
    const survey = await c.env.DB.prepare(
      "SELECT 1 FROM surveys WHERE id = ? AND user_id = ?",
    )
      .bind(surveyId, userId)
      .first();

    if (!survey) {
      return c.json({ error: "Survey not found or access denied" }, 404);
    }

    const { results } = await c.env.DB.prepare(
      "SELECT * FROM responses WHERE survey_id = ? ORDER BY submitted_at DESC",
    )
      .bind(surveyId)
      .all<DbResponse>();

    const parsedResponses = results.map((r) => ({
      id: r.id,
      survey_id: r.survey_id,
      answers: JSON.parse(r.answers),
      submitted_at: r.submitted_at,
    }));

    return c.json(parsedResponses);
  } catch (error) {
    console.error("Failed to fetch responses:", error);
    return c.json({ error: "Failed to fetch responses" }, 500);
  }
});
// POST /api/upload - Upload logo image to Cloudflare R2 (Stubbed / Optional)
app.post("/api/upload", authMiddleware, async (c) => {
  if (!c.env.BUCKET) {
    return c.json(
      {
        error:
          "R2 storage is disabled. Please upload logos using the local Base64 uploader.",
      },
      501,
    );
  }

  let file: unknown;
  try {
    const form = await c.req.parseBody();
    file = form.file;
  } catch {
    return c.json({ error: "Failed to parse body" }, 400);
  }

  if (!file || !(file instanceof File)) {
    return c.json({ error: "No file uploaded" }, 400);
  }

  // Validate size (max 800KB)
  if (file.size > 800 * 1024) {
    return c.json({ error: "File size exceeds 800KB limit" }, 400);
  }

  // Validate image mime type
  if (!file.type.startsWith("image/")) {
    return c.json({ error: "Only image uploads are allowed" }, 400);
  }

  const extension = file.name.split(".").pop() || "png";
  const key = `${crypto.randomUUID()}.${extension}`;

  try {
    await c.env.BUCKET.put(key, file, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    const origin = new URL(c.req.url).origin;
    const url = `${origin}/api/uploads/${key}`;

    return c.json({ url });
  } catch (error) {
    console.error("Failed to upload to R2:", error);
    return c.json({ error: "Failed to save file to storage" }, 500);
  }
});

// GET /api/uploads/:key - Public route to retrieve files from Cloudflare R2 (Stubbed / Optional)
app.get("/api/uploads/:key", async (c) => {
  if (!c.env.BUCKET) {
    return c.text("R2 storage not configured", 501);
  }

  const key = c.req.param("key");
  try {
    const object = await c.env.BUCKET.get(key);
    if (!object) {
      return c.text("File not found", 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);

    return c.body(object.body, 200, Object.fromEntries(headers.entries()));
  } catch (error) {
    console.error("Failed to retrieve file from R2:", error);
    return c.text("Failed to retrieve file", 500);
  }
});

export default app;
