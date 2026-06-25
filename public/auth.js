const currentUserKey = "smartCurrentUser";
const localUsersKey = "smartLocalUsers";
const authMessage = document.getElementById("authMessage");

function isStaticHost() {
  const localHosts = ["localhost", "127.0.0.1"];
  return (
    location.protocol === "file:" ||
    location.hostname.endsWith("github.io") ||
    (localHosts.includes(location.hostname) && location.port && location.port !== "3000")
  );
}

function showMessage(text, type) {
  authMessage.textContent = text;
  authMessage.className = `auth-message ${type || ""}`.trim();
}

function setCurrentUser(user) {
  localStorage.setItem(currentUserKey, JSON.stringify(user));
}

function getLocalUsers() {
  try {
    return JSON.parse(localStorage.getItem(localUsersKey) || "[]");
  } catch (error) {
    return [];
  }
}

function saveLocalUsers(users) {
  localStorage.setItem(localUsersKey, JSON.stringify(users));
}

function publicLocalUser(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

async function readApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error("The MySQL API is not available. Start MySQL, run npm start again, then refresh this page.");
  }

  return response.json();
}

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

if (loginForm) {
  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;

    try {
      showMessage("Checking account...", "");
      if (isStaticHost()) {
        const user = getLocalUsers().find(item => item.email === email && item.password === password);
        if (!user) throw new Error("Invalid email or password.");

        setCurrentUser(publicLocalUser(user));
        localStorage.removeItem("smartAdminVerified");
        showMessage("Login successful. Redirecting...", "success");
        setTimeout(() => {
          window.location.href = "index.html";
        }, 700);
        return;
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await readApiResponse(response);

      if (!response.ok) throw new Error(data.error || "Could not log in.");

      setCurrentUser(data.user);
      if (data.user.role === "admin") {
        localStorage.setItem("smartAdminVerified", "true");
        showMessage("Admin verified. Opening dashboard...", "success");
      } else {
        localStorage.removeItem("smartAdminVerified");
        showMessage("Login successful. Redirecting...", "success");
      }

      setTimeout(() => {
        window.location.href = data.user.role === "admin" ? "admin-dashboard.html" : "index.html";
      }, 700);
    } catch (error) {
      showMessage(error.message, "error");
    }
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const user = {
      firstName: document.getElementById("registerFirstName").value.trim(),
      lastName: document.getElementById("registerLastName").value.trim(),
      email: document.getElementById("registerEmail").value.trim().toLowerCase(),
      contact: document.getElementById("registerContact").value.trim(),
      address: document.getElementById("registerAddress").value.trim(),
      city: document.getElementById("registerCity").value.trim(),
      state: document.getElementById("registerState").value.trim(),
      password: document.getElementById("registerPassword").value
    };

    try {
      showMessage("Creating account...", "");
      if (isStaticHost()) {
        if (!user.firstName || !user.email || user.password.length < 6) {
          throw new Error("First name, email, and a password of at least 6 characters are required.");
        }

        const users = getLocalUsers();
        if (users.some(item => item.email === user.email)) {
          throw new Error("This email is already registered.");
        }

        const localUser = {
          id: `github-${Date.now()}`,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          contact: user.contact,
          address: user.address,
          city: user.city,
          state: user.state,
          password: user.password,
          role: "user",
          language: "en",
          photo: ""
        };
        users.push(localUser);
        saveLocalUsers(users);
        setCurrentUser(publicLocalUser(localUser));
        showMessage("Account created for this browser. Redirecting...", "success");
        setTimeout(() => {
          window.location.href = "index.html";
        }, 800);
        return;
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user)
      });
      const data = await readApiResponse(response);

      if (!response.ok) throw new Error(data.error || "Could not create the account.");

      setCurrentUser(data.user);
      showMessage("Account created in the database. Redirecting...", "success");
      setTimeout(() => {
        window.location.href = "index.html";
      }, 800);
    } catch (error) {
      showMessage(error.message, "error");
    }
  });
}
