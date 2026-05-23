const usersKey = "smartMovieUsers";
const currentUserKey = "smartCurrentUser";
const authMessage = document.getElementById("authMessage");

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(usersKey) || "[]");
  } catch (error) {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(usersKey, JSON.stringify(users));
}

function showMessage(text, type) {
  authMessage.textContent = text;
  authMessage.className = `auth-message ${type || ""}`.trim();
}

function setCurrentUser(user) {
  localStorage.setItem(currentUserKey, JSON.stringify(user));
}

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

if (loginForm) {
  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;
    const users = getUsers();

    if (email === "admin@smartmovies.com" && password === "admin123") {
      const adminUser = {
        firstName: "Admin",
        lastName: "User",
        email,
        password,
        role: "admin"
      };

      setCurrentUser(adminUser);
      localStorage.setItem("smartAdminVerified", "true");
      showMessage("Admin verified. Opening dashboard...", "success");
      setTimeout(() => {
        window.location.href = "admin-dashboard.html";
      }, 700);
      return;
    }

    const user = users.find(item => item.email.toLowerCase() === email && item.password === password);

    if (!user) {
      showMessage("Invalid email or password.", "error");
      return;
    }

    setCurrentUser(user);
    localStorage.removeItem("smartAdminVerified");
    showMessage("Login successful. Redirecting...", "success");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 700);
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const users = getUsers();
    const email = document.getElementById("registerEmail").value.trim().toLowerCase();

    if (users.some(user => user.email.toLowerCase() === email)) {
      showMessage("This email is already registered.", "error");
      return;
    }

    const user = {
      firstName: document.getElementById("registerFirstName").value.trim(),
      lastName: document.getElementById("registerLastName").value.trim(),
      email,
      contact: document.getElementById("registerContact").value.trim(),
      address: document.getElementById("registerAddress").value.trim(),
      city: document.getElementById("registerCity").value.trim(),
      state: document.getElementById("registerState").value.trim(),
      password: document.getElementById("registerPassword").value
    };

    users.push(user);
    saveUsers(users);
    setCurrentUser(user);
    showMessage("Account created. Redirecting...", "success");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 800);
  });
}
