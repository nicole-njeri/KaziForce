# KaziForce requirements audit

Scope: the current requirements documented in `README.md/README.md`, checked against the source and the local browser walkthrough. Items shown as not applicable are not part of that documented prototype scope.

| Requirement | Status | Evidence and limits |
|---|---|---|
| Authentication | IMPLEMENTED | Worker/client registration and role-based JWT login; public admin registration is disabled. Admin accounts must be provisioned by the project owner. |
| Worker profile | IMPLEMENTED | Workers can view and update their skills and profile details. |
| Client profile | PARTIALLY IMPLEMENTED | `client_profiles` is present in the schema, but the client dashboard/API has no profile read or edit flow. |
| Gig management | IMPLEMENTED | Clients post gigs and open/close them; admins can moderate gig visibility. |
| Applications | IMPLEMENTED | Workers apply and see status; gig owners review and accept/reject. |
| Tag generation | IMPLEMENTED | Skills and location are normalized and tagged from the configured hierarchy. |
| Tag hierarchy | IMPLEMENTED | The engine derives category and specialization tags and calculates hierarchical matches. |
| Tag relationships | PARTIALLY IMPLEMENTED | Relationship data and lookup helpers exist, but live scoring currently calls `generate_tags`, not `generate_full_tags`; relationship edges do not affect recommendation scores. |
| Similarity | IMPLEMENTED | Overlap and Jaccard similarity are calculated for worker skills against gig requirements. |
| Matching scores | IMPLEMENTED | Weighted score includes tag similarity, hierarchy, location, experience, and reputation components. |
| Ranking | IMPLEMENTED | Candidate matches are ranked by score and assigned rank/strength metadata. |
| Worker recommendations | IMPLEMENTED | Clients can request ranked workers for gigs they own. |
| Gig recommendations | IMPLEMENTED | Workers receive ranked open-gig recommendations. |
| Notifications | NOT APPLICABLE | No notification flow is described in the current project documentation. |
| Ratings/reviews | IMPLEMENTED | Clients can rate and review accepted workers; an existing review can be updated. |
| Worker reputation | IMPLEMENTED | Average review ratings are supplied to matching and shown in the worker dashboard. |
| Simulated wallet | NOT APPLICABLE | No wallet or payment simulation is described in the current project documentation. |
| Admin/user management | IMPLEMENTED | Admins can view accounts and platform counts, suspend/restore non-admin users, and moderate gigs. |
| Moderation | IMPLEMENTED | Admins can suspend/restore accounts and close/reopen gigs. |
| Monitoring | IMPLEMENTED | The admin dashboard reports user, gig, application, and review counts; backend and matching services expose health endpoints. |

## Matching audit notes

- Original CSV validation cases are preserved; the current run passes all 18 cases.
- Tag hierarchy, similarity, weighted scoring, ranking, and both recommendation directions are active in the live flow.
- Exact-location matching is active. Worker reputation comes from saved reviews.
- The scorer contains an experience component, but gig records have no required-experience field and the live engine currently supplies zero as the requirement. Experience therefore contributes its configured neutral score rather than differentiating workers.
- Tag relationship metadata is loaded by helper functions but does not currently influence the live score. The prototype documentation does not promise relationship-weighted scoring, so this audit records the limitation without changing the established matching algorithm or test expectations.

## Database compatibility note

The fresh schema has integer user foreign keys and the documented uniqueness/status constraints. The upgrade migration preserves legacy text IDs. It converts a legacy gig client ID to integer and adds its foreign key only when every existing value exactly maps to a user. Existing application rows with nonnumeric legacy worker IDs are retained; the migration does not coerce or delete them, so the legacy application worker column cannot have a user foreign key until those IDs are mapped. Re-running the migration was checked against the local database and preserved row counts.

## Prototype limitations

- Public self-registration is for workers and clients. Administrator login and management are supported, but administrator accounts must be provisioned out of band.
- Client organization profile storage exists without a client profile UI/API.
- Password recovery, third-party sign-in, notifications, and wallet/payment flows are not implemented or documented prototype requirements.
- Frontend API URLs and permissive development CORS are local-development settings; deployment needs environment-based API configuration and restricted CORS.
