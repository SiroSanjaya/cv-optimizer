import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { signToken } from "../services/auth/jwt";
import { Errors } from "../utils/AppError";
import axios from "axios";

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
        credits: user.usageCredit?.limit ?? 10,
        usedCredits: user.usageCredit?.used ?? 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Exchange Google Access Token or ID Token sent by client
 */
export async function googleLoginWithToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { token, credential } = req.body;
    const tokenToVerify = token || credential;

    if (!tokenToVerify) {
      throw Errors.validation("Google token or credential is required.");
    }

    let email: string;
    let name: string | undefined;
    let picture: string | undefined;
    let googleId: string;

    try {
      // Query Google's tokeninfo or userinfo endpoint
      const response = await axios.get(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${tokenToVerify}`
      );
      const data = response.data;
      email = data.email;
      name = data.name;
      picture = data.picture;
      googleId = data.sub;
    } catch {
      // If id_token failed, try as access_token
      try {
        const userInfoRes = await axios.get(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${tokenToVerify}` },
          }
        );
        email = userInfoRes.data.email;
        name = userInfoRes.data.name;
        picture = userInfoRes.data.picture;
        googleId = userInfoRes.data.sub;
      } catch (innerErr) {
        throw Errors.unauthorized("Invalid Google authentication token.");
      }
    }

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
            limit: 25,
            used: 0,
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

/**
 * Demo / Quick Test Login (Allows testing all platform features immediately without Google Cloud credentials setup)
 */
export async function devDemoLogin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { email = "jobseeker@demo.com", name = "Budi Pratama" } = req.body;

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name,
        picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        usageCredit: {
          create: {
            limit: 50,
            used: 0,
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
      secure: false,
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
