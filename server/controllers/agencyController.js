import { Agency } from "../models/Agency.js";
export async function listAgencies(req, res, next) { try { res.json(await Agency.find(req.user?.role === "admin" ? {} : { verified: true }).sort({ name: 1 })); } catch (error) { next(error); } }
export async function createAgency(req, res, next) { try { res.status(201).json(await Agency.create(req.body)); } catch (error) { next(error); } }
export async function updateAgency(req, res, next) { try { res.json(await Agency.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after", runValidators: true })); } catch (error) { next(error); } }
