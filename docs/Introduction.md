# Introduction

## Purpose

Neighborhood Surveillance is a web-based application designed to help local communities report, visualize, and manage suspicious activities within their neighborhood. By combining structured reporting, interactive mapping, and role-based moderation, the platform provides a centralized environment for community safety and collaboration.

## Target Users

The application supports four different user roles, each with its own responsibilities and permissions.

| Role | Description |
|------|-------------|
| **USER** | Regular community members who can create observations, submit edit or removal requests, and manage their own profile.
 
| **MODERATOR** | Trusted members who can moderate observations, approve or reject change requests, and view the observation audit log. 

| **ADMIN** | Platform administrators who can manage users, assign roles, toggle user status, and access the full administration audit log. 

| **OWNER** | The system owner with full access, including the ability to promote or demote any role (except creating additional owners). 

## Problem Statement

Many neighborhood watch initiatives still rely on social media groups, messaging platforms, or email to report incidents. These approaches often result in scattered information, duplicated reports, and limited moderation capabilities. Furthermore, they provide little transparency regarding the status of submitted observations.

Neighborhood Surveillance addresses these issues by providing:

- A **centralized database** of all neighborhood observations
- **Map-based visualization** for spatial awareness
- **Role-based access control** to separate public reporting from moderation
- **Audit trails** for accountability and transparency

## Main Features

### Authentication
- JWT-based authentication and registration

### Observation Management
- Observation CRUD with public/private visibility
- Interactive Leaflet map with markers, clustering, and heatmap
- Category and date filtering

### Administration
- Observation modification and removal requests with approval workflow
- Role-based administration dashboard
- User management (activate, deactivate, role changes)
- Audit logging (observation and administration)

### Profile Management
- Profile management with map preferences and password changes
- Account deletion (soft delete)

### Deployment
- Docker containerization
- PostgreSQL database integration

## Goals

- Provide an intuitive user experience across desktop and mobile devices.
- Provide a scalable architecture that supports future expansion.
- Deliver a secure and maintainable application.
- Follow the Model-View-Controller (MVC) architectural pattern.
- Use a feature-based frontend architecture to improve maintainability.
- Apply defense-in-depth security principles throughout the application.
