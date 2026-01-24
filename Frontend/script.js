const API_BASE = "https://8p23atq3nq.ap-south-1.awsapprunner.com";
const taskInput = document.getElementById("taskInput");
const dueDateInput = document.getElementById("dueDateInput");
const addBtn = document.getElementById("addBtn");
const aiBtn = document.getElementById("aiBtn");
const taskList = document.getElementById("taskList");
const statusText = document.getElementById("status");
const logoutBtn = document.getElementById("logoutBtn");

function setStatus(message) {
  statusText.textContent = message;
  setTimeout(() => (statusText.textContent = ""), 2200);
}

function getToken() {
  return localStorage.getItem("token");
}

// ✅ Redirect if token missing
if (!getToken()) {
  window.location.href = "login.html";
}

// ✅ Logout
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.href = "login.html";
});

// ✅ Date formatter (supports ISO + yyyy-mm-dd)
function formatDueDate(dueDate) {
  if (!dueDate) return "No due date";
  const d = new Date(dueDate);
  if (!Number.isNaN(d.getTime())) {
    return `Due: ${d.toLocaleDateString()}`;
  }
  return "No due date";
}

// ✅ Load tasks
async function loadTasks() {
  taskList.innerHTML = "";

  try {
    const res = await fetch(`${API_BASE}/tasks`, {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });

    const tasks = await res.json();

    if (!res.ok) {
      setStatus(`❌ ${tasks.message || "Unauthorized"}`);
      if (res.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "login.html";
      }
      return;
    }

    if (!tasks.length) {
      taskList.innerHTML = "<li>No tasks available</li>";
      return;
    }

    tasks.forEach((task) => {
      const li = document.createElement("li");

      li.innerHTML = `
        <div class="task-left">
          <div class="task-title">${task.title}</div>
          <div class="task-meta">${formatDueDate(task.dueDate)}</div>
        </div>
        <button class="delete-btn" onclick="deleteTask(${task.id})">Delete</button>
      `;

      taskList.appendChild(li);
    });
  } catch (err) {
    setStatus("❌ Failed to load tasks (backend issue)");
  }
}

// ✅ Add task
async function addTask() {
  const title = taskInput.value.trim();
  const dueDate = dueDateInput.value;

  if (!title) {
    setStatus("⚠ Please enter a task");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ title, dueDate })
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(`❌ ${data.message || "Failed to add task"}`);
      return;
    }

    taskInput.value = "";
    dueDateInput.value = "";
    setStatus("✅ Task added");
    loadTasks();
  } catch (err) {
    setStatus("❌ Error adding task");
  }
}

// ✅ Delete task
async function deleteTask(id) {
  try {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(`❌ ${data.message || "Failed to delete task"}`);
      return;
    }

    setStatus("✅ Task deleted");
    loadTasks();
  } catch (err) {
    setStatus("❌ Error deleting task");
  }
}

// ✅ AI Improve
async function improveTaskWithAI() {
  const text = taskInput.value.trim();

  if (!text) {
    setStatus("⚠ Type a task first");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/ai/improve-task`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ text })
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus(`❌ ${data.message || "AI failed"}`);
      return;
    }

    taskInput.value = data.improvedText;
    setStatus("✅ AI improved your task");
  } catch (err) {
    setStatus("❌ AI error");
  }
}

addBtn.addEventListener("click", addTask);
aiBtn.addEventListener("click", improveTaskWithAI);

taskInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addTask();
});

loadTasks();

// ✅ important for delete button onclick
window.deleteTask = deleteTask;


