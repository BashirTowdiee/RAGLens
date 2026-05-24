# Mobile Release Process

## Purpose

This runbook defines the release process for RAGLens Corp mobile applications.

## Release cadence

The mobile team ships a scheduled production release every second Wednesday. Emergency hotfixes may be released outside the normal cadence when approved by the engineering manager and incident commander.

## Pre-release checklist

The release owner must confirm unit tests, integration tests, accessibility checks, and smoke tests have passed. BrowserStack regression coverage must complete before the release candidate is submitted.

## Versioning

The release owner increments the public version number and build number. The build number must be unique for each App Store Connect and Google Play submission.

## Rollout

Production rollout starts at 10 percent for the first four hours. The release owner may increase rollout to 50 percent after crash-free sessions remain above 99.7 percent. Full rollout requires approval from the engineering manager.

## Rollback

A rollback is required when crash-free sessions drop below 99.3 percent, login fails for more than 2 percent of active sessions, or payment-related flows fail in production smoke tests.
