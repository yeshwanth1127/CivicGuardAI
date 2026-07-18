// Decodes the admin JWT (stored in localStorage after login) to read the
// logged-in user's role/department without an extra API round-trip. The
// token payload is set by backend/src/controllers/authController.js's
// buildToken() — { userId, role, department, email }.
export const getCurrentUser = () => {
  const token = localStorage.getItem("admin_token");
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return {
      userId: payload.userId,
      role: payload.role,
      department: payload.department || null,
      email: payload.email || null,
    };
  } catch (error) {
    console.error("Failed to decode admin token:", error);
    return null;
  }
};
