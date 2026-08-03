# Future Improvements

This chapter describes features and improvements that are not part of the current application but are natural extensions of it. For each item, the motivation, a possible implementation direction, and the reason it was excluded from the MVP scope are discussed.

## Notifications

The application currently has no proactive communication with its users. A notification system could inform users when a modification request for one of their observations is approved or rejected, when a moderator changes an observation's status, or when account-related actions (such as a role change) occur.

A straightforward implementation would add a `notifications` table and generate notification rows at the same points where audit entries are written today. A notification endpoint would let the frontend poll for new items and display them in the navbar. Email notifications would require a mail service integration.

This was excluded from the MVP because the core requirement was observation management, and notifications are a supporting feature that adds no value until users can already create and moderate observations. The audit log already provides a record of the relevant events, so notification is a presentation layer on top of existing functionality.

## Real-Time Updates

The map and observation lists are refreshed manually by reloading the page. Real-time updates would show new public observations as they are created, without user action. This could be implemented with Server-Sent Events (SSE) from Express or WebSockets, pushing new observations to connected clients and updating the Leaflet markers and sidebar in place.

This was excluded because it introduces a separate communication channel that must be managed alongside HTTP, and the MVP's concurrency expectations were modest. Polling or manual refresh is sufficient for a neighborhood-scale observation platform, and adding a WebSocket layer would have complicated the architecture without a demonstrated need.

## Mobile Application

The web interface is responsive, but it is not a native mobile application. A native app could provide push notifications, offline caching of observations, and background location access, which web browsers restrict.

This was excluded because developing and maintaining native clients for both Android and iOS would have roughly doubled the scope of the project. The responsive web application already covers the primary use case of viewing and creating observations on a phone through the browser.

## Image Uploads

Observations currently store text descriptions only. Allowing users to attach photos would make observations significantly more informative for a surveillance platform, since visual evidence is often the most useful part of a report.

A photo feature requires handling binary uploads, storing images (locally or in object storage), serving them through the API, and moderating them for inappropriate content. Each of these is a subsystem in itself. This was excluded from the MVP to keep the storage layer simple (only PostgreSQL, no file storage) and to avoid the moderation and privacy implications of hosting user-generated images.

## Machine Learning

The system could apply machine learning to analyze observations, for example to detect categories of activity, identify patterns or hotspots, or perform object recognition on uploaded images.

This was excluded because it requires a substantial labeled dataset, a model training pipeline, and dedicated infrastructure that are far beyond the scope of a web development project. The existing map intelligence features — filters, clustering, and the heatmap — already surface spatial patterns without requiring a trained model.

## Statistics

Administrative dashboards could include statistics such as observation volume over time, category distributions, per-user activity, and moderator workload.

The current dashboard presents a limited set of counts. Extending it with time-series and distribution data is primarily a matter of additional SQL aggregations and chart rendering on the frontend (for example with a charting library). This was excluded because the MVP dashboard met the requirement of an at-a-glance overview, and the audit log already provides the raw data from which statistics can be derived later.

## Performance

The application's queries are not yet tuned. As the number of observations grows, several improvements would become necessary: indexes on frequently queried columns (such as `created_at` and `is_public`), pagination on the observation list endpoints, and possibly caching of geocoding results to reduce repeated Nominatim calls for the same address.

This was excluded because the expected data volumes are small, and premature optimization would have complicated the codebase before there was evidence of a bottleneck. Index and pagination work is best driven by measured performance once real usage exists.

## Deployment

The application currently runs locally through Docker Compose, which starts the Node.js server and PostgreSQL database together. There is no production deployment.

This was excluded because the assignment scope was the application itself, not its hosting. Docker Compose already provides a reproducible environment and a clear path to a production deployment. Containerizing the services was completed as part of the project foundation; deploying to a server is an operational task that follows naturally.

## Cloud Hosting

Beyond local deployment, the application could be hosted on a cloud platform such as AWS, Azure, or Google Cloud. This would provide managed PostgreSQL, automatic scaling, HTTPS termination, and high availability.

This was excluded for cost and complexity reasons: a cloud deployment requires a paid account, infrastructure configuration, and ongoing maintenance. The decision was to deliver the application in a form that runs anywhere Docker is available, leaving cloud migration as an explicit future step.

## Conclusion

Each of these improvements was consciously excluded from the MVP. The MVP was scoped to deliver a complete, working observation platform with authentication, role-based administration, and map intelligence. The future improvements extend that foundation in directions — user engagement (notifications, real-time updates), richer data (images), new platforms (mobile), and operational concerns (statistics, performance, deployment) — that make sense only once the core application is stable and demonstrably used.
