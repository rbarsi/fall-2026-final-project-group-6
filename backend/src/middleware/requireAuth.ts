
import {
  Request,
  Response,
  NextFunction
} from "express";

// Middleware checks if the student is logged in
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {

  // If there is no user ID, deny access
  if (!req.session.userId) {
    res.status(401).json({
      message: "Please log in first"
    });
    return;
  }

  // User is logged in, continue
  next();
}
