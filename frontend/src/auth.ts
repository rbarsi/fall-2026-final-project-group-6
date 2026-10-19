
// SIGNUP
export async function signup(
  name: string,
  email: string,
  password: string
) {
  const response = await fetch("/api/auth/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "same-origin",
    body: JSON.stringify({
      name,
      email,
      password
    })
  });

  return response.json();
}

// LOGIN
export async function login(
  email: string,
  password: string
) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "same-origin",
    body: JSON.stringify({
      email,
      password
    })
  });

  return response.json();
}

// LOGOUT
export async function logout() {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin"
  });

  return response.json();
}

// CHECK CURRENT USER
export async function getCurrentUser() {
  const response = await fetch("/api/auth/me", {
    credentials: "same-origin"
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}
