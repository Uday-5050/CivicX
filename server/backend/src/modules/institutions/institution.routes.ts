import { randomUUID } from "node:crypto";
import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { requireAuth, requireRole } from "../auth/auth.middleware";
import { Institution, type InstitutionDocument, type InstitutionDepartment } from "../auth/institution.model";
import { User } from "../auth/user.model";
import { InstitutionMembership } from "./membership.model";
import { ForbiddenError, NotFoundError, ValidationError } from "../../utils/errors";
import { sendSuccess } from "../../utils/response";

const router = Router();

const departmentSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(160),
  domains: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  leadUserId: z.string().optional(),
  active: z.boolean().default(true),
}).strict();

const profileFields = z.object({
  description: z.string().trim().max(2000).optional(),
  domains: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
  expertise: z.array(z.string().trim().min(1).max(120)).max(100).optional(),
  facilities: z.array(z.string().trim().min(1).max(160)).max(100).optional(),
  serviceAreas: z.array(z.string().trim().min(1).max(120)).max(100).optional(),
  departments: z.array(departmentSchema).max(50).optional(),
  maxActiveProjects: z.number().int().min(0).max(10000).optional(),
  acceptingWork: z.boolean().optional(),
}).strict();

const adminProfileSchema = profileFields.extend({
  profileStatus: z.enum(["draft", "verified"]).optional(),
}).strict();

const membershipSchema = z.object({
  userId: z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid user id"),
  role: z.enum(["coordinator", "mentor", "student", "partner"]),
  department: z.string().trim().min(2).max(160).optional(),
  status: z.enum(["pending", "active", "suspended"]).default("active"),
}).strict();

const membershipPatchSchema = membershipSchema.omit({ userId: true }).partial().strict();

function institutionId(value: string, label = "Institution"): string {
  if (!Types.ObjectId.isValid(value)) throw NotFoundError(`${label} not found`);
  return value;
}

function serializeProfile(institution: InstitutionDocument) {
  return {
    id: institution._id.toString(),
    name: institution.name,
    type: institution.type,
    accountStatus: institution.accountStatus,
    description: institution.description,
    domains: institution.domains,
    expertise: institution.expertise,
    facilities: institution.facilities,
    serviceAreas: institution.serviceAreas,
    departments: institution.departments,
    maxActiveProjects: institution.maxActiveProjects,
    acceptingWork: institution.acceptingWork,
    profileStatus: institution.profileStatus,
    profileVerifiedAt: institution.profileVerifiedAt,
    createdAt: institution.createdAt,
    updatedAt: institution.updatedAt,
  };
}

function withDepartmentIds(departments: z.infer<typeof departmentSchema>[]): InstitutionDepartment[] {
  return departments.map((department) => ({ ...department, id: department.id ?? randomUUID() }));
}

async function activeMemberInstitution(userId: string, expectedType?: "university" | "industry") {
  const user = await User.findById(userId);
  if (!user?.institutionId) throw ForbiddenError("An institution account is required");
  if (expectedType && user.role !== expectedType) throw ForbiddenError(`A ${expectedType} account is required`);
  const institution = await Institution.findOne({ _id: user.institutionId, accountStatus: "active" });
  if (!institution || (expectedType && institution.type !== expectedType)) throw ForbiddenError("An active institution is required");
  return institution;
}

async function canReadInstitution(reqUserId: string, role: string, id: string) {
  if (role === "admin") return Institution.findById(id);
  const institution = await activeMemberInstitution(reqUserId);
  if (institution._id.toString() !== id) throw ForbiddenError("You cannot access another institution");
  return institution;
}

async function serializedRoster(institutionIdValue: string, includeInactive: boolean) {
  const query = includeInactive ? { institutionId: institutionIdValue } : { institutionId: institutionIdValue, status: "active" };
  const memberships = await InstitutionMembership.find(query).sort({ createdAt: 1 });
  const users = await User.find({ _id: { $in: memberships.map((membership) => membership.userId) } });
  const byId = new Map(users.map((user) => [user._id.toString(), user]));
  return memberships.flatMap((membership) => {
    const user = byId.get(membership.userId.toString());
    if (!user || (!includeInactive && user.accountStatus !== "active")) return [];
    return [{
      id: membership._id.toString(),
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      accountStatus: user.accountStatus,
      role: membership.role,
      department: membership.department,
      status: membership.status,
      verifiedAt: membership.verifiedAt,
      createdAt: membership.createdAt,
    }];
  });
}

router.use(requireAuth);

router.get("/me/profile", requireRole("university", "industry"), async (req, res, next) => {
  try { sendSuccess(res, serializeProfile(await activeMemberInstitution(req.auth!.userId))); } catch (error) { next(error); }
});

router.patch("/me/profile", requireRole("university", "industry"), async (req, res, next) => {
  try {
    const input = profileFields.parse(req.body);
    const institution = await activeMemberInstitution(req.auth!.userId);
    const update = { ...input, ...(input.departments ? { departments: withDepartmentIds(input.departments) } : {}) };
    const updated = await Institution.findOneAndUpdate({ _id: institution._id, accountStatus: "active" }, { $set: update }, { new: true, runValidators: true });
    if (!updated) throw ForbiddenError("The institution is no longer active");
    sendSuccess(res, serializeProfile(updated));
  } catch (error) { next(error); }
});

