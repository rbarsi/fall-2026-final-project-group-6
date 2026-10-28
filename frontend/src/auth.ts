//USer
export type User = {
  id: number;
  name: string;
  email: string;
};
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

  const data = await response.json();
  if(!response.ok){
    throw new Error(data.error || data.message || "Signup failed");
  }
  return data;
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

  const data = await response.json();
  if(!response.ok){
    throw new Error(data.error || data.message || "Login Failed");
  }
  return data;
}

// LOGOUT
export async function logout() {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin"
  });

 const data = await response.json();
  if(!response.ok){
    throw new Error(data.error || data.message || "Logout Failed");
  }
  return data;
}

// CHECK CURRENT USER
export async function getCurrentUser() {
  const response = await fetch("/api/auth/me", {
    credentials: "same-origin"
  });

  if (response.status == 401) {
    return null;
  }

  const data = await response.json();
  if(!response.ok){
    throw new Error(data.error || data.message || "Session check Failed");
  }
  return data.user ?? null;
}
