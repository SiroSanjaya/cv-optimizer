import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { signToken } from "../services/auth/jwt";
import { Errors } from "../utils/AppError";
import axios from "axios";
import { getMonthlyQuota } from "../services/ai/aiTasks";

export async function getCurrentUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.userPayload) {
      return res.json({ success: true, user: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userPayload.userId },
      include: {
        usageCredit: true,
        _count: {
          select: {
            applications: true,
            cvVersions: true,
          },
        },
      },
    });

    if (!user) {
      return res.json({ success: true, user: null });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        applicationCount: user._count.applications,
        cvVersionCount: user._count.cvVersions,
        credits: getMonthlyQuota(),
        usedCredits:
          user.usageCredit &&
          user.usageCredit.periodStart >= new Date(Date.UTC(
            new Date().getUTCFullYear(),
            new Date().getUTCMonth(),
            1
          ))
            ? user.usageCredit.used
            : 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Verify a Google Identity Services credential and create an application session.
 */
export async function googleLoginWithToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { credential } = req.body;
    if (typeof credential !== "string" || credential.length === 0) {
      throw Errors.validation("Google credential is required.");
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      throw Errors.internal("Google sign-in is not configured.");
    }

    let email: string;
    let name: string | undefined;
    let picture: string | undefined;
    let googleId: string;

    let tokenInfo;
    try {
      const response = await axios.get(
        "https://oauth2.googleapis.com/tokeninfo",
        { params: { id_token: credential }, timeout: 10_000 }
      );
      tokenInfo = response.data;
    } catch {
      throw Errors.unauthorized("Invalid Google authentication credential.");
    }

    if (
      tokenInfo.aud !== googleClientId ||
      String(tokenInfo.email_verified).toLowerCase() !== "true"
    ) {
      throw Errors.unauthorized("Google account verification failed.");
    }

    email = tokenInfo.email;
    name = tokenInfo.name;
    picture = tokenInfo.picture;
    googleId = tokenInfo.sub;

    if (!email) {
      throw Errors.unauthorized("Email not provided by Google account.");
    }

    // Upsert user in database
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: name || undefined,
        picture: picture || undefined,
        googleId,
      },
      create: {
        email,
        name: name || email.split("@")[0],
        picture,
        googleId,
        usageCredit: {
          create: {
            limit: getMonthlyQuota(),
            used: 0,
            periodStart: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)),
          },
        },
      },
    });

    const jwtToken = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    });

    res.cookie("token", jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    });
  } catch (err) {
    next(err);
  }
}

export function logout(_req: Request, res: Response) {
  res.clearCookie("token");
  res.json({ success: true, message: "Logged out successfully" });
}
