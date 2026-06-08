import crypto from "crypto";
import { verifyToken } from "../middleware/auth.js";
import { validateContact, validateOtpCode } from "../middleware/security.js";
import { normalizeContact, formatResponse } from "../utils/helpers.js";
import { setAuthCookie, clearAuthCookie, tokenFromCookies } from "../utils/authCookies.js";
import { saveOtpRecord, verifyOtpRecord } from "../../lib/otpStore.js";
import {
  upsertVerifiedUser,
  findUserByContact,
  loginExistingUserAfterOtp,
} from "../../lib/userUpsert.js";

function generateOTPCode() {
  return crypto.randomInt(100000, 999999).toString();
}

function isProfileIncomplete(user) {
  if (!user) return false;
  const hasCollege = Boolean(String(user.college || "").trim());
  const hasSkills = Array.isArray(user.skills) && user.skills.length > 0;
  return !hasCollege || !hasSkills;
}

/** POST /api/auth/send-otp */
export async function sendOtp(req, res) {
  try {
    const { contact, purpose: rawPurpose } = req.body;
    if (!contact?.trim()) {
      return res.status(400).json(formatResponse(false, null, "Enter your email or phone number"));
    }

    const trimmed = contact.trim();
    const contactErr = validateContact(trimmed);
    if (contactErr) {
      return res.status(400).json(formatResponse(false, null, contactErr));
    }

    const purpose = rawPurpose === "signup" ? "signup" : "signin";
    const normalized = normalizeContact(trimmed);
    const existing = await findUserByContact(normalized);

    if (purpose === "signin" && !existing) {
      return res
        .status(404)
        .json(formatResponse(false, null, "Account not found — sign up first"));
    }
    if (purpose === "signup" && existing && !isProfileIncomplete(existing)) {
      return res
        .status(409)
        .json(formatResponse(false, null, "Account already exists — sign in instead"));
    }

    const code = generateOTPCode();
    await saveOtpRecord(trimmed, code);

    res.json(
      formatResponse(true, {
        sent: false,
        devCode: code,
        message: "Enter the verification code shown below",
      })
    );
  } catch (error) {
    console.error("send-otp error:", error.message);
    res.status(500).json(formatResponse(false, null, "Could not send OTP — try again"));
  }
}

/** POST /api/auth/verify-otp */
export async function verifyOtp(req, res) {
  try {
    const { contact, code, purpose: rawPurpose } = req.body;
    const contactErr = validateContact(contact);
    if (contactErr) {
      return res.status(400).json(formatResponse(false, null, contactErr));
    }
    const codeErr = validateOtpCode(code);
    if (codeErr) {
      return res.status(400).json(formatResponse(false, null, codeErr));
    }

    const purpose = rawPurpose === "signup" ? "signup" : "signin";
    const result = await verifyOtpRecord(contact, code);
    if (!result.ok) {
      return res.status(400).json(formatResponse(false, null, result.error || "Incorrect OTP code"));
    }

    const normalized = normalizeContact(contact);

    if (purpose === "signin") {
      const login = await loginExistingUserAfterOtp(normalized);
      if (!login.ok) {
        return res
          .status(login.status || 404)
          .json(formatResponse(false, null, login.error || "Account not found — sign up first"));
      }
      return res.json(
        formatResponse(true, {
          verified: true,
          token: login.data.token,
          user: login.data.user,
        })
      );
    }

    const existing = await findUserByContact(normalized);
    if (existing && !isProfileIncomplete(existing)) {
      return res
        .status(409)
        .json(formatResponse(false, null, "Account already exists — sign in instead"));
    }

    return res.json(formatResponse(true, { verified: true }));
  } catch (error) {
    console.error("verify-otp error:", error.message);
    res
      .status(500)
      .json(formatResponse(false, null, "OTP verification failed — check the code and try again"));
  }
}

/** POST /api/auth/login */
export async function login(req, res) {
  try {
    const { contact, token: bodyToken, ...profile } = req.body || {};
    if (bodyToken && typeof bodyToken === "string") {
      setAuthCookie(res, bodyToken);
      return res.json(formatResponse(true, { loggedIn: true }));
    }

    const normalized = normalizeContact(String(contact || "").trim());
    if (!normalized) {
      return res.status(400).json(formatResponse(false, null, "Contact required"));
    }

    const isSignup = Boolean(profile.name || profile.skills?.length || profile.college);
    if (isSignup) {
      const result = await upsertVerifiedUser(
        { contact: normalized, ...profile },
        { requireVerified: true }
      );
      if (!result.ok) {
        return res.status(result.status || 400).json(formatResponse(false, null, result.error));
      }
      setAuthCookie(res, result.data.token);
      return res.json(formatResponse(true, { user: result.data.user }));
    }

    const loginResult = await loginExistingUserAfterOtp(normalized);
    if (!loginResult.ok) {
      return res
        .status(loginResult.status || 401)
        .json(formatResponse(false, null, loginResult.error || "Login failed"));
    }
    setAuthCookie(res, loginResult.data.token);
    return res.json(formatResponse(true, { user: loginResult.data.user }));
  } catch (error) {
    console.error("auth/login error:", error.message);
    res.status(500).json(formatResponse(false, null, "Login failed"));
  }
}

/** POST /api/auth/logout */
export function logout(_req, res) {
  clearAuthCookie(res);
  res.json(formatResponse(true, { loggedOut: true }));
}

/** GET /api/auth/session */
export async function session(req, res) {
  const token = tokenFromCookies(req);
  if (!token) {
    return res.status(401).json(formatResponse(false, null, "Not signed in"));
  }

  const decoded = verifyToken(token);
  if (!decoded?.contact) {
    return res.status(401).json(formatResponse(false, null, "Invalid session"));
  }

  const user = await findUserByContact(decoded.contact);
  if (!user) {
    return res.status(401).json(formatResponse(false, null, "User not found"));
  }

  const loginResult = await loginExistingUserAfterOtp(decoded.contact);
  if (!loginResult.ok) {
    return res.status(401).json(formatResponse(false, null, loginResult.error || "Not signed in"));
  }

  res.json(formatResponse(true, { user: loginResult.data.user }));
}
