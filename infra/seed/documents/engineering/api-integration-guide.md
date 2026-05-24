# API Integration Guide

## Purpose

This guide explains how internal teams integrate with RAGLens Corp platform APIs.

## Authentication

Internal service-to-service requests use signed JWTs issued by the identity platform. External partner requests use OAuth 2.0 client credentials with mutual TLS when the integration handles sensitive customer data.

## Idempotency

All POST endpoints that create customer-visible records must support an `Idempotency-Key` header. The key is retained for 24 hours and must return the same response for repeated requests with the same payload.

## Rate limits

Internal APIs default to 600 requests per minute per service. Partner APIs default to 120 requests per minute per client unless the partner contract specifies a lower limit.

## Error format

API errors must return a stable machine-readable code, a human-readable message, a request ID, and optional field errors. Sensitive implementation details must not be included in client-facing errors.

## Observability

Every API request must emit a request ID, latency, status code, caller identity, and route name to structured logs.
