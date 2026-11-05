// ==========================================
// QUICKTASK - AUTHENTICATED DARK DASHBOARD
// ==========================================

const taskInput = document.getElementById("taskInput");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskList = document.getElementById("taskList");
const searchInput = document.getElementById("searchInput");

let tasks = [];
let currentFilter = "all";
let toastTimer;
let currentUser = null;

// ==========================================
// AUTHENTICATION
// ==========================================

async function getAccessToken() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error || !data.session) {
        window.location.replace("/login.html");
        throw new Error("Please log in to continue.");
    }

    currentUser = data.session.user;
    return data.session.access_token;
}

async function apiFetch(url, options = {}) {
    const token = await getAccessToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
    };

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 401) {
        await supabaseClient.auth.signOut();
        window.location.replace("/login.html");
        throw new Error("Your session expired. Please log in again.");
    }

    return response;
}

// Display the signed-in user's name and avatar initials/photo.
async function displayUser() {
    const userElement = document.getElementById("userEmail");
    const fullName = currentUser?.user_metadata?.full_name;
    const email = currentUser?.email || "My Account";
    const displayName = fullName || email.split("@")[0];
    const firstName = displayName.split(" ")[0];

    const greeting = document.getElementById("greeting");
    const sidebarName = document.getElementById("sidebarName");

    if (greeting) {
        const hour = new Date().getHours();
        let welcome = "Good evening";

        if (hour < 12) welcome = "Good morning";
        else if (hour < 17) welcome = "Good afternoon";

        greeting.textContent = `${welcome}, ${firstName}!`;
    }

    if (sidebarName) sidebarName.textContent = displayName;
    if (userElement) userElement.textContent = email;

    const initials = displayName
        .split(/\s+/)
        .map(word => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    const avatarUrl = currentUser?.user_metadata?.avatar_url;

    ["sidebarAvatar", "topAvatar"].forEach(id => {
        const avatar = document.getElementById(id);
        if (!avatar) return;

        avatar.textContent = initials || "U";

        if (avatarUrl) {
            avatar.style.backgroundImage = `url("${avatarUrl}")`;
            avatar.style.backgroundSize = "cover";
            avatar.style.backgroundPosition = "center";
            avatar.textContent = "";
        }
    });
}

async function logout() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        showToast("Unable to log out. Please try again.", true);
        return;
    }

    window.location.replace("/login.html");
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) logoutBtn.addEventListener("click", logout);

supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) {
        window.location.replace("/login.html");
    }
});

// ==========================================
// DATE
// ==========================================

const todayDate = document.getElementById("todayDate");

if (todayDate) {
    todayDate.textContent = new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

// ==========================================
// NOTIFICATIONS
// ==========================================

function showToast(message, isError = false) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.className = isError ? "toast show error" : "toast show";

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.className = "toast";
    }, 2500);
}

// ==========================================
// LOAD TASKS
// ==========================================

async function loadTasks() {
    try {
        const response = await apiFetch("/api/tasks");

        if (!response.ok) {
            throw new Error("Unable to retrieve tasks");
        }

        tasks = await response.json();
        updateDashboard();

    } catch (error) {
        if (
            error.message.includes("log in") ||
            error.message.includes("session expired")
        ) {
            return;
        }

        taskList.innerHTML =
            "<div class='empty-state'>Unable to connect to the server. Please refresh.</div>";

        showToast(error.message, true);
    }
}

// ==========================================
// WEEKLY PRODUCTIVITY CHART
// Counts tasks created on each of the last 7 local calendar days.
// ==========================================

function renderWeeklyChart() {
    const chart = document.getElementById("weeklyChart");
    const weeklyTotal = document.getElementById("weeklyTotal");

    if (!chart || !weeklyTotal) return;

    const today = new Date();
    const days = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);

        const dateKey = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");

        const count = tasks.filter(task => {
            if (!task.created_at) return false;

            const created = new Date(task.created_at);
            if (Number.isNaN(created.getTime())) return false;

            const createdKey = [
                created.getFullYear(),
                String(created.getMonth() + 1).padStart(2, "0"),
                String(created.getDate()).padStart(2, "0")
            ].join("-");

            return createdKey === dateKey;
        }).length;

        days.push({
            label: date.toLocaleDateString("en-US", { weekday: "short" }),
            count
        });
    }

    const total = days.reduce((sum, day) => sum + day.count, 0);
    const maxCount = Math.max(...days.map(day => day.count), 1);

    weeklyTotal.textContent = total;

    chart.innerHTML = days.map(day => {
        const height = Math.max(4, (day.count / maxCount) * 100);

        return `
            <div class="chart-day">
                <div class="chart-bar-track" title="${day.count} task(s)">
                    <div class="chart-bar" style="height: ${height}%"></div>
                </div>
                <span>${day.label}</span>
            </div>
        `;
    }).join("");
}