router.get("/me/roster", requireRole("university", "industry"), async (req, res, next) => {
  try { const institution = await activeMemberInstitution(req.auth!.userId); sendSuccess(res, await serializedRoster(institution._id.toString(), false)); } catch (error) { next(error); }
});

router.get("/:id/profile", requireRole("admin", "university", "industry"), async (req, res, next) => {
  try {
    const institution = await canReadInstitution(req.auth!.userId, req.auth!.role, institutionId(String(req.params.id)));
    if (!institution) throw NotFoundError("Institution not found");
    if (req.auth!.role !== "admin" && institution.accountStatus !== "active") throw ForbiddenError("Institution profile is not available");
    sendSuccess(res, serializeProfile(institution));
  } catch (error) { next(error); }
});

router.get("/:id/roster", requireRole("admin", "university", "industry"), async (req, res, next) => {
  try {
    const id = institutionId(String(req.params.id));
    const institution = await canReadInstitution(req.auth!.userId, req.auth!.role, id);
    if (!institution) throw NotFoundError("Institution not found");
    sendSuccess(res, await serializedRoster(id, req.auth!.role === "admin"));
  } catch (error) { next(error); }
});

export const institutionAdminRouter = Router();
institutionAdminRouter.use(requireAuth, requireRole("admin"));

institutionAdminRouter.patch("/institutions/:id/profile", async (req, res, next) => {
  try {
    const id = institutionId(String(req.params.id));
    const input = adminProfileSchema.parse(req.body);
    const institution = await Institution.findById(id);
    if (!institution) throw NotFoundError("Institution not found");
    if (input.profileStatus === "verified" && institution.accountStatus !== "active") throw ValidationError("Only active institutions can be verified");
    const { profileStatus, ...profile } = input;
    const update = { ...profile, ...(profile.departments ? { departments: withDepartmentIds(profile.departments) } : {}), ...(profileStatus ? { profileStatus, profileVerifiedAt: profileStatus === "verified" ? new Date() : undefined, profileVerifiedBy: profileStatus === "verified" ? req.auth!.userId : undefined } : {}) };
    const updated = await Institution.findByIdAndUpdate(id, { $set: update, ...(profileStatus === "draft" ? { $unset: { profileVerifiedAt: 1, profileVerifiedBy: 1 } } : {}) }, { new: true, runValidators: true });
    if (!updated) throw NotFoundError("Institution not found");
    sendSuccess(res, serializeProfile(updated));
  } catch (error) { next(error); }
});

institutionAdminRouter.get("/institutions/:id/roster", async (req, res, next) => {
  try {
    const id = institutionId(String(req.params.id));
    if (!await Institution.exists({ _id: id })) throw NotFoundError("Institution not found");
    sendSuccess(res, await serializedRoster(id, true));
  } catch (error) { next(error); }
});

institutionAdminRouter.post("/institutions/:id/roster", async (req, res, next) => {
  try {
    const id = institutionId(String(req.params.id));
    const input = membershipSchema.parse(req.body);
    const institution = await Institution.findById(id);
    if (!institution) throw NotFoundError("Institution not found");
    const user = await User.findById(input.userId);
    if (!user) throw NotFoundError("User not found");
    if (!user.institutionId || user.institutionId.toString() !== id) throw ForbiddenError("User does not belong to this institution");
    if (input.status === "active" && (institution.accountStatus !== "active" || user.accountStatus !== "active")) throw ValidationError("Only active institutions and users can be verified");
    const membership = await InstitutionMembership.findOneAndUpdate(
      { institutionId: id, userId: input.userId },
      { $set: { role: input.role, department: input.department, status: input.status, ...(input.status === "active" ? { verifiedBy: req.auth!.userId, verifiedAt: new Date() } : { $unset: { verifiedBy: 1, verifiedAt: 1 } }) } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
    sendSuccess(res, { id: membership._id.toString(), userId: user._id.toString(), role: membership.role, department: membership.department, status: membership.status, verifiedAt: membership.verifiedAt }, 201);
  } catch (error: any) {
    if (error?.code === 11000) next(ValidationError("This user already has a roster membership at this institution")); else next(error);
  }
});

institutionAdminRouter.patch("/institutions/:id/roster/:userId", async (req, res, next) => {
  try {
    const id = institutionId(String(req.params.id));
    const userId = institutionId(String(req.params.userId), "User");
    const input = membershipPatchSchema.parse(req.body);
    const institution = await Institution.findById(id);
    const user = await User.findById(userId);
    if (!institution || !user) throw NotFoundError("Roster member not found");
    if (!user.institutionId || user.institutionId.toString() !== id) throw ForbiddenError("User does not belong to this institution");
    if (input.status === "active" && (institution.accountStatus !== "active" || user.accountStatus !== "active")) throw ValidationError("Only active institutions and users can be verified");
    const membership = await InstitutionMembership.findOne({ institutionId: id, userId });
    if (!membership) throw NotFoundError("Roster member not found");
    if (input.role) membership.role = input.role;
    if (input.department !== undefined) membership.department = input.department;
    if (input.status) { membership.status = input.status; membership.verifiedBy = input.status === "active" ? new Types.ObjectId(req.auth!.userId) : undefined; membership.verifiedAt = input.status === "active" ? new Date() : undefined; }
    await membership.save();
    sendSuccess(res, { id: membership._id.toString(), userId, role: membership.role, department: membership.department, status: membership.status, verifiedAt: membership.verifiedAt });
  } catch (error) { next(error); }
});

export default router;
