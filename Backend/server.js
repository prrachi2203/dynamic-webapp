import express from "express";
import cors from "cors";
import pkg from "pg";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ✅ PostgreSQL connection (LOCAL)
const pool = new Pool({
  host: "localhost",
  user: "postgres",
  password: "Admin@123", // change if needed
  database: "taskdb",
  port: 5432
});

// ✅ JWT Secret (for production keep it in .env)
const JWT_SECRET = process.env.JWT_SECRET || "CHANGE_THIS_SECRET_123";

// ✅ Middleware: protect routes
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: Token missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, email }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
}

// ✅ Health check
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "OK", message: "Backend + PostgreSQL working" });
  } catch (err) {
    console.error("DB Health Error:", err);
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

// ===================== AUTH =====================

// ✅ Signup
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const emailLower = email.toLowerCase().trim();

    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [emailLower]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [name.trim(), emailLower, passwordHash]
    );

    res.status(201).json({ message: "Signup successful", user: result.rows[0] });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Signup failed" });
  }
});

// ✅ Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const emailLower = email.toLowerCase().trim();

    const result = await pool.query(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [emailLower]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

// ===================== TASKS (Protected) =====================

// ✅ GET tasks
app.get("/api/tasks", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id,
              title,
              due_date AS "dueDate",
              done,
              created_at AS "createdAt"
       FROM tasks
       ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/tasks error:", err);
    res.status(500).json({ message: "Failed to fetch tasks from database" });
  }
});

// ✅ POST add task
app.post("/api/tasks", authMiddleware, async (req, res) => {
  try {
    const { title, dueDate } = req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({ message: "Task title is required" });
    }

    const result = await pool.query(
      `INSERT INTO tasks (title, due_date)
       VALUES ($1, $2)
       RETURNING id,
                 title,
                 due_date AS "dueDate",
                 done,
                 created_at AS "createdAt"`,
      [title.trim(), dueDate ? dueDate : null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /api/tasks error:", err);
    res.status(500).json({ message: "Failed to save task in database" });
  }
});

// ✅ DELETE task
app.delete("/api/tasks/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);

    const result = await pool.query(
      "DELETE FROM tasks WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    console.error("DELETE /api/tasks/:id error:", err);
    res.status(500).json({ message: "Failed to delete task" });
  }
});

// ✅ AI Improve (Protected)
app.post("/api/ai/improve-task", authMiddleware, (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Text is required" });
    }

    let improved = text.trim();
    improved = improved.charAt(0).toUpperCase() + improved.slice(1);

    const startsWithVerb =
      /^(Create|Prepare|Update|Review|Test|Deploy|Implement|Fix|Analyze|Document|Monitor|Verify|Design|Build|Configure|Optimize|Complete)\b/i.test(
        improved
      );

    if (!startsWithVerb) {
      improved = `Complete: ${improved}`;
    }

    improved = improved.replace(/\bdoc\b/gi, "documentation");
    improved = improved.replace(/\baws\b/gi, "AWS");

    if (!/[.!?]$/.test(improved)) {
      improved += ".";
    }

    res.json({ improvedText: improved });
  } catch (err) {
    res.status(500).json({ message: "AI error" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
  console.log("✅ Auth enabled: Signup/Login working");
});
