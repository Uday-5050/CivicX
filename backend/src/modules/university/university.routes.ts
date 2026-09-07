import { Router } from "express";
import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { requireAuth, requireRole } from "../auth/auth.middleware";
import { User } from "../auth/user.model";
import { Institution } from "../auth/institution.model";
import { validate } from "../../middleware/validate";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../../utils/errors";
import { sendSuccess } from "../../utils/response";
import { UniversityChallenge } from "./university.model";
import { createChallengeSchema, decisionSchema } from "./university.schemas";

const router = Router();
router.use(requireAuth);
async function institutionFor(userId: string): Promise<string> {
  const user = await User.findById(userId);
  if (!user?.institutionId) throw ForbiddenError("A university institution is required");
  const institution = await Institution.findOne({ _id: user.institutionId, type: "university", accountStatus: "active" });
  if (!institution) throw ForbiddenError("An active university institution is required");
  return institution._id.toString();
}
function serialize(challenge: InstanceType<typeof UniversityChallenge>) {
  const { _id, institutionId: _institutionId, decidedBy: _decidedBy, ...data } = challenge.toObject();
  return { ...data, id: _id.toString() };
}
// Administrators assign real challenges and eligible teams to an approved university.
router.post("/challenges", requireRole("admin"), validate(createChallengeSchema), async (req, res, next) => {
  try {
    const institution = await Institution.findOne({ _id: req.body.institutionId, type: "university", accountStatus: "active" });
    if (!institution) throw ValidationError("Target university must be active");
    sendSuccess(res, serialize(await UniversityChallenge.create(req.body)), 201);
  } catch (error) { next(error); }
});
router.get("/challenges", requireRole("university"), async (req, res, next) => {
  try {
    const institutionId = await institutionFor(req.auth!.userId);
    const challenges = await UniversityChallenge.find({ institutionId }).sort({ createdAt: -1, _id: -1 });
    sendSuccess(res, challenges.map(serialize));
  } catch (error) { next(error); }
});
router.post("/challenges/:id/decision", requireRole("university"), validate(decisionSchema), async (req, res, next) => {
  try {
    const institutionId = await institutionFor(req.auth!.userId);
    const id = String(req.params.id);
    if (!Types.ObjectId.isValid(id)) throw NotFoundError("Challenge not found");
    const challenge = await UniversityChallenge.findOne({ _id: id, institutionId });
    if (!challenge) throw NotFoundError("Challenge not found");
    const { decision, version, proposal } = decisionSchema.parse(req.body);
    if (challenge.version !== version || challenge.decision !== "pending") throw ConflictError("This challenge has changed or already has a decision");
    if (proposal) {
      if (!challenge.members.some(member => member.id === proposal.mentorId && member.role === "mentor")) throw ValidationError("Select an eligible mentor from this challenge");
      if (!proposal.studentIds.every(id => challenge.members.some(member => member.id === id && member.role === "student"))) throw ValidationError("Select eligible students from this challenge");
    }
    // One atomic write records the decision, proposal, and project even on standalone MongoDB.
    const updated = await UniversityChallenge.findOneAndUpdate(
      { _id: id, institutionId, version, decision: "pending" },
      { $set: { decision, decidedBy: req.auth!.userId, decidedAt: new Date(), ...(proposal ? { proposal, project: { id: randomUUID(), status: "active", createdAt: new Date() } } : {}) }, $inc: { version: 1 } },
      { new: true, runValidators: true },
    );
    if (!updated) throw ConflictError("This challenge changed while you were reviewing it");
    sendSuccess(res, serialize(updated));
  } catch (error) { next(error); }
});
export default router;
