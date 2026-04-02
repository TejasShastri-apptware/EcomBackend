/**
 * Centralized context injection middleware.
 *
 * Priority for org_id : Header > Query String (GET-friendly)
 * Priority for user_id: Header only — never trust the body for identity.
 *
 * Replace the internals of this file when moving to JWT / real auth.
 * All controllers already consume req.org_id and req.user_id, so no
 * controller changes will be needed when auth is properly implemented.
 */


export default (req, res, next) => {
    const rawOrgId = req.headers['x-org-id'] || req.query.org_id || null;
    const rawUserId = req.headers['x-user-id'] || null;

    req.org_id = rawOrgId ? Number(rawOrgId) : null;
    req.user_id = rawUserId ? Number(rawUserId) : null;
    
    next();
};
