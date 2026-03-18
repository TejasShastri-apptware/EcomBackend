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
module.exports = (req, res, next) => {
    req.org_id = req.headers['x-org-id'] || req.query.org_id || null;
    req.user_id = req.headers['x-user-id'] || null; // Never from body or query
    next();
};
