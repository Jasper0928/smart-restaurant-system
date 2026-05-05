/**
 * LINE Webhook Handler
 * Express route for receiving LINE events
 */

import { Router, Request, Response } from "express";
import { verifyLineSignature } from "../line";
import { appRouter } from "../routers";

const router = Router();

/**
 * LINE Webhook Endpoint
 * Receives events from LINE servers
 */
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    // Get signature from headers
    const signature = req.headers["x-line-signature"] as string;

    if (!signature) {
      console.warn("Missing LINE signature header");
      return res.status(400).json({ error: "Missing signature" });
    }

    // Get raw body as string for signature verification
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    // Verify signature
    if (!verifyLineSignature(rawBody, signature)) {
      console.warn("Invalid LINE signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Parse body
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    // Call tRPC webhook handler
    const caller = appRouter.createCaller({ user: null, req, res } as any);
    await caller.line.webhook(body);

    // Return 200 to acknowledge receipt
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("LINE webhook error:", error);
    // Always return 200 to prevent LINE from retrying
    res.status(200).json({ error: "Processing error" });
  }
});

export default router;