// ==========================================
// UPDATE DASHBOARD
// ==========================================

function updateDashboard() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;

    document.getElementById("totalTasks").textContent = total;
    document.getElementById("pendingTasks").textContent = pending;
    document.getElementById("completedTasks").textContent = completed;
    document.getElementById("taskCount").textContent = total;

    renderWeeklyChart();
    displayTasks();
}

// ==========================================
// DISPLAY TASKS
// ==========================================

function displayTasks() {
    taskList.innerHTML = "";

    const search = searchInput.value.toLowerCase().trim();

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(search);

        const matchesFilter =
            currentFilter === "all" ||
            (currentFilter === "pending" && !task.completed) ||
            (currentFilter === "completed" && task.completed);

        return matchesSearch && matchesFilter;
    });

    if (filteredTasks.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";

        const message = document.createElement("p");

        if (tasks.length === 0) {
            message.textContent =
                "Your workspace is waiting. Create your first task!";
        } else if (search) {
            message.textContent = "No matching tasks found.";
        } else {
            message.textContent = "No tasks in this category.";
        }

        empty.appendChild(message);
        taskList.appendChild(empty);
        return;
    }

    filteredTasks.forEach(task => {
        const card = document.createElement("div");
        card.className = "task-card";

        if (task.completed) card.classList.add("completed");

        const info = document.createElement("div");
        info.className = "task-info";

        const checkBtn = document.createElement("button");
        checkBtn.className = "task-check";
        checkBtn.type = "button";
        checkBtn.textContent = task.completed ? "✓" : "";
        checkBtn.setAttribute(
            "aria-label",
            task.completed ? "Mark as pending" : "Complete task"
        );
        checkBtn.addEventListener("click", () => completeTask(task.id));

        const title = document.createElement("span");
        title.className = "task-title";
        title.textContent = task.title;

        const status = document.createElement("span");
        status.className = "task-status";
        status.textContent = task.completed ? "Completed" : "In Progress";

        info.append(checkBtn, title, status);

        const actions = document.createElement("div");
        actions.className = "task-actions";

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.type = "button";
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", () => deleteTask(task.id));

        actions.appendChild(deleteBtn);
        card.append(info, actions);
        taskList.appendChild(card);
    });
}

// ==========================================
// ADD TASK
// ==========================================

async function addTask() {
    const title = taskInput.value.trim();

    if (!title) {
        showToast("Please enter a task!", true);
        taskInput.focus();
        return;
    }

    addTaskBtn.disabled = true;
    addTaskBtn.textContent = "Adding...";

    try {
        const response = await apiFetch("/api/tasks", {
            method: "POST",
            body: JSON.stringify({ title })
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || "Unable to add task");
        }

        taskInput.value = "";
        await loadTasks();
        showToast("Task added successfully! ✨");

    } catch (error) {
        showToast(error.message, true);

    } finally {
        addTaskBtn.disabled = false;
        addTaskBtn.innerHTML = 'Add task <span>＋</span>';
    }
}

// ==========================================
// COMPLETE TASK
// ==========================================

async function completeTask(id) {
    try {
        const response = await apiFetch(`/api/tasks/${id}`, {
            method: "PATCH"
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || "Unable to update task");
        }

        await loadTasks();
        showToast("Task status updated! ✓");

    } catch (error) {
        showToast(error.message, true);
    }
}

// ==========================================
// DELETE TASK
// ==========================================

async function deleteTask(id) {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
        const response = await apiFetch(`/api/tasks/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || "Unable to delete task");
        }

        await loadTasks();
        showToast("Task deleted successfully!");

    } catch (error) {
        showToast(error.message, true);
    }
}

// ==========================================
// FILTER BUTTONS
// ==========================================

document.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");
        currentFilter = button.dataset.filter;
        displayTasks();
    });
});

// ==========================================
// SEARCH
// ==========================================

searchInput.addEventListener("input", displayTasks);

// ==========================================
// ADD BUTTON + ENTER KEY
// ==========================================

addTaskBtn.addEventListener("click", addTask);

taskInput.addEventListener("keydown", event => {
    if (event.key === "Enter") addTask();
});

// ==========================================
// INITIALIZE DASHBOARD
// ==========================================

async function initializeDashboard() {
    try {
        await getAccessToken();
        await displayUser();
        await loadTasks();
    } catch (error) {
        console.error("Dashboard initialization:", error);
    }
}

initializeDashboard();
