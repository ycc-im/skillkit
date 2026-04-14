---
name: verify-security
description: "Security check skill. Scans code for vulnerabilities and dangerous patterns."
version: "1.2.0"
author: skillkit
tags: [security, quality-gate]
priority: 10
exclusive: true
requires:
  - verify-module
contextWeight: 100
triggers:
  keywords: [security scan, vulnerability detection, OWASP, SQL injection]
  patterns: ["detect.*security", "scan.*vulnerability"]
  filePatterns: ["*.env", "credentials.*"]
  context:
    hasGitChanges: true
prerequisites:
  tools:
    - name: rg
      command: rg
      check: "rg --version"
      hint: "Install ripgrep: brew install ripgrep"
  env: [API_KEY]
  fileExists: [package.json]
references:
  templates:
    - path: "templates/security-report.md"
      description: "Security report output template"
  docs:
    - path: "references/owasp-top10.md"
      description: "OWASP Top 10 reference"
output:
  format: markdown
  file: ".security-report.md"
  appendToFile: false
lifecycle:
  onLoad:
    - type: message
      content: "Security scan skill loaded"
  onAfterExecute:
    - type: validate
      schema: "output.schema"
  onError:
    - type: fallback
      skill: "manual-review"
---

## Workflow
1. Scan all source code files
2. Detect the following dangerous patterns:
   - SQL injection (string concatenation in queries)
   - XSS (unescaped HTML output)
   - Hardcoded secrets and credentials
   - Insecure deserialization
3. Generate a severity-level report for each finding
4. Output a structured security report

## Rules
- Never skip any file
- Sensitive information leaks must be marked as CRITICAL
- False positives are preferred over false negatives
